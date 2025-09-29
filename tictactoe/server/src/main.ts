import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { Server } from "socket.io";
import authRoutes from "./routes/auth.routes";
import { handleSockets } from "./services/socket.service";
import leaderboardRoutes from "./routes/leaderboard.routes";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/leaderboard", leaderboardRoutes);

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // for now, allow all
    methods: ["GET", "POST"]
  }
});

// initialize socket handling
handleSockets(io);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
