import { Server, Socket } from "socket.io";
import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// In-memory queue for waiting players
let waitingPlayer: { socketId: string; userId: number } | null = null;

export const handleSockets = (io: Server) => {
  io.on("connection", (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("join_game", async (userId: number) => {
      console.log(`User ${userId} wants to join a game`);

      if (!waitingPlayer) {
        waitingPlayer = { socketId: socket.id, userId };
        socket.emit("waiting", { message: "Waiting for another player..." });
      } else {
        // Match found
        const playerX = waitingPlayer.userId;
        const playerO = userId;

        // Create game in DB
        const game = await prisma.game.create({
          data: {
            roomId: `room-${Date.now()}`,
            playerXId: playerX,
            playerOId: playerO,
            status: "ongoing"
          }
        });

        // Notify both players
        io.to(waitingPlayer.socketId).emit("game_start", game);
        socket.emit("game_start", game);

        // Reset waiting player
        waitingPlayer = null;
      }
    });

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${socket.id}`);
      if (waitingPlayer && waitingPlayer.socketId === socket.id) {
        waitingPlayer = null;
      }
    });
  });
};
