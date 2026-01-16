import express from "express";
// import { PrismaClient } from "@prisma/client";
import prisma from "./prismaClient.js";

const app = express();

app.use(express.json());

app.post("/intake", async (req, res) => {
    try {
        const { patientId, liquidType, intake } = req.body;

        if (!patientId || !liquidType || !intake) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const record = await prisma.liquidIntake.create({
            data: { patientId, liquidType, intake },
        });

        res.status(201).json(record);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Internal server error" });
    }
});

// get all liquid intake for a patient (may change)
app.get("/patient/:id/intakes", async (req, res) => {
    const patientId = parseInt(req.params.id);
    const intakes = await prisma.liquidIntake.findMany({
        where: { patientId },
    });
    res.json(intakes);
});

//app.listen(3000, () => console.log("Server running on http://localhost:3000"));
const PORT = 3000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://172.16.60.211:${PORT}`);
});
