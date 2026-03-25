import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';

export function useSocket(roomId, userName) {
  const socketRef = useRef(null);
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    if (!roomId || !userName) return;

    const socket = io(SERVER_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-room', { roomId, name: userName });
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('users-update', (userList) => setUsers(userList));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomId, userName]);

  return { socket: socketRef.current, connected, users };
}