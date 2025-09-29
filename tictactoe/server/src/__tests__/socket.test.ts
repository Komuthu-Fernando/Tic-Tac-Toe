import { Server } from "socket.io";
import { createServer } from "http";
import Client from "socket.io-client";
import { handleSockets } from "../services/socket.service";
import { PrismaClient } from "../generated/prisma";

jest.mock("../generated/prisma", () => {
  const mPrisma = {
    game: {
      create: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    userStats: {
      upsert: jest.fn(),
    },
  };
  return {
    PrismaClient: jest.fn(() => mPrisma),
  };
});

const prisma = new PrismaClient() as jest.Mocked<PrismaClient>;

let io: Server;
let clientSocket1: any;
let clientSocket2: any;
let httpServer: any;
let port: number;

beforeAll((done) => {
  httpServer = createServer();
  io = new Server(httpServer);
  handleSockets(io);

  httpServer.listen(() => {
    port = (httpServer.address() as any).port;
    clientSocket1 = Client(`http://localhost:${port}`);
    clientSocket2 = Client(`http://localhost:${port}`);
    done();
  });
});

afterAll(() => {
  io.close();
  clientSocket1.close();
  clientSocket2.close();
  httpServer.close();
});

beforeEach(() => {
  jest.clearAllMocks();
});

// --- Helper to mock Prisma game creation ---
const mockGameCreation = () => {
  (prisma.game.create as jest.Mock).mockResolvedValue({
    id: 1,
    roomId: "room-1",
    playerXId: 1,
    playerOId: 2,
    status: "ongoing",
  } as any);

  (prisma.user.findUnique as jest.Mock).mockImplementation(({ where }) => {
    return { id: where.id, username: `User${where.id}` } as any;
  });

  (prisma.userStats.upsert as jest.Mock).mockResolvedValue({} as any);
  (prisma.game.update as jest.Mock).mockResolvedValue({
    roomId: "room-1",
    playerXId: 1,
    playerOId: 2,
    status: "finished",
  } as any);
};

// --- Helper to start a game and return roomId ---
const startGame = async (): Promise<string> => {
  mockGameCreation();

  const waitingPromise = new Promise<any>((resolve) =>
    clientSocket1.once("waiting", (data:any) => resolve(data))
  );

  clientSocket1.emit("join_game", { userId: 1 });
  await waitingPromise;

  const startedPromise = new Promise<any>((resolve) =>
    clientSocket2.once("game_started", (data:any) => resolve(data))
  );

  clientSocket2.emit("join_game", { userId: 2 });
  const gameData = await startedPromise;

  // Wait for client1 to receive game_started as well
  await new Promise<any>((resolve) =>
    clientSocket1.once("game_started", (data:any) => resolve(data))
  );

  return gameData.roomId;
};

// --- Test Cases ---
describe("Socket.IO Tic-Tac-Toe", () => {
  it("should pair two players and start game", async () => {
    mockGameCreation();

    const waitingPromise = new Promise<any>((resolve) =>
      clientSocket1.once("waiting", (data:any) => resolve(data))
    );

    clientSocket1.emit("join_game", { userId: 1 });
    const waitData = await waitingPromise;
    expect(waitData.message).toBe("Waiting for opponent...");

    const startedPromise = new Promise<any>((resolve) =>
      clientSocket2.once("game_started", (data:any) => resolve(data))
    );

    clientSocket2.emit("join_game", { userId: 2 });
    const gameData = await startedPromise;
    expect(gameData.roomId).toBeDefined();
    expect(gameData.players).toHaveLength(2);

    // Clean up listeners if needed, but not necessary for this test
  });

  it("should handle invalid move", async () => {
    const roomId = await startGame();

    // First move: X (user1) moves to 0 (valid)
    const moveMade1 = new Promise<any>((resolve) =>
      clientSocket1.once("move_made", (data:any) => resolve(data))
    );
    clientSocket1.emit("make_move", { roomId, userId: 1, index: 0 });
    await moveMade1;

    // Second move: O (user2) moves to 1 (valid)
    const moveMade2 = new Promise<any>((resolve) =>
      clientSocket1.once("move_made", (data:any) => resolve(data))
    );
    clientSocket2.emit("make_move", { roomId, userId: 2, index: 1 });
    await moveMade2;

    // Third move: X (user1) tries 0 again (invalid, taken)
    const errorPromise = new Promise<any>((resolve) =>
      clientSocket1.once("error_msg", (data:any) => resolve(data))
    );
    clientSocket1.emit("make_move", { roomId, userId: 1, index: 0 });
    const errorData = await errorPromise;
    expect(errorData.message).toBe("Invalid move");
  });

  it("should validate turns", async () => {
    const roomId = await startGame();

    const errorPromise = new Promise<any>((resolve) =>
      clientSocket2.once("error_msg", (data:any) => resolve(data))
    );

    clientSocket2.emit("make_move", { roomId, userId: 2, index: 0 });

    const errorData = await errorPromise;
    expect(errorData.message).toBe("Not your turn");
  });

  it("should handle player disconnect", async () => {
    await startGame();

    const disconnectPromise = new Promise<any>((resolve) =>
      clientSocket2.once("player_disconnected", (data:any) => resolve(data))
    );

    clientSocket1.disconnect();

    const disconnectData = await disconnectPromise;
    expect(disconnectData.message).toBe("Your opponent disconnected");

    // Reconnect for subsequent tests
    clientSocket1.connect();
  });

  it("should update leaderboard on game over", async () => {
    const roomId = await startGame();

    const leaderboardPromise = new Promise<any>((resolve) =>
      clientSocket1.once("leaderboard_update", () => resolve(true))
    );

    // Sequence of moves to win (X wins)
    clientSocket1.emit("make_move", { roomId, userId: 1, index: 0 });
    await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay to ensure processing
    clientSocket2.emit("make_move", { roomId, userId: 2, index: 1 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    clientSocket1.emit("make_move", { roomId, userId: 1, index: 3 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    clientSocket2.emit("make_move", { roomId, userId: 2, index: 4 });
    await new Promise((resolve) => setTimeout(resolve, 100));
    clientSocket1.emit("make_move", { roomId, userId: 1, index: 6 });
    await new Promise((resolve) => setTimeout(resolve, 100));

    const leaderboardUpdated = await leaderboardPromise;
    expect(leaderboardUpdated).toBe(true);
  });
});