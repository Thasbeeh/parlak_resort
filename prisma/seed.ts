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

  console.log('Seeding basic units...');
  // Add geodesic domes
  for (let i = 1; i <= 4; i++) {
    await prisma.unit.upsert({
      where: { id: `dome-${i}` },
      update: {},
      create: {
        id: `dome-${i}`,
        name: `Dome ${i}`,
        category: 'Dome',
        isActive: true,
        maxCapacity: 3,
        amenities: 'Attached Bath, AC, Wi-Fi, Smart TV, Pool access, Tea/Coffee kit, 1L Water, BBQ grill',
        defaultDeposit: 2000,
        baseRate: 5000,
      }
    });
  }

  // Add A-Frames
  for (let i = 1; i <= 3; i++) {
    await prisma.unit.upsert({
      where: { id: `aframe-${i}` },
      update: {},
      create: {
        id: `aframe-${i}`,
        name: `A-Frame ${i}`,
        category: 'A-Frame',
        isActive: true,
        maxCapacity: 5,
        amenities: 'Double bed, Queen bed, Attached Bath, AC, Wi-Fi, Pool access',
        defaultDeposit: 2000,
        baseRate: 8000,
      }
    });
  }

  // Add Event Halls
  await prisma.unit.upsert({
    where: { id: 'hall-non-ac' },
    update: {},
    create: {
      id: 'hall-non-ac',
      name: 'Non-AC Event Hall',
      category: 'Event Hall',
      isActive: true,
      maxCapacity: 1200,
      amenities: 'Seating, stage, generator, banquet space',
      defaultDeposit: 5000,
      baseRate: 0, // Rate depends on slab
    }
  });

  await prisma.unit.upsert({
    where: { id: 'hall-ac' },
    update: {},
    create: {
      id: 'hall-ac',
      name: 'AC Event Hall',
      category: 'Event Hall',
      isActive: false, // Inactive as per SKILL.md
      maxCapacity: 2000,
      amenities: 'Seating, stage, generator, banquet space',
      defaultDeposit: 10000,
      baseRate: 0,
    }
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
