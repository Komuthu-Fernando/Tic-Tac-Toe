import { Request, Response } from "express";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const leaderboard = await prisma.userStats.findMany({
      include: { user: { select: { id: true, username: true } } },
      orderBy: [{ wins: "desc" }, { draws: "desc" }, { losses: "asc" }],
      take: 10, // top 10
    });
    res.json(leaderboard);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch leaderboard" });
  }
};
