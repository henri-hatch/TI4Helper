// frontend/src/services/socket.ts
import { io } from 'socket.io-client';

// Dynamically set the Socket.io server URL based on the current window location
const BACKEND_PORT = '5000'; // Ensure this matches your backend's port
const BACKEND_HOST = window.location.hostname; // Automatically uses the current host
const SOCKET_SERVER_URL = `${window.location.protocol}//${BACKEND_HOST}:${BACKEND_PORT}`;

const socket = io(SOCKET_SERVER_URL, {
  transports: ['websocket'], // Specify transport to ensure WebSocket is used
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Connected to Socket.io server:', socket.id);
});

socket.on('connect_error', (err) => {
  console.error('Socket connection error:', err);
});

export default socket;