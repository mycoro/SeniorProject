import 'dotenv/config';
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

const randomString = (length) =>
  Array.from({ length }, () =>
    "abcdefghijklmnopqrstuvwxyz"[Math.floor(Math.random() * 26)]
  ).join("");

const randomEmail = () => `${randomString(5)}@example.com`;

const randomDateOnly = (start, end) => {
  const date = new Date(
    start.getTime() + Math.random() * (end.getTime() - start.getTime())
  );
  return new Date(date.toISOString().split("T")[0]);
};

const randomInt = (min, max) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

const mealCategories = ["Breakfast", "Lunch", "Dinner", "Snack"];
const foods = [
  "Oatmeal",
  "Chicken Salad",
  "Grilled Salmon",
  "Smoothie",
  "Pasta",
  "Yogurt",
  "Soup",
  "Sandwich",
];
const liquids = ["Water", "Juice", "Milk", "Tea", "Coffee"];

async function main() {
  const patients = [];

  for (let i = 0; i < 5; i++) {
    const patient = await prisma.patient.create({
      data: {
        firstName: randomString(6),
        lastName: randomString(8),
        email: randomEmail(),
      },
    });
    patients.push(patient);
  }

  console.log("Created patients:", patients.map((p) => p.uuid));

  for (let i = 0; i < 10; i++) {
    const patient = patients[randomInt(0, patients.length - 1)];
    await prisma.meal.create({
      data: {
        patientId: patient.id,
        mealDate: randomDateOnly(
          new Date(2025, 0, 1),
          new Date(2025, 11, 31)
        ),
        mealCategory:
          mealCategories[randomInt(0, mealCategories.length - 1)],
        foodName: foods[randomInt(0, foods.length - 1)],
        calories: randomInt(200, 800),
        protein: randomInt(5, 50),
        carbs: randomInt(10, 100),
        fiber: randomInt(1, 15),
      },
    });
  }

  for (let i = 0; i < 5; i++) {
    const patient = patients[randomInt(0, patients.length - 1)];
    await prisma.liquidIntake.create({
      data: {
        patientId: patient.id,
        liquidType: liquids[randomInt(0, liquids.length - 1)],
        intake: parseFloat((Math.random() * 500).toFixed(2)),
        recordedAt: randomDateOnly(
          new Date(2025, 0, 1),
          new Date(2025, 11, 31)
        ),
      },
    });
  }

  console.log("Meals + Liquid Intake created!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());
