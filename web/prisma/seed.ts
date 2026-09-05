import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const email = process.env.DEV_LOGIN_EMAIL || "dev@example.com";
  await prisma.user.upsert({
    where: { email },
    update: { name: "Development User" },
    create: { email, name: "Development User" },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
