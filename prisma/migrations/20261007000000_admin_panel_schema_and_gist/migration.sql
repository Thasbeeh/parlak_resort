-- ============================================================================
-- PARLAK RESORT: Phase 1 Database Schema & Concurrency Migration
-- Enforces:
-- 1. Unit inventory & dynamic capacities with domain bounds
-- 2. Centralized PriceLists, contiguous slabs, & modifiers (with OCC updatedAt)
-- 3. Room & Event Hall booking modes (OVERNIGHT, DAY_SLOT, MORNING_SLOT, EVENING_SLOT)
-- 4. Baseline tariff snapshotting (bookedBaseRate, bookedMinHeadcount, bookedMaxHeadcount)
-- 5. Receipt-only JSONB line items (no relational catalog)
-- 6. Multi-unit & Hall-to-Dome bundling with cascading release
-- 7. Standalone maintenance blocks without dummy guest bookings (nullable bookingId + notes)
-- 8. PostgreSQL GiST exclusion constraint with tstzrange (kernel-level overlap protection)
-- 9. Domain integrity check constraints (dates, capacities, bounds, statuses)
-- ============================================================================

-- Step 1: Drop deprecated legacy tables
DROP TABLE IF EXISTS "LineItem";
DROP TABLE IF EXISTS "Slab";

-- Step 2: Create Centralized PriceList table
CREATE TABLE IF NOT EXISTS "PriceList" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "unitType" TEXT NOT NULL,
    "maxGuestCapacity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceList_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_pricelist_unittype" CHECK ("unitType" IN ('DOME', 'A_FRAME', 'NON_AC_HALL', 'AC_HALL')),
    CONSTRAINT "chk_pricelist_capacity" CHECK ("maxGuestCapacity" > 0)
);

-- Unique index for slugified profile name
CREATE UNIQUE INDEX IF NOT EXISTS "PriceList_slug_key" ON "PriceList"("slug");

-- Step 3: Alter Unit table for PriceList attachment and capacities
ALTER TABLE "Unit" DROP COLUMN IF EXISTS "defaultDeposit";
ALTER TABLE "Unit" DROP COLUMN IF EXISTS "baseRate";
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "maxInfants" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Unit" ADD COLUMN IF NOT EXISTS "priceListId" TEXT;

-- Domain constraints on Unit
ALTER TABLE "Unit" DROP CONSTRAINT IF EXISTS "chk_unit_category";
ALTER TABLE "Unit" ADD CONSTRAINT "chk_unit_category" CHECK ("category" IN ('DOME', 'A_FRAME', 'NON_AC_HALL', 'AC_HALL'));

ALTER TABLE "Unit" DROP CONSTRAINT IF EXISTS "chk_unit_capacities";
ALTER TABLE "Unit" ADD CONSTRAINT "chk_unit_capacities" CHECK ("maxCapacity" > 0 AND "maxInfants" >= 0);

-- Foreign key: Unit -> PriceList (Strict Restrict on deletion if attached to any units)
ALTER TABLE "Unit" DROP CONSTRAINT IF EXISTS "Unit_priceListId_fkey";
ALTER TABLE "Unit" ADD CONSTRAINT "Unit_priceListId_fkey" 
    FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") 
    ON DELETE RESTRICT ON UPDATE CASCADE;

-- Step 4: Create PriceSlab table (Contiguous slot slabs for Rooms & Halls)
CREATE TABLE IF NOT EXISTS "PriceSlab" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "stayType" TEXT NOT NULL,
    "minHeadcount" INTEGER NOT NULL,
    "maxHeadcount" INTEGER NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "requiredDeposit" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceSlab_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_priceslab_staytype" CHECK ("stayType" IN ('OVERNIGHT', 'DAY_SLOT', 'MORNING_SLOT', 'EVENING_SLOT')),
    CONSTRAINT "chk_priceslab_bounds" CHECK (
        "minHeadcount" >= 1 AND 
        "maxHeadcount" >= "minHeadcount" AND 
        "basePrice" > 0 AND 
        "requiredDeposit" >= 0 AND 
        "requiredDeposit" <= "basePrice"
    )
);

CREATE INDEX IF NOT EXISTS "PriceSlab_priceListId_stayType_idx" ON "PriceSlab"("priceListId", "stayType");
CREATE UNIQUE INDEX IF NOT EXISTS "PriceSlab_priceListId_stayType_minHeadcount_key" ON "PriceSlab"("priceListId", "stayType", "minHeadcount");

ALTER TABLE "PriceSlab" DROP CONSTRAINT IF EXISTS "PriceSlab_priceListId_fkey";
ALTER TABLE "PriceSlab" ADD CONSTRAINT "PriceSlab_priceListId_fkey" 
    FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 5: Create PriceModifier table (Weekend & Seasonal modifiers with OCC)
CREATE TABLE IF NOT EXISTS "PriceModifier" (
    "id" TEXT NOT NULL,
    "priceListId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "percentage" DOUBLE PRECISION NOT NULL,
    "startDate" TIMESTAMPTZ(3) NOT NULL,
    "endDate" TIMESTAMPTZ(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PriceModifier_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_pricemodifier_type" CHECK ("type" IN ('WEEKEND', 'SEASONAL')),
    CONSTRAINT "chk_pricemodifier_percentage" CHECK ("percentage" >= -80.0 AND "percentage" <= 200.0),
    CONSTRAINT "chk_pricemodifier_dates" CHECK (
        "startDate" IS NOT NULL AND 
        "endDate" IS NOT NULL AND 
        "endDate" >= "startDate"
    )
);

CREATE INDEX IF NOT EXISTS "PriceModifier_priceListId_idx" ON "PriceModifier"("priceListId");

ALTER TABLE "PriceModifier" DROP CONSTRAINT IF EXISTS "PriceModifier_priceListId_fkey";
ALTER TABLE "PriceModifier" ADD CONSTRAINT "PriceModifier_priceListId_fkey" 
    FOREIGN KEY ("priceListId") REFERENCES "PriceList"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 6: Create UnitPhoto table (Sequenced unit gallery with featured cover)
CREATE TABLE IF NOT EXISTS "UnitPhoto" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "caption" TEXT,
    "altText" TEXT,
    "description" TEXT,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UnitPhoto_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "UnitPhoto_unitId_idx" ON "UnitPhoto"("unitId");

ALTER TABLE "UnitPhoto" DROP CONSTRAINT IF EXISTS "UnitPhoto_unitId_fkey";
ALTER TABLE "UnitPhoto" ADD CONSTRAINT "UnitPhoto_unitId_fkey" 
    FOREIGN KEY ("unitId") REFERENCES "Unit"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 7: Alter Booking table (Rent-only tracking, receipt line items, and bundling)
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "rentCharge" DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE "Booking" ALTER COLUMN "netRevenue" SET DEFAULT 0;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "receiptLineItems" JSONB;
ALTER TABLE "Booking" ADD COLUMN IF NOT EXISTS "parentBookingId" TEXT;

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "chk_booking_status";
ALTER TABLE "Booking" ADD CONSTRAINT "chk_booking_status" CHECK ("status" IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED'));

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "chk_booking_financials";
ALTER TABLE "Booking" ADD CONSTRAINT "chk_booking_financials" CHECK (
    "rentCharge" >= 0 AND 
    "totalPaid" >= 0 AND 
    ("refundAmount" IS NULL OR ("refundAmount" >= 0 AND "refundAmount" <= "totalPaid"))
);

CREATE INDEX IF NOT EXISTS "Booking_parentBookingId_idx" ON "Booking"("parentBookingId");
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");
CREATE INDEX IF NOT EXISTS "Booking_guestPhone_idx" ON "Booking"("guestPhone");
CREATE INDEX IF NOT EXISTS "Booking_createdAt_idx" ON "Booking"("createdAt");

ALTER TABLE "Booking" DROP CONSTRAINT IF EXISTS "Booking_parentBookingId_fkey";
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_parentBookingId_fkey" 
    FOREIGN KEY ("parentBookingId") REFERENCES "Booking"("id") 
    ON DELETE CASCADE ON UPDATE CASCADE;

-- Step 8: Alter BookingUnit table (Timestamptz conversion, snapshots, and timestamps)
-- Drop existing exclusion constraints first so columns can be converted to TIMESTAMPTZ without type conflict
ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS no_overlapping_unit_bookings;
ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE "BookingUnit" DROP COLUMN IF EXISTS "slot";

-- Convert datetime columns to TIMESTAMPTZ(3) to guarantee immutable tstzrange index evaluation
ALTER TABLE "BookingUnit" 
    ALTER COLUMN "startDatetime" TYPE TIMESTAMPTZ(3),
    ALTER COLUMN "endDatetime" TYPE TIMESTAMPTZ(3);

-- Allow bookingId to be nullable for standalone maintenance blocks
ALTER TABLE "BookingUnit" ALTER COLUMN "bookingId" DROP NOT NULL;
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "notes" TEXT;

ALTER TABLE "BookingUnit" ALTER COLUMN "status" SET DEFAULT 'CONFIRMED';
ALTER TABLE "BookingUnit" ALTER COLUMN "unitPrice" SET DEFAULT 0;
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "stayType" TEXT NOT NULL DEFAULT 'OVERNIGHT';

-- Financial snapshots for baseline preservation & Apples-to-Apples scope expansions
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "bookedBaseRate" DOUBLE PRECISION;
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "bookedMinHeadcount" INTEGER;
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "bookedMaxHeadcount" INTEGER;

-- Occupancy tracking
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "adults" INTEGER;
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "infants" INTEGER;
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "isComplimentary" BOOLEAN NOT NULL DEFAULT false;

-- Operational audit timestamps
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "BookingUnit" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Domain constraints on BookingUnit
ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS "chk_booking_unit_dates";
ALTER TABLE "BookingUnit" ADD CONSTRAINT "chk_booking_unit_dates" CHECK ("endDatetime" > "startDatetime");

ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS "chk_booking_unit_staytype";
ALTER TABLE "BookingUnit" ADD CONSTRAINT "chk_booking_unit_staytype" CHECK ("stayType" IN ('OVERNIGHT', 'DAY_SLOT', 'MORNING_SLOT', 'EVENING_SLOT'));

ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS "chk_booking_unit_status";
ALTER TABLE "BookingUnit" ADD CONSTRAINT "chk_booking_unit_status" CHECK ("status" IN ('CONFIRMED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'MAINTENANCE_BLOCKED'));

ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS "chk_booking_unit_price";
ALTER TABLE "BookingUnit" ADD CONSTRAINT "chk_booking_unit_price" CHECK ("unitPrice" >= 0);

CREATE INDEX IF NOT EXISTS "BookingUnit_bookingId_idx" ON "BookingUnit"("bookingId");
CREATE INDEX IF NOT EXISTS "BookingUnit_unitId_idx" ON "BookingUnit"("unitId");
CREATE INDEX IF NOT EXISTS "BookingUnit_status_idx" ON "BookingUnit"("status");

-- Step 9: Create AuditLog table (Immutable administrative audit trail)
CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "modifiedBy" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- Step 10: Enforce Kernel-Level Concurrency Protection via GiST Exclusion Constraint
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS no_overlapping_unit_bookings;

ALTER TABLE "BookingUnit"
ADD CONSTRAINT no_overlapping_unit_bookings
EXCLUDE USING gist (
  "unitId" WITH =,
  tstzrange("startDatetime", "endDatetime") WITH &&
)
WHERE (status NOT IN ('CANCELLED'));

-- Step 11: Automated Net Revenue Calculation Trigger
CREATE OR REPLACE FUNCTION calculate_net_revenue() RETURNS TRIGGER AS $$
BEGIN
    NEW."netRevenue" = NEW."totalPaid" - COALESCE(NEW."refundAmount", 0);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_calculate_net_revenue ON "Booking";
CREATE TRIGGER trigger_calculate_net_revenue
BEFORE INSERT OR UPDATE ON "Booking"
FOR EACH ROW
EXECUTE FUNCTION calculate_net_revenue();
