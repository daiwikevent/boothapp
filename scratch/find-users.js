const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      displayName: true,
      isAdmin: true,
    }
  });
  console.log("Users in database:", users);
}
main().catch(console.error).finally(() => prisma.$disconnect());
