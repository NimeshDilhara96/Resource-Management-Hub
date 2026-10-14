import { PrismaClient, UserRole, ResourceType, ResourceStatus, ReservationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Resource Reservation System database seed...');

  // 1. Clear existing seed records if needed (clean state)
  await prisma.reservation.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users (Admin & Employees)
  const adminUser = await prisma.user.create({
    data: {
      fullName: 'Sarah Jenkins',
      email: 'admin@primewave.com',
      passwordHash: 'argon2_or_bcrypt_hash_placeholder',
      role: UserRole.ADMIN,
    },
  });

  const employee1 = await prisma.user.create({
    data: {
      fullName: 'Alex Morgan',
      email: 'alex@primewave.com',
      passwordHash: 'argon2_or_bcrypt_hash_placeholder',
      role: UserRole.EMPLOYEE,
    },
  });

  const employee2 = await prisma.user.create({
    data: {
      fullName: 'Elena Rostova',
      email: 'elena@primewave.com',
      passwordHash: 'argon2_or_bcrypt_hash_placeholder',
      role: UserRole.EMPLOYEE,
    },
  });

  const employee3 = await prisma.user.create({
    data: {
      fullName: 'David Chen',
      email: 'david@primewave.com',
      passwordHash: 'argon2_or_bcrypt_hash_placeholder',
      role: UserRole.EMPLOYEE,
    },
  });

  console.log(` Created default system accounts:
    - Admin: ${adminUser.email} (${adminUser.fullName})
    - Employee: ${employee1.email} (${employee1.fullName})
    - Employee: ${employee2.email} (${employee2.fullName})
    - Employee: ${employee3.email} (${employee3.fullName})`);

  // 3. Create Resources across ROOM, VEHICLE, and EQUIPMENT
  const boardroom = await prisma.resource.create({
    data: {
      name: 'Grand Boardroom (Oasis A)',
      type: ResourceType.ROOM,
      description: 'Executive conference room equipped with 4K video conferencing, dual displays, acoustic baffling, and digital whiteboard.',
      capacity: 20,
      location: 'Level 4, North Wing',
      status: ResourceStatus.ACTIVE,
    },
  });

  const huddlePod = await prisma.resource.create({
    data: {
      name: 'Innovation Huddle Pod 1',
      type: ResourceType.ROOM,
      description: 'Acoustic glass pod optimized for team standups, 1-on-1s, and confidential client discussions.',
      capacity: 4,
      location: 'Level 2, East Wing',
      status: ResourceStatus.ACTIVE,
    },
  });

  const workshopStudio = await prisma.resource.create({
    data: {
      name: 'Workshop Studio & Lab',
      type: ResourceType.ROOM,
      description: 'Spacious multi-purpose workshop area with movable desks, dual projectors, sound system, and presentation stage.',
      capacity: 35,
      location: 'Ground Floor, Innovation Hub',
      status: ResourceStatus.ACTIVE,
    },
  });

  const sprintRoom = await prisma.resource.create({
    data: {
      name: 'Focus Sprint Room 3',
      type: ResourceType.ROOM,
      description: 'Dedicated room for agile sprint planning with wall-mounted glassboards and high-speed AV link.',
      capacity: 6,
      location: 'Level 3, West Wing',
      status: ResourceStatus.ACTIVE,
    },
  });

  const passengerVan = await prisma.resource.create({
    data: {
      name: 'Toyota HiAce Executive Van (WP-CAD-8921)',
      type: ResourceType.VEHICLE,
      description: '12-seater passenger van for client delegations, team retreats, and airport transfers.',
      capacity: 12,
      location: 'Basement Parking B1 - Bay 04',
      status: ResourceStatus.ACTIVE,
    },
  });

  const electricCar = await prisma.resource.create({
    data: {
      name: 'Nissan Leaf Electric Car (WP-CAE-1044)',
      type: ResourceType.VEHICLE,
      description: 'Zero-emission company car for local official errands, branch visits, and vendor meetings.',
      capacity: 5,
      location: 'Basement Parking B1 - EV Bay 01',
      status: ResourceStatus.ACTIVE,
    },
  });

  const cargoVan = await prisma.resource.create({
    data: {
      name: 'Transit Cargo Utility Van (WP-CAB-5512)',
      type: ResourceType.VEHICLE,
      description: 'Medium cargo van for field logistics, exhibition booths, and heavy equipment transport.',
      capacity: 3,
      location: 'Loading Bay, Gate 2',
      status: ResourceStatus.ACTIVE,
    },
  });

  const projector = await prisma.resource.create({
    data: {
      name: 'Sony 4K Laser Cinema Projector (5000 Lumens)',
      type: ResourceType.EQUIPMENT,
      description: 'Ultra-bright 4K projector kit with wireless HDMI transmitter, cables, and portable tripod screen.',
      capacity: 1,
      location: 'IT Support Desk, Level 1',
      status: ResourceStatus.ACTIVE,
    },
  });

  const podcastKit = await prisma.resource.create({
    data: {
      name: 'DJI Osmo & Podcast Studio Kit',
      type: ResourceType.EQUIPMENT,
      description: 'Professional podcast studio setup with Shure microphones, multi-channel audio mixer, and 4K vlogging camera rig.',
      capacity: 1,
      location: 'Media Production Room, Level 2',
      status: ResourceStatus.ACTIVE,
    },
  });

  const vrKit = await prisma.resource.create({
    data: {
      name: 'Meta Quest Pro VR Development Kit',
      type: ResourceType.EQUIPMENT,
      description: 'Enterprise mixed-reality headset with high-precision motion controllers and developer tracking sensors.',
      capacity: 1,
      location: 'R&D Lab, Level 3',
      status: ResourceStatus.ACTIVE,
    },
  });

  const maintenanceCamera = await prisma.resource.create({
    data: {
      name: 'Polycom Studio Conference Bar (Backup)',
      type: ResourceType.EQUIPMENT,
      description: 'Portable enterprise conference soundbar with auto-framing 4K camera. (Under scheduled maintenance).',
      capacity: 1,
      location: 'IT Hardware Storage',
      status: ResourceStatus.INACTIVE,
    },
  });

  console.log(' Created 11 resources across Rooms, Vehicles, and Equipment.');

  // 4. Create Sample Reservations
  const now = new Date();
  
  // Tomorrow 10:00 AM - 12:00 PM
  const tomorrowStart = new Date(now);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(12, 0, 0, 0);

  // Tomorrow 02:00 PM - 03:30 PM
  const tomorrowAfternoonStart = new Date(now);
  tomorrowAfternoonStart.setDate(tomorrowAfternoonStart.getDate() + 1);
  tomorrowAfternoonStart.setHours(14, 0, 0, 0);

  const tomorrowAfternoonEnd = new Date(tomorrowAfternoonStart);
  tomorrowAfternoonEnd.setHours(15, 30, 0, 0);

  // Day after tomorrow 09:00 AM - 01:00 PM
  const dayAfterStart = new Date(now);
  dayAfterStart.setDate(dayAfterStart.getDate() + 2);
  dayAfterStart.setHours(9, 0, 0, 0);

  const dayAfterEnd = new Date(dayAfterStart);
  dayAfterEnd.setHours(13, 0, 0, 0);

  // Yesterday (completed reservation)
  const yesterdayStart = new Date(now);
  yesterdayStart.setDate(yesterdayStart.getDate() - 1);
  yesterdayStart.setHours(11, 0, 0, 0);

  const yesterdayEnd = new Date(yesterdayStart);
  yesterdayEnd.setHours(12, 30, 0, 0);

  await prisma.reservation.createMany({
    data: [
      {
        userId: employee1.id,
        resourceId: boardroom.id,
        startTime: tomorrowStart,
        endTime: tomorrowEnd,
        purpose: 'Quarterly Strategic Roadmap Alignment',
        status: ReservationStatus.CONFIRMED,
      },
      {
        userId: employee2.id,
        resourceId: huddlePod.id,
        startTime: tomorrowAfternoonStart,
        endTime: tomorrowAfternoonEnd,
        purpose: 'Design System & UX Review with Mobile Team',
        status: ReservationStatus.CONFIRMED,
      },
      {
        userId: employee3.id,
        resourceId: electricCar.id,
        startTime: dayAfterStart,
        endTime: dayAfterEnd,
        purpose: 'Client Onsite Integration & Stakeholder Workshop',
        status: ReservationStatus.PENDING,
      },
      {
        userId: employee1.id,
        resourceId: projector.id,
        startTime: dayAfterStart,
        endTime: dayAfterEnd,
        purpose: 'Regional All-Hands Townhall Broadcast',
        status: ReservationStatus.CONFIRMED,
      },
      {
        userId: employee2.id,
        resourceId: workshopStudio.id,
        startTime: yesterdayStart,
        endTime: yesterdayEnd,
        purpose: 'New Hire Engineering Onboarding Session',
        status: ReservationStatus.COMPLETED,
      },
    ],
  });

  console.log(' Created 5 sample reservations (Confirmed, Pending, Completed).');
  console.log('✅ Database seeding finished successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
