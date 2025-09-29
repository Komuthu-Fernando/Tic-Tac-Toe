import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useNavigate } from "react-router-dom";

let socket: Socket;

interface LeaderboardEntry {
  userId: number;
  wins: number;
  losses: number;
  draws: number;
  user: { id: number; username: string };
}

export default function Leaderboard() {
    const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);

  const fetchLeaderboard = async () => {
    const res = await fetch("http://localhost:5000/api/leaderboard");
    const data = await res.json();
    setLeaderboard(data);
  };

  useEffect(() => {
    fetchLeaderboard();

    socket = io("http://localhost:5000");

    socket.on("leaderboard_update", () => {
      fetchLeaderboard();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

    const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login"); 
  };

  const goToHome = () => {
    navigate("/home");
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-purple-900 to-black p-6 text-white">
        <div className="absolute top-4 right-4 flex space-x-4">
        <button
          onClick={goToHome}
          className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg shadow-md hover:bg-blue-700 transition-all"
        >
          Home
        </button>
        <button
          onClick={handleLogout}
          className="px-4 py-2 bg-red-600 text-white font-bold rounded-lg shadow-md hover:bg-red-700 transition-all"
        >
          Logout
        </button>
      </div>
      <h1 className="text-4xl font-bold mb-6">🏆 Leaderboard</h1>
      <div className="bg-black/40 rounded-xl p-6 shadow-lg w-full max-w-2xl">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-4">Rank</th>
              <th className="py-2 px-4">Player</th>
              <th className="py-2 px-4">Wins</th>
              <th className="py-2 px-4">Draws</th>
              <th className="py-2 px-4">Losses</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((entry, idx) => (
              <tr
                key={entry.userId}
                className={`border-b border-gray-800 ${
                  idx % 2 === 0 ? "bg-white/5" : ""
                }`}
              >
                <td className="py-2 px-4">{idx + 1}</td>
                <td className="py-2 px-4 font-semibold">{entry.user.username}</td>
                <td className="py-2 px-4 text-green-400">{entry.wins}</td>
                <td className="py-2 px-4 text-yellow-400">{entry.draws}</td>
                <td className="py-2 px-4 text-red-400">{entry.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
