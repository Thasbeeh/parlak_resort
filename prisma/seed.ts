import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding initial admin accounts...');

  const admins = [
    { username: 'admin1', password: 'password123' },
    { username: 'admin2', password: 'password123' },
    { username: 'admin3', password: 'password123' },
  ];

  for (const admin of admins) {
    const hashedPassword = await bcrypt.hash(admin.password, 10);
    await prisma.admin.upsert({
      where: { username: admin.username },
      update: {},
      create: {
        username: admin.username,
        password: hashedPassword,
      },
    });
    console.log(`Ensured admin ${admin.username} exists.`);
  }

  console.log('Seeding Price Lists and Rate Plans...');

  // 1. Geodesic Dome Price List
  const domePriceList = await prisma.priceList.upsert({
    where: { slug: 'standard-dome-rate-plan' },
    update: {},
    create: {
      id: 'price-list-dome',
      name: 'Standard Dome Rate Plan',
      slug: 'standard-dome-rate-plan',
      unitType: 'DOME',
      maxGuestCapacity: 3,
      slabs: {
        create: [
          {
            stayType: 'OVERNIGHT',
            minHeadcount: 1,
            maxHeadcount: 3,
            basePrice: 3500,
            requiredDeposit: 2000,
          },
          {
            stayType: 'DAY_SLOT',
            minHeadcount: 1,
            maxHeadcount: 3,
            basePrice: 2500,
            requiredDeposit: 2000,
          },
        ],
      },
      modifiers: {
        create: [
          {
            name: 'Weekend Rate (+20%)',
            type: 'WEEKEND',
            percentage: 20,
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-12-31T23:59:59.999Z'),
            isActive: true,
          },
        ],
      },
    },
  });

  // 2. A-Frame Price List
  const aframePriceList = await prisma.priceList.upsert({
    where: { slug: 'standard-a-frame-rate-plan' },
    update: {},
    create: {
      id: 'price-list-aframe',
      name: 'Standard A-Frame Rate Plan',
      slug: 'standard-a-frame-rate-plan',
      unitType: 'A_FRAME',
      maxGuestCapacity: 5,
      slabs: {
        create: [
          {
            stayType: 'OVERNIGHT',
            minHeadcount: 1,
            maxHeadcount: 5,
            basePrice: 5000,
            requiredDeposit: 2000,
          },
          {
            stayType: 'DAY_SLOT',
            minHeadcount: 1,
            maxHeadcount: 5,
            basePrice: 3500,
            requiredDeposit: 2000,
          },
        ],
      },
      modifiers: {
        create: [
          {
            name: 'Weekend Rate (+20%)',
            type: 'WEEKEND',
            percentage: 20,
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-12-31T23:59:59.999Z'),
            isActive: true,
          },
        ],
      },
    },
  });

  // 3. Non-AC Event Hall Slabs
  const hallNonAcPriceList = await prisma.priceList.upsert({
    where: { slug: 'non-ac-hall-standard-slabs' },
    update: {},
    create: {
      id: 'price-list-hall-non-ac',
      name: 'Non-AC Event Hall Slabs',
      slug: 'non-ac-hall-standard-slabs',
      unitType: 'NON_AC_HALL',
      maxGuestCapacity: 1200,
      slabs: {
        create: [
          { stayType: 'MORNING_SLOT', minHeadcount: 10, maxHeadcount: 25, basePrice: 10000, requiredDeposit: 5000 },
          { stayType: 'MORNING_SLOT', minHeadcount: 26, maxHeadcount: 50, basePrice: 16000, requiredDeposit: 5000 },
          { stayType: 'MORNING_SLOT', minHeadcount: 51, maxHeadcount: 100, basePrice: 24000, requiredDeposit: 6000 },
          { stayType: 'MORNING_SLOT', minHeadcount: 101, maxHeadcount: 200, basePrice: 35000, requiredDeposit: 8000 },
          { stayType: 'MORNING_SLOT', minHeadcount: 201, maxHeadcount: 400, basePrice: 46000, requiredDeposit: 8000 },
          { stayType: 'MORNING_SLOT', minHeadcount: 401, maxHeadcount: 800, basePrice: 58000, requiredDeposit: 10000 },
          { stayType: 'MORNING_SLOT', minHeadcount: 801, maxHeadcount: 1200, basePrice: 72000, requiredDeposit: 15000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 10, maxHeadcount: 25, basePrice: 15000, requiredDeposit: 5000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 26, maxHeadcount: 50, basePrice: 22000, requiredDeposit: 5000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 51, maxHeadcount: 100, basePrice: 32000, requiredDeposit: 6000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 101, maxHeadcount: 200, basePrice: 45000, requiredDeposit: 8000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 201, maxHeadcount: 400, basePrice: 58000, requiredDeposit: 8000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 401, maxHeadcount: 800, basePrice: 72000, requiredDeposit: 10000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 801, maxHeadcount: 1200, basePrice: 90000, requiredDeposit: 15000 },
        ],
      },
      modifiers: {
        create: [
          {
            name: 'Weekend Surcharge (+10%)',
            type: 'WEEKEND',
            percentage: 10,
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-12-31T23:59:59.999Z'),
            isActive: true,
          },
        ],
      },
    },
  });

  // 4. AC Event Hall Slabs (Under Construction)
  const hallAcPriceList = await prisma.priceList.upsert({
    where: { slug: 'ac-hall-grand-slabs' },
    update: {},
    create: {
      id: 'price-list-hall-ac',
      name: 'AC Event Hall Grand Slabs',
      slug: 'ac-hall-grand-slabs',
      unitType: 'AC_HALL',
      maxGuestCapacity: 2000,
      slabs: {
        create: [
          { stayType: 'MORNING_SLOT', minHeadcount: 100, maxHeadcount: 500, basePrice: 75000, requiredDeposit: 15000 },
          { stayType: 'MORNING_SLOT', minHeadcount: 501, maxHeadcount: 2000, basePrice: 150000, requiredDeposit: 30000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 100, maxHeadcount: 500, basePrice: 100000, requiredDeposit: 20000 },
          { stayType: 'EVENING_SLOT', minHeadcount: 501, maxHeadcount: 2000, basePrice: 200000, requiredDeposit: 40000 },
        ],
      },
      modifiers: {
        create: [
          {
            name: 'Weekend Surcharge (+15%)',
            type: 'WEEKEND',
            percentage: 15,
            startDate: new Date('2026-01-01T00:00:00.000Z'),
            endDate: new Date('2026-12-31T23:59:59.999Z'),
            isActive: true,
          },
        ],
      },
    },
  });

  console.log('Seeding units and assigning Price Lists...');

  // Add 4 Geodesic Domes
  for (let i = 1; i <= 4; i++) {
    await prisma.unit.upsert({
      where: { id: `dome-${i}` },
      update: {
        priceListId: domePriceList.id,
      },
      create: {
        id: `dome-${i}`,
        name: `Dome ${i}`,
        category: 'DOME',
        isActive: true,
        maxCapacity: 3,
        maxInfants: 2,
        amenities: 'Attached Bath, AC, Wi-Fi, Smart TV, Pool access, Tea/Coffee kit, 1L Water, BBQ grill',
        priceListId: domePriceList.id,
      },
    });
  }

  // Add 3 A-Frames
  for (let i = 1; i <= 3; i++) {
    await prisma.unit.upsert({
      where: { id: `aframe-${i}` },
      update: {
        priceListId: aframePriceList.id,
      },
      create: {
        id: `aframe-${i}`,
        name: `A-Frame ${i}`,
        category: 'A_FRAME',
        isActive: true,
        maxCapacity: 5,
        maxInfants: 4,
        amenities: 'Double bed, Queen bed, Attached Bath, AC, Wi-Fi, Pool access',
        priceListId: aframePriceList.id,
      },
    });
  }

  // Add Event Halls
  await prisma.unit.upsert({
    where: { id: 'hall-non-ac' },
    update: {
      priceListId: hallNonAcPriceList.id,
    },
    create: {
      id: 'hall-non-ac',
      name: 'Non-AC Event Hall',
      category: 'NON_AC_HALL',
      isActive: true,
      maxCapacity: 1200,
      maxInfants: 0,
      amenities: 'Seating, stage, generator, banquet space',
      priceListId: hallNonAcPriceList.id,
    },
  });

  await prisma.unit.upsert({
    where: { id: 'hall-ac' },
    update: {
      priceListId: hallAcPriceList.id,
    },
    create: {
      id: 'hall-ac',
      name: 'AC Event Hall',
      category: 'AC_HALL',
      isActive: false, // Inactive / Under construction
      maxCapacity: 2000,
      maxInfants: 0,
      amenities: 'Central AC, stage, acoustic design, generator, banquet space',
      priceListId: hallAcPriceList.id,
    },
  });

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
