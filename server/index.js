import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { cors: { origin: '*' } });
const MAPS = ['classroom', 'hallway', 'playground'];
const rooms = new Map();

const speed = 9;
const passRange = 190;

function code() { return Math.random().toString(36).slice(2, 7).toUpperCase(); }
function alivePlayers(room) { return Object.values(room.players).filter((p) => p.alive); }

function startRound(room) {
  room.mapId = MAPS[Math.floor(Math.random() * MAPS.length)];
  room.timer = 12;
  room.finished = false;
  const alive = alivePlayers(room);
  if (alive.length < 2) return;
  room.ballHolderId = alive[Math.floor(Math.random() * alive.length)].id;
}

function sync(room) { io.to(room.id).emit('room:update', room); }

io.on('connection', (socket) => {
  socket.on('room:create', ({ nickname }) => {
    const id = code();
    const room = { id, host: socket.id, mapId: 'classroom', timer: 12, ballHolderId: null, players: {}, rankings: [], finished: false };
    rooms.set(id, room);
    socket.join(id);
    room.players[socket.id] = { id: socket.id, nickname, x: 300, y: 300, alive: true };
    startRound(room); sync(room);
  });

  socket.on('room:join', ({ nickname, roomCode }) => {
    const room = rooms.get(roomCode);
    if (!room || Object.keys(room.players).length >= 8) return;
    socket.join(room.id);
    room.players[socket.id] = { id: socket.id, nickname, x: 300 + Math.random() * 600, y: 300 + Math.random() * 300, alive: true };
    if (!room.ballHolderId) startRound(room);
    sync(room);
  });

  socket.on('player:move', ({ x, y }) => {
    const room = [...rooms.values()].find((r) => r.players[socket.id]);
    if (!room) return;
    const p = room.players[socket.id];
    if (!p?.alive) return;
    p.x = Math.max(40, Math.min(1760, p.x + x * speed));
    p.y = Math.max(40, Math.min(960, p.y + y * speed));
  });

  socket.on('ball:pass', () => {
    const room = [...rooms.values()].find((r) => r.players[socket.id]);
    if (!room || room.ballHolderId !== socket.id) return;
    const me = room.players[socket.id];
    const target = alivePlayers(room)
      .filter((p) => p.id !== me.id)
      .find((p) => Math.hypot(p.x - me.x, p.y - me.y) <= passRange);
    if (target) room.ballHolderId = target.id;
    sync(room);
  });

  socket.on('disconnect', () => {
    rooms.forEach((room) => {
      if (!room.players[socket.id]) return;
      delete room.players[socket.id];
      if (room.ballHolderId === socket.id) room.ballHolderId = alivePlayers(room)[0]?.id;
      sync(room);
    });
  });
});

setInterval(() => {
  rooms.forEach((room) => {
    if (room.finished || !room.ballHolderId) return;
    room.timer -= 1;
    if (room.timer <= 0) {
      const out = room.players[room.ballHolderId];
      if (out) {
        out.alive = false;
        room.rankings.unshift({ id: out.id, nickname: out.nickname });
      }
      const alive = alivePlayers(room);
      if (alive.length <= 1) {
        if (alive[0]) room.rankings.unshift({ id: alive[0].id, nickname: alive[0].nickname });
        io.to(room.id).emit('round:end', { rankings: room.rankings });
        room.finished = true;
      } else {
        room.timer = 12;
        room.ballHolderId = alive[Math.floor(Math.random() * alive.length)].id;
      }
    }
    sync(room);
  });
}, 1000);

app.get('/', (_, res) => res.send('School Pass Panic server running'));
httpServer.listen(3001, () => console.log('Server on http://localhost:3001'));
