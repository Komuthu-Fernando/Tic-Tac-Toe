// server/src/db-test.ts
import { PrismaClient } from './generated/prisma';

const prisma = new PrismaClient();

async function main() {
  const players = await prisma.player.findMany();
  console.log(players);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
