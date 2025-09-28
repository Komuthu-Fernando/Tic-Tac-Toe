import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { io, Socket } from "socket.io-client";

let socket: Socket;

export default function GameScreen() {
  const { roomId } = useParams();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [yourTurn, setYourTurn] = useState(false);

  useEffect(() => {
    socket = io("http://localhost:5000");
    socket.emit("join_room", roomId);

    socket.on("update_board", (newBoard) => {
        setBoard(newBoard);
        setYourTurn(true);
    });

    return () => {
        if (socket) {
        socket.disconnect();
        }
    };
  }, [roomId]);

  const handleClick = (index: number) => {
    if (!yourTurn || board[index]) return;
    const newBoard = [...board];
    newBoard[index] = "X"; // replace with dynamic player mark
    setBoard(newBoard);
    setYourTurn(false);
    socket.emit("player_move", { roomId, board: newBoard });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-black via-purple-900 to-blue-900 p-4">
      <h1 className="text-3xl text-white font-bold mb-6">Game Room: {roomId}</h1>
      <div className="grid grid-cols-3 gap-2 w-64">
        {board.map((cell, i) => (
          <div
            key={i}
            className="w-20 h-20 flex items-center justify-center bg-black/70 text-white text-2xl font-bold rounded-lg shadow-lg cursor-pointer hover:bg-purple-600 transition-colors"
            onClick={() => handleClick(i)}
          >
            {cell}
          </div>
        ))}
      </div>
    </div>
  );
}
