import { PrismaClient } from '@prisma/client';
import bcryptjs from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding for Hotel Management System...');

  // ============================================================================
  // 1. SEED USERS / ROLES
  // ============================================================================
  console.log('👤 Seeding staff users...');
  const salt = 10;
  const commonPasswordHash = await bcryptjs.hash('password123', salt);

  const usersData = [
    {
      name: 'System Administrator',
      email: 'admin@hotel.com',
      role: 'ADMIN' as const,
      passwordHash: commonPasswordHash,
      status: 'ACTIVE' as const,
    },
    {
      name: 'Sarah Jenkins (General Manager)',
      email: 'manager@hotel.com',
      role: 'MANAGER' as const,
      passwordHash: commonPasswordHash,
      status: 'ACTIVE' as const,
    },
    {
      name: 'Alex Rivera (Front Desk Lead)',
      email: 'receptionist@hotel.com',
      role: 'RECEPTIONIST' as const,
      passwordHash: commonPasswordHash,
      status: 'ACTIVE' as const,
    },
    {
      name: 'Maria Santos (Housekeeping Supervisor)',
      email: 'housekeeper@hotel.com',
      role: 'HOUSEKEEPER' as const,
      passwordHash: commonPasswordHash,
      status: 'ACTIVE' as const,
    },
    {
      name: 'David Chen (Chief Accountant)',
      email: 'accountant@hotel.com',
      role: 'ACCOUNTANT' as const,
      passwordHash: commonPasswordHash,
      status: 'ACTIVE' as const,
    },
  ];

  const users: Record<string, any> = {};
  for (const u of usersData) {
    users[u.role] = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        status: u.status,
      },
      create: u,
    });
  }
  console.log(`   ✓ Created/verified ${Object.keys(users).length} staff users`);

  // ============================================================================
  // 2. SEED ROOM TYPES
  // ============================================================================
  console.log('🏨 Seeding room types...');
  const roomTypesData = [
    {
      name: 'Single Economy',
      description: 'Cozy single room with high-speed Wi-Fi, ergonomic work desk, and luxury en-suite shower.',
      capacity: 1,
      basePrice: 80.0,
    },
    {
      name: 'Standard Double',
      description: 'Comfortable double room with queen-size bed, 50-inch Smart TV, and city-view balcony.',
      capacity: 2,
      basePrice: 130.0,
    },
    {
      name: 'Deluxe Ocean Suite',
      description: 'Luxury suite featuring panoramic ocean views, king bed, separate lounge area, and whirlpool tub.',
      capacity: 4,
      basePrice: 240.0,
    },
    {
      name: 'Presidential Penthouse',
      description: 'Top-floor penthouse with 2 master bedrooms, private terrace, dining room, and 24/7 dedicated butler service.',
      capacity: 6,
      basePrice: 550.0,
    },
  ];

  const roomTypes: Record<string, any> = {};
  for (const rt of roomTypesData) {
    roomTypes[rt.name] = await prisma.roomType.upsert({
      where: { name: rt.name },
      update: {
        description: rt.description,
        capacity: rt.capacity,
        basePrice: rt.basePrice,
      },
      create: rt,
    });
  }
  console.log(`   ✓ Created/verified ${Object.keys(roomTypes).length} room types`);

  // ============================================================================
  // 3. SEED 30 PHYSICAL ROOMS ACROSS FLOORS 1, 2, 3
  // ============================================================================
  console.log('🚪 Seeding physical rooms across 3 floors...');
  const roomsData = [
    // Floor 1: 101-105 (Single), 106-110 (Double)
    { number: '101', floor: 1, type: 'Single Economy', front: 'VACANT', hk: 'CLEAN' },
    { number: '102', floor: 1, type: 'Single Economy', front: 'VACANT', hk: 'CLEAN' },
    { number: '103', floor: 1, type: 'Single Economy', front: 'VACANT', hk: 'INSPECTED' },
    { number: '104', floor: 1, type: 'Single Economy', front: 'VACANT', hk: 'DIRTY' },
    { number: '105', floor: 1, type: 'Single Economy', front: 'OUT_OF_ORDER', hk: 'OUT_OF_SERVICE' },
    { number: '106', floor: 1, type: 'Standard Double', front: 'VACANT', hk: 'CLEAN' },
    { number: '107', floor: 1, type: 'Standard Double', front: 'VACANT', hk: 'CLEAN' },
    { number: '108', floor: 1, type: 'Standard Double', front: 'VACANT', hk: 'INSPECTED' },
    { number: '109', floor: 1, type: 'Standard Double', front: 'VACANT', hk: 'DIRTY' },
    { number: '110', floor: 1, type: 'Standard Double', front: 'VACANT', hk: 'CLEAN' },

    // Floor 2: 201-206 (Double), 207-210 (Deluxe Ocean Suite)
    { number: '201', floor: 2, type: 'Standard Double', front: 'VACANT', hk: 'CLEAN' },
    { number: '202', floor: 2, type: 'Standard Double', front: 'VACANT', hk: 'CLEAN' },
    { number: '203', floor: 2, type: 'Standard Double', front: 'VACANT', hk: 'INSPECTED' },
    { number: '204', floor: 2, type: 'Standard Double', front: 'VACANT', hk: 'DIRTY' },
    { number: '205', floor: 2, type: 'Standard Double', front: 'VACANT', hk: 'CLEAN' },
    { number: '206', floor: 2, type: 'Standard Double', front: 'VACANT', hk: 'CLEAN' },
    { number: '207', floor: 2, type: 'Deluxe Ocean Suite', front: 'OCCUPIED', hk: 'CLEAN' },
    { number: '208', floor: 2, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'CLEAN' },
    { number: '209', floor: 2, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'INSPECTED' },
    { number: '210', floor: 2, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'DIRTY' },

    // Floor 3: 301-306 (Deluxe Ocean Suite), 307-310 (Presidential Penthouse)
    { number: '301', floor: 3, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'CLEAN' },
    { number: '302', floor: 3, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'CLEAN' },
    { number: '303', floor: 3, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'INSPECTED' },
    { number: '304', floor: 3, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'DIRTY' },
    { number: '305', floor: 3, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'CLEAN' },
    { number: '306', floor: 3, type: 'Deluxe Ocean Suite', front: 'VACANT', hk: 'CLEAN' },
    { number: '307', floor: 3, type: 'Presidential Penthouse', front: 'VACANT', hk: 'INSPECTED' },
    { number: '308', floor: 3, type: 'Presidential Penthouse', front: 'VACANT', hk: 'CLEAN' },
    { number: '309', floor: 3, type: 'Presidential Penthouse', front: 'VACANT', hk: 'CLEAN' },
    { number: '310', floor: 3, type: 'Presidential Penthouse', front: 'VACANT', hk: 'INSPECTED' },
  ];

  const rooms: Record<string, any> = {};
  for (const r of roomsData) {
    rooms[r.number] = await prisma.room.upsert({
      where: { number: r.number },
      update: {
        floor: r.floor,
        roomTypeId: roomTypes[r.type].id,
        frontDeskStatus: r.front as any,
        housekeepingStatus: r.hk as any,
      },
      create: {
        number: r.number,
        floor: r.floor,
        roomTypeId: roomTypes[r.type].id,
        frontDeskStatus: r.front as any,
        housekeepingStatus: r.hk as any,
      },
    });
  }
  console.log(`   ✓ Created/verified ${Object.keys(rooms).length} physical rooms`);

  // ============================================================================
  // 4. SEED ANCILLARY SERVICES
  // ============================================================================
  console.log('🛎️ Seeding ancillary services...');
  const servicesData = [
    {
      name: 'Airport Shuttle Transfer',
      description: 'Private luxury Mercedes transport between the hotel and international airport.',
      price: 45.0,
      active: true,
    },
    {
      name: 'Continental Breakfast Buffet',
      description: 'Full chef buffet featuring fresh pastries, organic eggs, juice bar, and barista coffee.',
      price: 22.0,
      active: true,
    },
    {
      name: 'Full Spa Treatment',
      description: '60-minute therapeutic massage with aromatherapy and hot stone relaxation.',
      price: 110.0,
      active: true,
    },
    {
      name: 'Express Laundry Service',
      description: 'Same-day professional wash, iron, and folded garment delivery within 4 hours.',
      price: 28.0,
      active: true,
    },
  ];

  const services: Record<string, any> = {};
  for (const s of servicesData) {
    services[s.name] = await prisma.service.upsert({
      where: { name: s.name },
      update: {
        description: s.description,
        price: s.price,
        active: s.active,
      },
      create: s,
    });
  }
  console.log(`   ✓ Created/verified ${Object.keys(services).length} hotel services`);

  // ============================================================================
  // 5. SEED GUESTS
  // ============================================================================
  console.log('👥 Seeding guests...');
  const guestsData = [
    {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@gmail.com',
      phone: '+1-555-0101',
      address: '742 Evergreen Terrace, Springfield, USA',
      nationality: 'American',
      identificationType: 'PASSPORT',
      identificationNumber: 'P84729103',
    },
    {
      firstName: 'Emma',
      lastName: 'Watson',
      email: 'emma.w@outlook.com',
      phone: '+44-20-7946-0912',
      address: '221B Baker Street, London, UK',
      nationality: 'British',
      identificationType: 'NATIONAL_ID',
      identificationNumber: 'UK-928174',
    },
    {
      firstName: 'Carlos',
      lastName: 'Rodriguez',
      email: 'carlos.r@yahoo.es',
      phone: '+34-612-345-678',
      address: 'Paseo de la Castellana 45, Madrid, Spain',
      nationality: 'Spanish',
      identificationType: 'DRIVING_LICENSE',
      identificationNumber: 'ES-B84920',
    },
  ];

  const guests: Record<string, any> = {};
  for (const g of guestsData) {
    const existing = await prisma.guest.findFirst({
      where: { email: g.email },
    });
    if (existing) {
      guests[g.email] = await prisma.guest.update({
        where: { id: existing.id },
        data: g,
      });
    } else {
      guests[g.email] = await prisma.guest.create({
        data: g,
      });
    }
  }
  console.log(`   ✓ Created/verified ${Object.keys(guests).length} guest profiles`);

  // ============================================================================
  // 6. SEED SAMPLE RESERVATIONS, STAYS & BILLING
  // ============================================================================
  console.log('📅 Seeding sample reservations and billing...');
  const existingRes1 = await prisma.reservation.findUnique({
    where: { reservationCode: 'RES-SEED01' },
  });

  if (!existingRes1) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() - 1); // checked in yesterday
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 2); // checking out in 2 days

    const res1 = await prisma.reservation.create({
      data: {
        reservationCode: 'RES-SEED01',
        status: 'CHECKED_IN',
        bookerGuestId: guests['john.doe@gmail.com'].id,
        stays: {
          create: [
            {
              roomId: rooms['207'].id,
              roomTypeId: roomTypes['Deluxe Ocean Suite'].id,
              checkInDate: checkIn,
              checkOutDate: checkOut,
              adults: 2,
              children: 0,
              ratePerNight: 240.0,
              status: 'CHECKED_IN',
              guests: {
                create: [
                  {
                    guestId: guests['john.doe@gmail.com'].id,
                    isPrimary: true,
                  },
                ],
              },
            },
          ],
        },
      },
    });

    // Create an Invoice for this checked-in stay (3 nights @ $240 = $720 + 10% tax = $792)
    const invoice1 = await prisma.invoice.create({
      data: {
        invoiceNumber: 'INV-SEED-001',
        reservationId: res1.id,
        subtotal: 720.0,
        tax: 72.0,
        discount: 0.0,
        total: 792.0,
        status: 'PARTIALLY_PAID',
        issuedAt: new Date(),
        items: {
          create: [
            {
              description: 'Room 207 (Deluxe Ocean Suite) - 3 night(s) @ $240.00',
              quantity: 3,
              unitPrice: 240.0,
              total: 720.0,
            },
          ],
        },
        payments: {
          create: [
            {
              amount: 300.0,
              method: 'CARD',
              status: 'COMPLETED',
              transactionReference: 'TXN-INIT-DEPOSIT',
              paidAt: new Date(),
            },
          ],
        },
      },
    });

    console.log(`   ✓ Created active checked-in booking RES-SEED01 with invoice ${invoice1.invoiceNumber}`);
  }

  // Reservation 2: Upcoming booking for Emma Watson
  const existingRes2 = await prisma.reservation.findUnique({
    where: { reservationCode: 'RES-SEED02' },
  });

  if (!existingRes2) {
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 5);
    const checkOut = new Date();
    checkOut.setDate(checkOut.getDate() + 9);

    await prisma.reservation.create({
      data: {
        reservationCode: 'RES-SEED02',
        status: 'CONFIRMED',
        bookerGuestId: guests['emma.w@outlook.com'].id,
        stays: {
          create: [
            {
              roomId: rooms['308'].id,
              roomTypeId: roomTypes['Presidential Penthouse'].id,
              checkInDate: checkIn,
              checkOutDate: checkOut,
              adults: 3,
              children: 1,
              ratePerNight: 550.0,
              status: 'SCHEDULED',
              guests: {
                create: [
                  {
                    guestId: guests['emma.w@outlook.com'].id,
                    isPrimary: true,
                  },
                ],
              },
            },
          ],
        },
      },
    });
    console.log('   ✓ Created upcoming scheduled booking RES-SEED02');
  }

  // ============================================================================
  // 7. SEED HOUSEKEEPING & MAINTENANCE TASKS
  // ============================================================================
  console.log('🧹 Seeding operations tasks...');
  // A pending turnover task for dirty room 104
  const existingHkTask = await prisma.housekeepingTask.findFirst({
    where: { roomId: rooms['104'].id, status: 'PENDING' },
  });

  if (!existingHkTask) {
    await prisma.housekeepingTask.create({
      data: {
        roomId: rooms['104'].id,
        assignedToId: users['HOUSEKEEPER'].id,
        status: 'PENDING',
        notes: 'Priority turnover cleaning needed before 3:00 PM',
      },
    });
    console.log('   ✓ Created housekeeping task for Room 104');
  }

  // A maintenance request for room 105 (currently OUT_OF_ORDER)
  const existingMaint = await prisma.maintenanceRequest.findFirst({
    where: { roomId: rooms['105'].id, status: 'REPORTED' },
  });

  if (!existingMaint) {
    await prisma.maintenanceRequest.create({
      data: {
        roomId: rooms['105'].id,
        reportedById: users['RECEPTIONIST'].id,
        title: 'AC unit condensation leak',
        description: 'Water dripping from the overhead air conditioning unit onto carpet. Compressor needs inspection.',
        status: 'REPORTED',
      },
    });
    console.log('   ✓ Created maintenance request for Room 105');
  }

  console.log('\n✨ Database seeding completed successfully! ✨');
  console.log('---------------------------------------------------------');
  console.log('🔑 Credentials to log in:');
  console.log('   Admin:        admin@hotel.com        / password123');
  console.log('   Manager:      manager@hotel.com      / password123');
  console.log('   Receptionist: receptionist@hotel.com / password123');
  console.log('   Housekeeper:  housekeeper@hotel.com  / password123');
  console.log('   Accountant:   accountant@hotel.com   / password123');
  console.log('---------------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
