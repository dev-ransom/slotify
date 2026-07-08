import { PrismaClient, Role, SlotStatus } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Clean existing data (safe for dev/demo re-seeding)
    await prisma.booking.deleteMany();
  await prisma.slot.deleteMany();
  await prisma.service.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();

  // ── Create a provider user ──
  const provider = await prisma.user.create({
    data: {
      name: "Jamie Rivera",
      email: "jamie@slotify.dev",
      role: Role.PROVIDER,
    },
  });

  // ── Create a customer user ──
  const customer = await prisma.user.create({
    data: {
      name: "Alex Chen",
      email: "alex@example.com",
      role: Role.CUSTOMER,
    },
  });

  // ── Create services owned by the provider ──
  const haircut = await prisma.service.create({
    data: {
      name: "Classic Haircut",
      description: "A precision haircut tailored to your style.",
      durationMin: 30,
      price: 3500, // $35.00
      providerId: provider.id,
    },
  });

  const consultation = await prisma.service.create({
    data: {
      name: "1:1 Career Consultation",
      description: "One-on-one session to review your career goals and next steps.",
      durationMin: 60,
      price: 7500, // $75.00
      providerId: provider.id,
    },
  });

  const tutoring = await prisma.service.create({
    data: {
      name: "Math Tutoring Session",
      description: "Personalized tutoring for high school and college-level math.",
      durationMin: 45,
      price: 5000, // $50.00
      providerId: provider.id,
    },
  });

  // ── Generate slots for the next 5 days for each service ──
  const services = [haircut, consultation, tutoring];
  const now = new Date();
  const slotsData = [];

  for (const service of services) {
    for (let day = 1; day <= 5; day++) {
      const date = new Date(now);
      date.setDate(date.getDate() + day);

      // Two slots per day: 10am and 2pm
      for (const hour of [10, 14]) {
        const startTime = new Date(date);
        startTime.setHours(hour, 0, 0, 0);

        const endTime = new Date(startTime);
        endTime.setMinutes(endTime.getMinutes() + service.durationMin);

        slotsData.push({
          startTime,
          endTime,
          status: SlotStatus.AVAILABLE,
          serviceId: service.id,
        });
      }
    }
  }

  await prisma.slot.createMany({ data: slotsData });

  // ── Book one slot to demonstrate a confirmed booking ──
  const firstSlot = await prisma.slot.findFirst({
    where: { serviceId: haircut.id },
    orderBy: { startTime: "asc" },
  });

  if (firstSlot) {
    await prisma.slot.update({
      where: { id: firstSlot.id },
      data: { status: SlotStatus.BOOKED },
    });

    await prisma.booking.create({
      data: {
        userId: customer.id,
        slotId: firstSlot.id,
        status: "CONFIRMED",
        amountPaid: haircut.price,
      },
    });
  }

  console.log("Seed complete:");
  console.log(`- ${services.length} services created`);
  console.log(`- ${slotsData.length} slots created`);
  console.log("- 1 sample booking created");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });