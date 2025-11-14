const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Helper functions
const randomString = (length) => {
  const chars = "abcdefghijklmnopqrstuvwxyz";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const randomEmail = () => `${randomString(5)}@example.com`;

const randomDateOnly = (start, end) => {
  const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  return new Date(date.toISOString().split("T")[0]); // keeps only YYYY-MM-DD
};

const randomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const mealCategories = ["Breakfast", "Lunch", "Dinner", "Snack"];
const foods = ["Oatmeal", "Chicken Salad", "Grilled Salmon", "Smoothie", "Pasta", "Yogurt", "Soup", "Sandwich"];

async function main() {
  const patients = [];

  // Create 5 random patients
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

  console.log("Created patients:", patients.map(p => p.id));

  // Create 10 random meals linked to patients
  for (let i = 0; i < 10; i++) {
    const patient = patients[randomInt(0, patients.length - 1)];
    await prisma.meal.create({
      data: {
        userId: patient.id,
        mealDate: randomDateOnly(new Date(2025, 0, 1), new Date(2025, 11, 31)),
        mealCategory: mealCategories[randomInt(0, mealCategories.length - 1)],
        foodName: foods[randomInt(0, foods.length - 1)],
        calories: randomInt(200, 800),
        protein: randomInt(5, 50),
        carbs: randomInt(10, 100),
        fiber: randomInt(1, 15),
        // createdAt is automatically set by Prisma
      },
    });
  }

  console.log("Random meals created!");
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
