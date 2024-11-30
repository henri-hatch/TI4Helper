// src/routes/routes.ts
import { Application, RequestHandler, Request, Response } from 'express';
import { getDatabase } from '../models/database';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';

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
      const victoryPoints: Record<string, number> = {};

      players.forEach((player: any) => {
        victoryPoints[player.playerId] = player.victoryPoints;
      });

      res.status(200).json({ players, objectives, victoryPoints });
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).send({ error: 'Failed to fetch game state' });
      return; // Ensure the function exits
    }
  };

  // Update Victory Points
  const updateVictoryPoints: RequestHandler = async (req, res) => {
    const { playerId, points } = req.body as { playerId: string; points: number };

    // Validate input
    if (typeof playerId !== 'string' || typeof points !== 'number') {
      res.status(400).send({ error: 'Invalid playerId or points' });
      return; // Exit after sending error
    }

    try {
      const db = getDatabase();

      // Update in database
      const result = await db.run(
        `UPDATE players SET victoryPoints = ? WHERE playerId = ?`,
        points,
        playerId
      );

      // Check if the update was successful
      if (result.changes === 0) {
        res.status(404).send({ error: `Player with ID ${playerId} not found` });
        return;
      }

      // Fetch the updated victory points
      const updatedPlayer = await db.get(`SELECT victoryPoints FROM players WHERE playerId = ?`, playerId);
      const updatedPointsRecord: Record<string, number> = {
        [playerId]: updatedPlayer.victoryPoints,
      };

      // Emit the update via Socket.io
      const io: Server = req.app.get('io');
      io.emit('victory-points-updated', updatedPointsRecord);
      console.log('Emitted victory-points-updated:', updatedPointsRecord);

      res.status(200).send({ message: `Victory points updated for player ${playerId}` });
    } catch (error) {
      console.error('Error updating victory points:', error);
      res.status(500).send({ error: 'Failed to update victory points' });
    }
  };

  // Register Player (Join Game)
  const registerPlayer: RequestHandler = async (req, res) => {
    const { name } = req.body as { name: string };

    // Validate input
    if (typeof name !== 'string' || name.trim() === '') {
      res.status(400).send({ error: 'Invalid player name' });
      return; // Ensure the function exits
    }

    const playerId = uuidv4();
    const trimmedName = name.trim();

    try {
      const db = getDatabase();

      // Check if player name already exists
      const existingPlayer = await db.get(`SELECT * FROM players WHERE name = ?`, trimmedName);
      if (existingPlayer) {
        res.status(409).send({ error: 'Player name already exists' });
        return;
      }

      // Insert new player
      await db.run(
        `INSERT INTO players (playerId, name) VALUES (?, ?)`,
        playerId,
        trimmedName
      );

      // Initialize victoryPoints to 0
      await db.run(
        `UPDATE players SET victoryPoints = 0 WHERE playerId = ?`,
        playerId
      );

      // Fetch the newly created player data
      const newPlayer = await db.get(`SELECT * FROM players WHERE playerId = ?`, playerId);

      // Emit the 'player-joined' event with the new player's data
      const io: Server = req.app.get('io');
      io.emit('player-joined', newPlayer);
      console.log('Emitted player-joined:', newPlayer);

      res.status(201).json({ playerId, name: trimmedName });
    } catch (error) {
      console.error('Error registering player:', error);
      if ((error as any).code === 'SQLITE_CONSTRAINT') {
        res.status(409).send({ error: 'Player name already exists' });
      } else {
        res.status(500).send({ error: 'Failed to register player' });
      }
    }
  };

  // Register routes
  app.get('/api/health', healthCheck);
  app.get('/api/game-state', fetchGameState);
  app.post('/api/victory-points/update', updateVictoryPoints);
  app.post('/api/player/join', registerPlayer);
};