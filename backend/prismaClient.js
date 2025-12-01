import { PrismaClient } from "@prisma/client";
import { PrismaMySQL } from "@prisma/adapter-mysql";

const adapter = new PrismaMySQL(process.env.DATABASE_URL);

const prisma = new PrismaClient({
  adapter,
});

export default prisma;
