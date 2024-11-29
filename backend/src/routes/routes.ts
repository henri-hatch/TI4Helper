// src/routes/routes.ts
import { Application, RequestHandler, Request, Response } from 'express';
import { getDatabase } from '../models/database';
import { Server } from 'socket.io';

export const setupRoutes = (app: Application) => {
  // Health check route
  const healthCheck: RequestHandler = (req, res) => {
    res.status(200).send({ message: 'Server is up and running!' });
  };

  // Fetch game state
  const fetchGameState: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const players = await db.all(`SELECT * FROM players`);
      const objectives = await db.all(`SELECT * FROM objectives`);
      const victoryPoints: Record<number, number> = {};

      players.forEach((player: any) => {
        victoryPoints[player.id] = player.victoryPoints;
      });

      res.status(200).json({ players, objectives, victoryPoints });
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).send({ error: 'Failed to fetch game state' });
    }
  };

  // Update Victory Points
  const updateVictoryPoints = async (req: Request, res: Response) => {
    const { playerId, points } = req.body as { playerId: number; points: number };

    if (typeof playerId !== 'number' || typeof points !== 'number') {
      res.status(400).send({ error: 'Invalid playerId or points' });
    }

    try {
      const db = getDatabase();

      // Update in database
      await db.run(
        `UPDATE players SET victoryPoints = ? WHERE id = ?`,
        points,
        playerId
      );

      // Emit the update via Socket.io
      const io: Server = req.app.get('io');
      io.emit('victory-points-updated', { [playerId]: points });

      res.status(200).send({ message: `Victory points updated for player ${playerId}` });
    } catch (error) {
      console.error('Error updating victory points:', error);
      res.status(500).send({ error: 'Failed to update victory points' });
    }
  };

  // Register routes
  app.get('/api/health', healthCheck);
  app.get('/api/game-state', fetchGameState);
  app.post('/api/victory-points/update', updateVictoryPoints);
};
