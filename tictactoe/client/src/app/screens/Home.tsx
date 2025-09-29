import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import {jwtDecode} from "jwt-decode";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { FaSignOutAlt, FaTrophy, FaGamepad } from "react-icons/fa";

let socket: Socket;

export default function Home() {
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);
  const [game, setGame] = useState<any>(null);

  const API_URL = import.meta.env.VITE_API_URL;

  const token = localStorage.getItem("token");
  let userId: number | null = null;

  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      userId = decoded.id;
    } catch (err) {
      console.error("Invalid token", err);
      toast.error("Invalid token, please login again", { position: "top-center" });
      localStorage.removeItem("token");
      navigate("/");
    }
  }

  useEffect(() => {
    socket = io(API_URL);

    socket.on("waiting", (data) => {
      setWaiting(true);
      toast.info(data.message, { position: "top-center" });
    });

    socket.on("game_started", (gameData) => {
      setGame(gameData);
      navigate(`/game/${gameData.roomId}`);
    });

    return () => {
      if (socket) socket.disconnect();
    };
  }, [navigate]);

  const handleJoinGame = () => {
    if (!userId) {
      toast.error("No userId found, please log in first", { position: "top-center" });
      return;
    }
    socket.emit("join_game", { userId });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    toast.success("Logged out successfully", { position: "top-center" });
    navigate("/");
  };

  const goToLeaderboard = () => {
    navigate("/leaderboard");
  };

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-900 via-blue-900 to-black p-4 overflow-hidden">

      <div className="absolute inset-0 bg-purple-700/20 rounded-full animate-pulse-slow blur-3xl z-0"></div>

      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 bg-red-700/80 hover:bg-red-600/80 text-white font-bold rounded-xl shadow-md transform transition-all hover:scale-105"
        >
          <FaSignOutAlt /> Logout
        </button>
      </div>

      <h1 className="text-4xl sm:text-5xl text-white font-bold mb-12 text-center animate-pulse z-10">
        Tic-Tac-Toe Lobby
      </h1>

      {/* Join Game */}
      {!waiting && !game && (
        <div className="flex flex-col items-center">
          <button
            onClick={handleJoinGame}
            className="flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-2xl transform transition-all hover:scale-110 z-10"
          >
            <FaGamepad className="animate-bounce" /> Join Game
          </button>
          <p className="text-gray-300 text-sm mt-2 text-center max-w-xs">
            Connect automatically with another online player and start playing instantly.
          </p>
        </div>
      )}

      {waiting && (
        <p className="text-white text-lg mt-6 animate-pulse z-10">
          Waiting for another player...
        </p>
      )}

      {/* Leaderboard Section */}
      <div className="mt-12 z-10 w-full max-w-md flex flex-col items-center">
        <h2 className="text-2xl text-white font-semibold mb-4 flex items-center justify-center gap-2">
          <FaTrophy /> Leaderboard
        </h2>
        <button
          onClick={goToLeaderboard}
          className="flex items-center gap-3 px-12 py-4 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-2xl transform transition-all hover:scale-110 z-10"
        >
          <FaTrophy /> View Leaderboard
        </button>
      </div>
    </div>
  );
}
