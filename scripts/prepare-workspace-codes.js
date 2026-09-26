const { PrismaClient } = require("@prisma/client");
const { randomUUID } = require("crypto");

const db = new PrismaClient();

async function main() {
  const column = await db.$queryRawUnsafe(`
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'SchoolMembership'
      AND column_name = 'workspaceCode'
    LIMIT 1
  `);

  if (column.length === 0) {
    await db.$executeRawUnsafe(
      'ALTER TABLE "SchoolMembership" ADD COLUMN "workspaceCode" TEXT'
    );
    console.log("Added SchoolMembership.workspaceCode column.");
  }

  const rows = await db.$queryRawUnsafe(
    'SELECT "id" FROM "SchoolMembership" WHERE "workspaceCode" IS NULL'
  );

  for (const row of rows) {
    await db.$executeRaw`
      UPDATE "SchoolMembership"
      SET "workspaceCode" = ${randomUUID()}
      WHERE "id" = ${row.id}
    `;
  }

  await db.$executeRawUnsafe(
    'CREATE UNIQUE INDEX IF NOT EXISTS "SchoolMembership_workspaceCode_key" ON "SchoolMembership" ("workspaceCode")'
  );

  await db.$executeRawUnsafe(
    'ALTER TABLE "SchoolMembership" ALTER COLUMN "workspaceCode" SET NOT NULL'
  );

  console.log(`Workspace code preparation complete. Populated ${rows.length} existing membership record(s).`);
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
