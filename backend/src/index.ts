// src/index.ts
import express from 'express';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import cors from 'cors';
import { setupRoutes } from './routes/routes';
import { setupSockets } from './sockets/sockets';
import { initializeDatabase } from './models/database';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*', // Adjust for production
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Make io accessible to routes
app.set('io', io);

// Initialize Database and then set up routes and sockets
initializeDatabase()
  .then(() => {
    // Routes
    setupRoutes(app);

    // Sockets
    setupSockets(io);

    // Start Server
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  });
