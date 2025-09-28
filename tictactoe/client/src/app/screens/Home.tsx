import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";
import { jwtDecode } from "jwt-decode";

let socket: Socket;

export default function Home() {
  const navigate = useNavigate();
  const [waiting, setWaiting] = useState(false);
  const [game, setGame] = useState<any>(null);

  const token = localStorage.getItem("token");
  let userId: number | null = null;

  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      userId = decoded.id; // adjust if your backend uses "userId" instead of "id"
    } catch (err) {
      console.error("Invalid token", err);
    }
  }

  useEffect(() => {
    socket = io("http://localhost:5000");

    socket.on("waiting", (data) => {
      setWaiting(true);
      console.log(data.message);
    });

    socket.on("game_start", (gameData) => {
      setGame(gameData);
      navigate(`/game/${gameData.roomId}`);
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [navigate]);

  const handleJoinGame = () => {
    if (!userId) {
      console.error("No userId found, please log in first");
      return;
    }
    socket.emit("join_game", userId);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-purple-900 via-blue-900 to-black p-4">
      <h1 className="text-4xl text-white font-bold mb-8 text-center animate-pulse">
        Tic-Tac-Toe Lobby
      </h1>

      {!waiting && !game && (
        <button
          onClick={handleJoinGame}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-blue-500 text-white font-bold rounded-xl shadow-2xl transform transition-all hover:scale-110 hover:from-blue-500 hover:to-purple-500"
        >
          Join Game
        </button>
      )}

      {waiting && (
        <p className="text-white text-lg mt-6 animate-pulse">
          Waiting for another player...
        </p>
      )}
    </div>
  );
}
