// src/routes/routes.ts
import { Express, Request, Response } from 'express';
import { getDatabase } from '../models/database';

export const setupRoutes = (app: Express) => {
  // Health check route
  app.get('/api/health', (req: Request, res: Response) => {
    res.status(200).send({ message: 'Server is up and running!' });
  });

  // Example endpoint for fetching game state
    app.get('/api/game-state', async (req: Request, res: Response) => {
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
    });

    app.post('/api/player/update-resources', async (req: Request, res: Response) => {
        const { playerId, points } = req.body;

    if (typeof playerId !== 'number' || typeof points !== 'number') {
      return res.status(400).send({ error: 'Invalid playerId or points' });
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
      const io = req.app.get('io');
      io.emit('victory-points-updated', { [playerId]: points });

      res.status(200).send({ message: `Victory points updated for player ${playerId}` });
    } catch (error) {
      console.error('Error updating victory points:', error);
      res.status(500).send({ error: 'Failed to update victory points' });
    }
    });
};
