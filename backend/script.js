// manually inserting data into database (test to see if prisma connects to mysql)
// import prisma from "./prismaClient.js";

// async function main() {
//     const intake = await prisma.liquidIntake.create({
//         data: {
//             patientId: 1,
//             liquidType: "Juice",
//             intake: 100
//         },
//     });

//     console.log("Data successfully added:", intake);
// }

// main()
//     .catch((e) => console.error(e))
//     .finally(async () => {
//         await prisma.$disconnect();
//     })

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function testRelationships() {
  try {
    // Fetch all patients with their meals and liquids
    const patients = await prisma.patient.findMany({
      include: {
        meals: true,
        liquids: true,
      },
    });

    patients.forEach((patient) => {
      console.log(`Patient: ${patient.firstName} ${patient.lastName} (${patient.email})`);
      console.log("Meals:");
      patient.meals.forEach((meal) => {
        console.log(` - ${meal.mealCategory}: ${meal.foodName}, Calories: ${meal.calories}`);
      });
      console.log("Liquids:");
      patient.liquids.forEach((liquid) => {
        console.log(` - ${liquid.liquidType}: ${liquid.intake} ml`);
      });
      console.log("------------------------");
    });
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

// Call the test function
testRelationships();
