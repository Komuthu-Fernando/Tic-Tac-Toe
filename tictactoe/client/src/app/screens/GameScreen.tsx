import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import {jwtDecode} from 'jwt-decode';
import Confetti from 'react-confetti';

type Mark = 'X' | 'O' | null;

let socket: Socket | null = null;

interface Player {
  userId: number;
  username: string;
  mark: Mark;
  avatar: string;
}

export default function GameScreen() {
  const { roomId: paramRoom } = useParams<{ roomId: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  let userId: number = -1;
  let username = 'Player';

  if (token) {
    try {
      const decoded: any = jwtDecode(token);
      userId = decoded.id;
      username = decoded.username || 'Player';
    } catch (err) {
      console.error('Invalid token', err);
    }
  }

  const [board, setBoard] = useState<Mark[]>(Array(9).fill(null));
  const [yourMark, setYourMark] = useState<Mark>(null);
  const [turn, setTurn] = useState<Mark | null>(null);
  const [status, setStatus] = useState<string>('');
  const [gameOver, setGameOver] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [winner, setWinner] = useState<number | null>(null);

  const roomId = paramRoom || (location.state as any)?.roomId;

  useEffect(() => {
    if (!roomId) {
      navigate('/home');
      return;
    }

    socket = io('http://localhost:5000');

    socket.on('connect', () => {
      socket?.emit('join_room', { roomId, userId });
    });

    socket.on('room_state', (data: any) => {
      setBoard(data.board);
      setTurn(data.turn);
      setStatus(data.status);
      setGameOver(data.status === 'finished');
      setWinner(null);

      const yourPlayer = data.players.find((p: Player) => p.userId === userId);
      setYourMark(yourPlayer?.mark ?? null);

      const loadedPlayers: Player[] = data.players.map((p: any, i: number) => ({
        userId: p.userId,
        username: p.username,
        mark: p.mark,
        avatar:
          i === 0
            ? 'https://api.dicebear.com/6.x/avataaars/png?seed=astronaut'
            : 'https://api.dicebear.com/6.x/avataaars/png?seed=ninja',
      }));

      setPlayers(loadedPlayers);
    });

    socket.on('move_made', (data: any) => {
      setBoard(data.board);
      setTurn(data.turn);
    });

    socket.on('game_over', (data: any) => {
      setBoard(data.board);
      setGameOver(true);
      setWinner(data.winner);
      if (data.winner === null) setStatus('Draw');
      else if (data.winner === userId) setStatus('You won!');
      else setStatus('Better luck next time!');
    });

    socket.on('player_disconnected', () => {
      setGameOver(true);
      setStatus('Opponent disconnected!');
    });

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [roomId, navigate, userId]);

  const handleClick = (index: number) => {
    if (!socket || gameOver) return;
    if (board[index] !== null || !yourMark || turn !== yourMark) return;
    socket.emit('make_move', { roomId, userId, index });
  };

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-gradient-to-r from-gray-900 via-purple-900 to-blue-900 sm:from-black p-4 overflow-y-auto">
      <h1 className="text-2xl sm:text-3xl text-white font-bold sm:mb-6 mb-8 mt-4 animate-pulse">
        Tic-Tac-Toe Battle
      </h1>

      {/* Player Cards */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-10 mb-15 sm:mb-4 w-full justify-center">
        {players.map((p) => (
          <div
            key={p.userId}
            className={`flex flex-col items-center p-2 sm:p-3 rounded-xl shadow-lg transition-all duration-300 ${
              turn === p.mark ? 'bg-purple-700 scale-105 animate-pulse' : 'bg-black/50'
            }`}
          >
            <img
              src={p.avatar}
              alt="avatar"
              className="w-10 h-10 sm:w-16 sm:h-16 rounded-full mb-1 sm:mb-2"
            />
            <span className="text-white font-semibold text-xs sm:text-base">{p.username}</span>
            <span className="text-gray-300 text-xs">Mark: {p.mark}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            className={`w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center text-5xl sm:text-6xl font-extrabold rounded-lg shadow-2xl transition-transform duration-200 hover:scale-105 ${
              cell ? (cell === 'X' ? 'text-red-400' : 'text-blue-400') : 'text-gray-300'
            } bg-black/70`}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Turn Indicator */}
      {!gameOver && (
        <div className="sm:mb-4 mb-8 text-white text-lg sm:text-xl">
          {turn === yourMark ? 'Your turn 🔥' : "Opponent's turn"}
        </div>
      )}

      {/* Game Over Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          {winner === userId && <Confetti />}
          <div className="bg-white rounded-2xl p-6 sm:p-8 text-center shadow-2xl animate-fadeIn w-full max-w-sm">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">{status}</h2>
            {winner !== userId && <p className="text-purple-700 mb-4 animate-pulse">Let's Try Again!</p>}
            <button
              className="mt-2 px-6 py-3 bg-purple-500 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"
              onClick={() => navigate('/home')}
            >
              Back to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
}