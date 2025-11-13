// manually inserting data into database (test to see if prisma connects to mysql)
import prisma from "./prismaClient.js";

async function main() {
    const intake = await prisma.liquidIntake.create({
        data: {
            patientId: 1,
            liquidType: "Water",
            intake: 150
        },
    });

    console.log("Data successfully added:", intake);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    })