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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-purple-900 to-black p-4 sm:p-6 text-white">
      <div className="absolute top-4 right-4 flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
        <button
          onClick={goToHome}
          className="flex items-center gap-3 px-6 sm:px-8 py-3 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-blue-500 hover:to-purple-500 text-white font-bold rounded-2xl shadow-2xl transform transition-all hover:scale-110 z-10"
        >
          Home
        </button>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-red-700/80 hover:bg-red-600/80 text-white font-bold rounded-xl shadow-md transform transition-all hover:scale-105"
        >
          Logout
        </button>
      </div>
      <h1 className="text-3xl sm:text-4xl font-bold mb-6">🏆 Leaderboard</h1>
      <div className="bg-black/40 rounded-xl p-4 sm:p-6 shadow-lg w-full max-w-2xl overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-max">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="py-2 px-2 sm:px-4 text-sm sm:text-base">Rank</th>
              <th className="py-2 px-2 sm:px-4 text-sm sm:text-base">Player</th>
              <th className="py-2 px-2 sm:px-4 text-sm sm:text-base">Wins</th>
              <th className="py-2 px-2 sm:px-4 text-sm sm:text-base">Draws</th>
              <th className="py-2 px-2 sm:px-4 text-sm sm:text-base">Losses</th>
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
                <td className="py-2 px-2 sm:px-4 text-sm sm:text-base">{idx + 1}</td>
                <td className="py-2 px-2 sm:px-4 font-semibold text-sm sm:text-base">{entry.user.username}</td>
                <td className="py-2 px-2 sm:px-4 text-green-400 text-sm sm:text-base">{entry.wins}</td>
                <td className="py-2 px-2 sm:px-4 text-yellow-400 text-sm sm:text-base">{entry.draws}</td>
                <td className="py-2 px-2 sm:px-4 text-red-400 text-sm sm:text-base">{entry.losses}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}