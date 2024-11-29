// frontend/src/services/socket.ts
import { io } from 'socket.io-client';

const SOCKET_SERVER_URL = 'http://localhost:5000'; // Update if different

const socket = io(SOCKET_SERVER_URL, {
  transports: ['websocket'], // Optional: Specify transport to ensure WebSocket is used
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Connected to Socket.io server:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err);
});

export default socket;