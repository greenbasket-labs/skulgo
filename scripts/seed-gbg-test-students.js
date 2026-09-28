const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const GBG = {
  schoolId: "cmuh656w80000jc2d9qlr693s",
  schoolName: "Green basket global Ltd",
  abbr: "GBG",
  classes: {
    "SS 1": "cmuh8nqbj000ejc2dbc86pw4y",
    "SS 2": "cmuh8nqbb000ajc2dustqgkw1",
    "SS 3": "cmuh8nqk9000ijc2d7p5l6nck",
  },
};

const students = [
  ["Aisha","Abdullahi","F"],["Maryam","Bello","F"],["Fatima","Usman","F"],["Zainab","Ibrahim","F"],
  ["Hauwa","Yusuf","F"],["Khadija","Sani","F"],["Amina","Musa","F"],["Rahma","Abubakar","F"],
  ["Daniel","Okafor","M"],["Samuel","Eze","M"],["David","Adeyemi","M"],["Michael","Obi","M"],
  ["Joshua","Babatunde","M"],["Emmanuel","Ibrahim","M"],["Ibrahim","Garba","M"],["Yusuf","Mamman","M"],
  ["Grace","Nwosu","F"],["Esther","Adebayo","F"],["John","Olawale","M"],["Hannah","Yakubu","F"],
];

const classOrder = ["SS 1", "SS 2", "SS 3"];

async function main() {
  // Hard safety guard: this script is ONLY for the existing GBG test school.
  const school = await prisma.school.findUnique({ where: { id: GBG.schoolId } });
  if (!school || school.name !== GBG.schoolName || school.abbr !== GBG.abbr) {
    throw new Error("GBG safety check failed. No data was changed.");
  }

  const classes = await prisma.schoolClass.findMany({
    where: {
      id: { in: Object.values(GBG.classes) },
      schoolId: GBG.schoolId,
    },
    select: { id: true, name: true },
  });

  if (classes.length !== classOrder.length) {
    throw new Error("GBG class safety check failed. Expected SS 1, SS 2 and SS 3. No data was changed.");
  }

  const classByName = new Map(classes.map((c) => [c.name, c.id]));

  let created = 0;
  let updated = 0;

  for (const className of classOrder) {
    const classId = classByName.get(className);
    if (!classId) throw new Error(`Missing GBG class: ${className}`);

    for (let i = 0; i < students.length; i++) {
      const [firstName, lastName, gender] = students[i];
      const admissionId = `GBG-TEST-${className.replace(" ", "")}-${String(i + 1).padStart(3, "0")}`;

      const existing = await prisma.student.findUnique({ where: { admissionId } });

      await prisma.student.upsert({
        where: { admissionId },
        create: {
          schoolId: GBG.schoolId,
          admissionId,
          firstName,
          lastName,
          gender,
          classId,
        },
        update: {
          schoolId: GBG.schoolId,
          firstName,
          lastName,
          gender,
          classId,
        },
      });

      if (existing) updated++;
      else created++;
    }
  }

  console.log(`GBG test students ready: ${created} created, ${updated} refreshed.`);
  console.log("School: Green basket global Ltd (GBG)");
  console.log("Classes: SS 1, SS 2, SS 3");
  console.log("Students: 20 per class / 60 total");
}

main()
  .catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
