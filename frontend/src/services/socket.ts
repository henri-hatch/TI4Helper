import { io, Socket } from 'socket.io-client';

const socket: Socket = io('http://localhost:5000');

// Example: Listen for victory point updates
socket.on('victory-points-updated', (data) => {
    console.log('Victory points updated:', data);
});

export default socket;

// Example: Emit a victory point update
export const updateVictoryPoints = (data: { playerId: number, points: number }) => {
    socket.emit('update-victory-points', data);
};