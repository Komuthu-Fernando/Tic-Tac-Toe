import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export const getAllGames = async (req: Request, res: Response) => {
  const games = await prisma.game.findMany({
    include: {
      playerX: true,
      playerO: true
    }
  });
  res.json(games);
};
