import express from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();
app.use(express.json());

let patientId;

// Create or find your patient
async function ensurePatient() {
  const existing = await prisma.patient.findFirst({
    where: { email: "me@example.com" },
  });
  if (existing) {
    patientId = existing.id;
  } else {
    const newPatient = await prisma.patient.create({
      data: {
        firstName: "MyFirstName",
        lastName: "MyLastName",
        email: "me@example.com",
      },
    });
    patientId = newPatient.id;
  }
}
await ensurePatient();

// Route to add a meal
app.post("/addMeal", async (req, res) => {
  const { mealDate, mealCategory, foodName, calories, protein, carbs, fiber } = req.body;
  try {
    const meal = await prisma.meal.create({
      data: {
        patientId,
        mealDate: new Date(mealDate),
        mealCategory,
        foodName,
        calories,
        protein,
        carbs,
        fiber,
      },
    });
    res.json(meal);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Route to add liquid intake
app.post("/addLiquid", async (req, res) => {
  const { liquidType, intake, recordedAt } = req.body;
  try {
    const liquid = await prisma.liquidIntake.create({
      data: {
        patientId,
        liquidType,
        intake,
        recordedAt: new Date(recordedAt),
      },
    });
    res.json(liquid);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
