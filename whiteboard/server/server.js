const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

// In-memory store: rooms[roomId] = { users: Map, history: [] }
const rooms = new Map();
//  'password' field add 
const getRoom = (roomId) => {
    if (!rooms.has(roomId)) {
        rooms.set(roomId, { users: new Map(), history: [], password: null });
    }
    return rooms.get(roomId);
}
const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#FF9F43',
];

function getRoom(roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, { users: new Map(), history: [] , password:null});
  }
  return rooms.get(roomId);
}

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.get('/room/:roomId/info', (req, res) => {
  const room = rooms.get(req.params.roomId);
  if (!room) return res.json({ users: 0, exists: false });
  res.json({ users: room.users.size, exists: true });
});

io.on('connection', (socket) => {
  let currentRoom = null;
  let currentUser = null;

  // ─── Join Room ────────────────────────────────────────────────
socket.on('join-room', ({ roomId, name, password }) => {
    const room = getRoom(roomId);

    // 1. Password Check Logic
    if (room.password === null) {
        // Agar room naya hai, toh jo password aaya hai use set kar do
        room.password = password || ''; 
    } else {
        // Agar room pehle se hai, toh password match hona chahiye
        if (room.password !== password) {
            socket.emit('error', '❌ Galat Password! Access Denied.');
            return; 
        }
    }

    // 2. Join karne ka purana logic
    currentRoom = roomId;
    socket.join(roomId);

    const color = USER_COLORS[room.users.size % USER_COLORS.length];
    currentUser = { id: socket.id, name, color, cursor: { x: 0, y: 0 } };
    room.users.set(socket.id, currentUser);

    // 3. History aur User list bhejna
    socket.emit('canvas-history', room.history);
    io.to(roomId).emit('users-update', Array.from(room.users.values()));

    console.log(`[${roomId}] ${name} joined. Total: ${room.users.size}`);
});

  // ─── Drawing Events ───────────────────────────────────────────
  socket.on('draw-start', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw-start', { ...data, userId: socket.id });
  });

  socket.on('draw-move', (data) => {
    if (!currentRoom) return;
    socket.to(currentRoom).emit('draw-move', { ...data, userId: socket.id });
  });

  socket.on('draw-end', (data) => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    // Persist completed strokes
    room.history.push({ type: 'stroke', ...data, userId: socket.id });
    if (room.history.length > 1000) room.history = room.history.slice(-800);
    socket.to(currentRoom).emit('draw-end', { ...data, userId: socket.id });
  });

  // ─── Clear Canvas ─────────────────────────────────────────────
  socket.on('clear-canvas', () => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    room.history = [];
    io.to(currentRoom).emit('clear-canvas');
  });

  // ─── Undo ─────────────────────────────────────────────────────
  socket.on('undo', () => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    // Remove last stroke by this user
    for (let i = room.history.length - 1; i >= 0; i--) {
      if (room.history[i].userId === socket.id) {
        room.history.splice(i, 1);
        break;
      }
    }
    // Tell everyone to re-render from history
    io.to(currentRoom).emit('canvas-history', room.history);
  });

  // ─── Cursor Move (throttled on client) ───────────────────────
  socket.on('cursor-move', ({ x, y }) => {
    if (!currentRoom || !currentUser) return;
    currentUser.cursor = { x, y };
    socket.to(currentRoom).emit('cursor-update', {
      id: socket.id,
      name: currentUser.name,
      color: currentUser.color,
      x,
      y,
    });
  });

  // ─── Image Upload ─────────────────────────────────────────────
  socket.on('image-drop', (data) => {
    if (!currentRoom) return;
    const room = getRoom(currentRoom);
    room.history.push({ type: 'image', ...data, userId: socket.id });
    socket.to(currentRoom).emit('image-drop', data);
  });

  // ─── Disconnect ───────────────────────────────────────────────
  socket.on('disconnect', () => {
    if (!currentRoom) return;
    const room = rooms.get(currentRoom);
    if (!room) return;

    room.users.delete(socket.id);
    io.to(currentRoom).emit('users-update', Array.from(room.users.values()));
    io.to(currentRoom).emit('user-left', socket.id);

    if (room.users.size === 0) {
      // Keep room history for 10 min then clean up
      setTimeout(() => {
        if (rooms.get(currentRoom)?.users.size === 0) {
          rooms.delete(currentRoom);
          console.log(`[${currentRoom}] Room cleaned up`);
        }
      }, 10 * 60 * 1000);
    }

    console.log(`[${currentRoom}] "${currentUser?.name}" left. Remaining: ${room.users.size}`);
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => console.log(`✅ Whiteboard server running on port ${PORT}`));