import { Server, Socket } from 'socket.io';
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

type Mark = 'X' | 'O';
type Board = (Mark | null)[];

interface RoomState {
  roomId: string;
  sockets: { [socketId: string]: number }; // socketId -> userId
  players: { [userId: number]: Mark }; // userId -> mark
  board: Board;
  turn: Mark; // whose turn currently
  counters: {
    X: { rows: number[]; cols: number[]; diag: number; antiDiag: number };
    O: { rows: number[]; cols: number[]; diag: number; antiDiag: number };
  };
  moves: Array<{ index: number; userId: number; mark: Mark; ts: string }>;
  status: 'waiting' | 'ongoing' | 'finished';
  paused: boolean; // new field
}

const rooms: Map<string, RoomState> = new Map();
let waitingPlayer: { socketId: string; userId: number } | null = null;

export const handleSockets = (io: Server) => {
  io.on('connection', (socket: Socket) => {
    console.log('Socket connected', socket.id);

    socket.on('join_game', async (payload: { userId: number }) => {
      const { userId } = payload;
      console.log(`user ${userId} join_game`);

      if (!waitingPlayer) {
        waitingPlayer = { socketId: socket.id, userId };
        socket.emit('waiting', { message: 'Waiting for opponent...' });
        return;
      }

      // pair with waiting player
      const opponent = waitingPlayer;
      waitingPlayer = null;

      // create room
      const roomId = `room-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

      // create DB game row (status ongoing)
      const dbGame = await prisma.game.create({
        data: {
          roomId,
          playerXId: opponent.userId,
          playerOId: userId,
          status: 'ongoing',
        },
      });

      // initialize RoomState
      const roomState: RoomState = {
        roomId,
        sockets: {},
        players: {},
        board: Array(9).fill(null),
        turn: 'X', // X starts
        counters: {
          X: { rows: [0, 0, 0], cols: [0, 0, 0], diag: 0, antiDiag: 0 },
          O: { rows: [0, 0, 0], cols: [0, 0, 0], diag: 0, antiDiag: 0 },
        },
        moves: [],
        status: 'ongoing',
        paused: false,
      };

      // Map players => marks. convention: waiting/opponent is X, joining is O
      roomState.players[opponent.userId] = 'X';
      roomState.players[userId] = 'O';

      // join sockets
      socket.join(roomId);
      const waitingSocket = io.sockets.sockets.get(opponent.socketId);
      if (waitingSocket) {
        waitingSocket.join(roomId);
        // record sockets
        roomState.sockets[opponent.socketId] = opponent.userId;
      }
      roomState.sockets[socket.id] = userId;

      rooms.set(roomId, roomState);

      // notify both clients
      io.to(roomId).emit('game_started', {
        roomId,
        players: [
          { userId: opponent.userId, mark: 'X' },
          { userId, mark: 'O' },
        ],
        board: roomState.board,
        turn: roomState.turn,
        gameId: dbGame.id,
      });
    });

    // authoritative move handling
    socket.on(
      'make_move',
      async (payload: { roomId: string; userId: number; index: number }) => {
        const { roomId, userId, index } = payload;
        const state = rooms.get(roomId);
        if (!state) {
          socket.emit('error_msg', { message: 'Room not found' });
          return;
        }
        if (state.status !== 'ongoing') {
          socket.emit('error_msg', { message: 'Game already finished' });
          return;
        }
        // verify user in game and mark
        const playerMark = state.players[userId];
        if (!playerMark) {
          socket.emit('error_msg', {
            message: 'You are not a player in this game',
          });
          return;
        }
        // check turn
        if (state.turn !== playerMark) {
          socket.emit('error_msg', { message: 'Not your turn' });
          return;
        }
        // validate index
        if (index < 0 || index > 8 || state.board[index] !== null) {
          socket.emit('error_msg', { message: 'Invalid move' });
          return;
        }

        // apply move
        state.board[index] = playerMark;
        state.moves.push({
          index,
          userId,
          mark: playerMark,
          ts: new Date().toISOString(),
        });

        // update counters for O(1) check
        const r = Math.floor(index / 3);
        const c = index % 3;
        const counters = state.counters[playerMark];
        counters.rows[r] += 1;
        counters.cols[c] += 1;
        if (r === c) counters.diag += 1;
        if (r + c === 2) counters.antiDiag += 1;

        // check win
        const winThreshold = 3;
        let winner: number | null = null;
        if (
          counters.rows[r] === winThreshold ||
          counters.cols[c] === winThreshold ||
          counters.diag === winThreshold ||
          counters.antiDiag === winThreshold
        ) {
          // current player wins
          state.status = 'finished';
          // winner userId is the player who played now
          winner = userId;
        } else {
          // check draw: no nulls left
          if (!state.board.includes(null)) {
            state.status = 'finished';
            winner = null; // draw
          }
        }

        // switch turn if game continues
        if (state.status === 'ongoing') {
          state.turn = state.turn === 'X' ? 'O' : 'X';
        }

        // broadcast move to room
        io.to(roomId).emit('move_made', {
          board: state.board,
          lastMove: { index, userId, mark: playerMark },
          turn: state.turn,
        });

        if (state.status === 'finished') {
          // update DB game: set moves JSON and winnerId and status
          try {
            const dbUpdateData: any = {
              moves: state.moves,
              status: 'finished',
            };
            if (winner) dbUpdateData.winnerId = winner;

            await prisma.game.update({
              where: { roomId },
              data: dbUpdateData,
            });
          } catch (err) {
            console.error('Error persisting finished game:', err);
          }

          // notify game over
          io.to(roomId).emit('game_over', {
            winner: winner, // userId or null for draw
            board: state.board,
            moves: state.moves,
          });

          // optionally remove room state after some delay or keep for history
          setTimeout(() => rooms.delete(roomId), 1000 * 60 * 5); // keep 5min
        }
      }
    );

    // allow clients to join an existing room socket namespace for move updates if reconnecting
    socket.on('join_room', (payload: { roomId: string; userId: number }) => {
      const { roomId, userId } = payload;
      const state = rooms.get(roomId);
      if (!state) {
        socket.emit('error_msg', { message: 'Room not found' });
        return;
      }

      // allow join only if user is one of players (or spectator later)
      if (!state.players[userId]) {
        socket.emit('error_msg', { message: 'You are not a player' });
        return;
      }

      socket.join(roomId);
      state.sockets[socket.id] = userId;

      // send current state
      socket.emit('room_state', {
        board: state.board,
        turn: state.turn,
        players: state.players,
        moves: state.moves,
        status: state.status,
      });
    });

    socket.on('disconnect', () => {
      // cleanup waiting player if needed
      if (waitingPlayer?.socketId === socket.id) waitingPlayer = null;

      // optionally remove socket from any room state.sockets
      for (const [roomId, state] of rooms.entries()) {
        const playerId = state.sockets[socket.id];
        if (playerId) {
          delete state.sockets[socket.id];
          if (state.status === 'ongoing') {
            state.paused = true;
            socket.to(roomId).emit('player_disconnected', {
              playerId,
              message: 'Your opponent disconnected',
            });
          }
        }
      }
    });
  });
};
