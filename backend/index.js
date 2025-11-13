import express from "express";
// import { PrismaClient } from "@prisma/client";
import prisma from "./prismaClient.js";

const app = express();

app.use(express.json());

// add liquid intake into liquidintake database
// app.post("/intake", async (req, res) => {
//    const { patientId, liquidType, intake } = req.body;
//    const record = await prisma.liquidIntake.create({
//        data: {
//            patientId,
//            liquidType,
//            intake,
//        },
//    });
//    res.json(record);
// });
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

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
