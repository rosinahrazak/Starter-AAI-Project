import { PrismaClient } from "@prisma/client";

// One shared client for the whole app; Next.js hot-reload reuses this instance.
export const prisma = new PrismaClient();
