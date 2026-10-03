CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "BookingUnit" DROP CONSTRAINT IF EXISTS no_overlapping_unit_bookings;

ALTER TABLE "BookingUnit"
ADD CONSTRAINT no_overlapping_unit_bookings
EXCLUDE USING gist (
  "unitId" WITH =,
  tsrange("startDatetime", "endDatetime") WITH &&
)
WHERE (status NOT IN ('CANCELLED'));
