import { Server } from 'socket.io';

export const setupSockets = (io: Server) => {
    io.on('connection', (socket) => {
        console.log('A player connected:', socket.id);

        // Optional: Listen for client-initiated events if needed
        socket.on('update-victory-points', (data) => {
            console.log('Received update-victory-points from client:', data);
            io.emit('victory-points-updated', data);
        });

        // Example: Notify when a player disconnects
        socket.on('disconnect', () => {
            console.log('A player disconnected:', socket.id);
        });
    });
};