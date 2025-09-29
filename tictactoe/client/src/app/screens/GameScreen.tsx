import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { io, Socket } from 'socket.io-client';
import { jwtDecode } from 'jwt-decode';

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
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);

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

      // find your mark from the array
      const yourPlayer = data.players.find((p: Player) => p.userId === userId);
      setYourMark(yourPlayer?.mark ?? null);

      // map players to include avatar
      const loadedPlayers: Player[] = data.players.map((p: any) => ({
        userId: p.userId,
        username: p.username,
        mark: p.mark,
        avatar: `https://i.pravatar.cc/50?u=${p.userId}`,
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
      if (data.winner === null) setStatus('Draw');
      else if (data.winner === userId) setStatus('You won!');
      else setStatus('You lost');
    });

    socket.on('player_disconnected', (data: { userId: number }) => {
      setOpponentDisconnected(true);
      setGameOver(true);
      setStatus('Opponent disconnected!');
    });

    socket.on('error_msg', (err: any) =>
      console.warn('Server error:', err.message)
    );

    return () => {
      socket?.disconnect();
      socket = null;
    };
  }, [roomId, navigate, userId, username]);

  const handleClick = (index: number) => {
    if (!socket || gameOver) return;
    if (board[index] !== null || !yourMark || turn !== yourMark) return;
    socket.emit('make_move', { roomId, userId, index });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-r from-black via-purple-900 to-blue-900 p-4">
      <h1 className="text-4xl text-white font-bold mb-8 animate-pulse">
        Tic-Tac-Toe Battle
      </h1>

      {/* Player Cards */}
      <div className="flex gap-6 mb-6">
        {players.map((p) => (
          <div
            key={p.userId}
            className={`flex flex-col items-center p-4 rounded-xl shadow-lg transition-all duration-300 ${
              turn === p.mark
                ? 'bg-purple-700 scale-105 animate-pulse'
                : 'bg-black/50'
            }`}
          >
            <img
              src={p.avatar}
              alt="avatar"
              className="w-12 h-12 rounded-full mb-2"
            />
            <span className="text-white font-bold">{p.username}</span>
            <span className="text-gray-300">Mark: {p.mark}</span>
          </div>
        ))}
      </div>

      {/* Board */}
      <div className="grid grid-cols-3 gap-4">
        {board.map((cell, idx) => (
          <button
            key={idx}
            onClick={() => handleClick(idx)}
            className={`w-28 h-28 flex items-center justify-center text-5xl font-extrabold rounded-lg shadow-2xl transition-transform duration-200 hover:scale-110 ${
              cell
                ? cell === 'X'
                  ? 'text-red-400'
                  : 'text-blue-400'
                : 'text-gray-300'
            } bg-black/70`}
          >
            {cell}
          </button>
        ))}
      </div>

      {/* Turn Indicator */}
      {!gameOver && (
        <div className="mt-6 text-white text-xl">
          {turn === yourMark ? 'Your turn' : "Opponent's turn"}
        </div>
      )}

      {/* Game Over / Disconnect Modal */}
      {gameOver && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-8 text-center shadow-2xl animate-fadeIn">
            <h2 className="text-3xl font-bold mb-4">{status}</h2>
            <button
              className="mt-4 px-6 py-3 bg-purple-500 text-white rounded-xl shadow-lg hover:scale-105 transition-transform"
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
