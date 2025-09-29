import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.user.findMany();
  console.log(players);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
