const { PrismaClient } = require("@prisma/client");

const db = new PrismaClient();

async function main() {
  const schools = await db.school.findMany({
    select: { id: true },
  });

  let created = 0;

  for (const school of schools) {
    const existing = await db.schoolSubscription.findUnique({
      where: { schoolId: school.id },
      select: { id: true },
    });

    if (existing) continue;

    await db.schoolSubscription.create({
      data: {
        schoolId: school.id,
        tier: "BASIC",
        tier: "BASIC",
        plan: "MONTHLY",
        status: "TRIAL",
        startedAt: null,
        expiresAt: null,
      },
    });

    created += 1;
  }

  console.log(`School subscription backfill complete. Created ${created} record(s).`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
