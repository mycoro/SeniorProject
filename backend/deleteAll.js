// used to delete all rows from database liquidIntake
import prisma from "./prismaClient.js";

async function main() {
  await prisma.liquidIntake.deleteMany();
  console.log("All records deleted");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });