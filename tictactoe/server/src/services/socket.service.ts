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
          {
            userId: opponent.userId,
            mark: 'X',
            username: (
              await prisma.user.findUnique({ where: { id: opponent.userId } })
            )?.username,
          },
          {
            userId,
            mark: 'O',
            username: (await prisma.user.findUnique({ where: { id: userId } }))
              ?.username,
          },
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
          try {
            const dbUpdateData: any = {
              moves: state.moves,
              status: 'finished',
            };
            if (winner) dbUpdateData.winnerId = winner;

            const game = await prisma.game.update({
              where: { roomId },
              data: dbUpdateData,
            });

            // ---- Update stats ----
            if (winner) {
              // winner gets +1 win
              await prisma.userStats.upsert({
                where: { userId: winner },
                update: { wins: { increment: 1 } },
                create: { userId: winner, wins: 1 },
              });

              // loser gets +1 loss
              const loserId =
                game.playerXId === winner ? game.playerOId : game.playerXId;
              if (loserId) {
                await prisma.userStats.upsert({
                  where: { userId: loserId },
                  update: { losses: { increment: 1 } },
                  create: { userId: loserId, losses: 1 },
                });
              }
            } else {
              // draw → both get +1 draw
              await prisma.userStats.upsert({
                where: { userId: game.playerXId },
                update: { draws: { increment: 1 } },
                create: { userId: game.playerXId, draws: 1 },
              });
              if (game.playerOId) {
                await prisma.userStats.upsert({
                  where: { userId: game.playerOId },
                  update: { draws: { increment: 1 } },
                  create: { userId: game.playerOId, draws: 1 },
                });
              }
            }

            // ---- Notify leaderboard update ----
            io.emit('leaderboard_update');
          } catch (err) {
            console.error('Error persisting finished game/stats:', err);
          }

          // notify game over
          io.to(roomId).emit('game_over', {
            winner,
            board: state.board,
            moves: state.moves,
          });

          setTimeout(() => rooms.delete(roomId), 1000 * 60 * 5);
        }
      }
    );

    // allow clients to join an existing room socket namespace for move updates if reconnecting
    socket.on(
      'join_room',
      async (payload: { roomId: string; userId: number }) => {
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

        // fetch usernames for all players in this room
        const playerData = await Promise.all(
          Object.keys(state.players).map(async (idStr) => {
            const id = parseInt(idStr);
            const user = await prisma.user.findUnique({ where: { id } });
            return {
              userId: id,
              mark: state.players[id],
              username: user?.username || `Player ${id}`,
            };
          })
        );

        socket.emit('room_state', {
          board: state.board,
          turn: state.turn,
          players: playerData, // send array with username, userId, mark
          moves: state.moves,
          status: state.status,
        });
      }
    );

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
