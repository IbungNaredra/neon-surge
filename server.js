'use strict';

const http = require('http');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const MAX_ROOMS = parseInt(process.env.MAX_ROOMS || '100', 10);
const MAX_PLAYERS_PER_ROOM = parseInt(process.env.MAX_PLAYERS_PER_ROOM || '4', 10);
const ROOM_TTL_MINUTES = parseInt(process.env.ROOM_TTL_MINUTES || '30', 10);
const ROOM_TTL_MS = ROOM_TTL_MINUTES * 60 * 1000;

/** @type {Record<string, { hostSocket: import('ws').WebSocket | null, players: { id: string, name: string, socket: import('ws').WebSocket }[], lastActivity: number, createdAt: number }>} */
const rooms = {};

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  if (rooms[code]) return generateRoomCode();
  return code;
}

function touchRoom(code) {
  if (rooms[code]) rooms[code].lastActivity = Date.now();
}

function broadcastRoom(code, payload, exceptSocket = null) {
  const room = rooms[code];
  if (!room) return;
  const raw = typeof payload === 'string' ? payload : JSON.stringify(payload);
  for (const p of room.players) {
    if (p.socket !== exceptSocket && p.socket.readyState === 1) {
      p.socket.send(raw);
    }
  }
}

function removePlayerFromRooms(ws) {
  for (const code in rooms) {
    const room = rooms[code];
    const idx = room.players.findIndex((p) => p.socket === ws);
    if (idx === -1) continue;
    const removed = room.players.splice(idx, 1)[0];
    touchRoom(code);
    if (room.players.length === 0) {
      delete rooms[code];
      continue;
    }
    if (room.hostSocket === ws) {
      const next = room.players[0];
      room.hostSocket = next.socket;
      broadcastRoom(code, {
        type: 'HOST_MIGRATION',
        newHostId: next.id,
      });
    }
    broadcastRoom(code, {
      type: 'PLAYER_LEFT',
      playerId: removed.id,
      playerList: room.players.map((x) => ({ id: x.id, name: x.name })),
    });
    break;
  }
}

setInterval(() => {
  const now = Date.now();
  for (const code of Object.keys(rooms)) {
    if (now - rooms[code].lastActivity > ROOM_TTL_MS) {
      const room = rooms[code];
      for (const p of room.players) {
        try {
          p.socket.close();
        } catch (_) {}
      }
      delete rooms[code];
    }
  }
}, 5 * 60 * 1000);

const server = http.createServer((req, res) => {
  if (req.url === '/health' || req.url === '/health/') {
    res.writeHead(200);
    res.end('OK');
    return;
  }
  res.writeHead(404);
  res.end();
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  /** @type {string | null} */
  let roomCode = null;

  ws.on('message', (raw) => {
    let msg;
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'CREATE_ROOM') {
      if (Object.keys(rooms).length >= MAX_ROOMS) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Server room limit reached' }));
        return;
      }
      const code = generateRoomCode();
      rooms[code] = {
        hostSocket: ws,
        players: [
          {
            id: msg.playerId || 'p1',
            name: msg.playerName || 'Player 1',
            socket: ws,
          },
        ],
        lastActivity: Date.now(),
        createdAt: Date.now(),
      };
      roomCode = code;
      ws.send(JSON.stringify({ type: 'ROOM_CREATED', roomCode: code }));
      return;
    }

    if (msg.type === 'JOIN_ROOM') {
      const code = (msg.roomCode || '').toUpperCase().trim();
      const room = rooms[code];
      if (!room) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Invalid room code' }));
        return;
      }
      if (room.players.length >= MAX_PLAYERS_PER_ROOM) {
        ws.send(JSON.stringify({ type: 'ERROR', message: 'Room is full' }));
        return;
      }
      const id = msg.playerId || `p${room.players.length + 1}`;
      room.players.push({
        id,
        name: msg.playerName || `Player ${room.players.length + 1}`,
        socket: ws,
      });
      roomCode = code;
      touchRoom(code);
      broadcastRoom(code, {
        type: 'PLAYER_JOINED',
        playerList: room.players.map((p) => ({ id: p.id, name: p.name })),
      });
      ws.send(
        JSON.stringify({
          type: 'JOINED_ROOM',
          roomCode: code,
          assignedId: id,
          playerList: room.players.map((p) => ({ id: p.id, name: p.name })),
        }),
      );
      return;
    }

    const code = msg.roomCode || roomCode;
    if (!code || !rooms[code]) return;
    touchRoom(code);

    const relayTypes = new Set([
      'GAME_START',
      'INPUT',
      'GAME_STATE',
      'PLAYER_DOWN',
      'PLAYER_REVIVED',
      'WAVE_CLEAR',
      'UPGRADE_CHOSEN',
      'GAME_OVER',
      'UPGRADE_CONFIRM',
      'BOSS_EVENT',
    ]);
    if (relayTypes.has(msg.type)) {
      broadcastRoom(code, msg, ws);
      return;
    }

    broadcastRoom(code, msg, ws);
  });

  ws.on('close', () => {
    removePlayerFromRooms(ws);
  });
});

server.listen(PORT, () => {
  console.log(`NEON SURGE relay listening on ${PORT}`);
});
