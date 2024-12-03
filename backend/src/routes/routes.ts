// src/routes/routes.ts
import { Application, RequestHandler, Request, Response } from 'express';
import { getDatabase } from '../models/database';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';

// Define Planet interface to match the database
interface Planet {
  id: number;
  name: string;
  resources: number;
  influence: number;
  legendaryAbility: string;
}

export const setupRoutes = (app: Application) => {
  // Health check route
  const healthCheck: RequestHandler = (req, res) => {
    res.status(200).send({ message: 'Server is up and running!' });
  };

  // Fetch game state
  const fetchGameState: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();

      // Fetch players with their assigned planets
      const playersData = await db.all(`
        SELECT p.*, pp.planetId
        FROM players p
        LEFT JOIN player_planets pp ON p.playerId = pp.playerId
      `);

      // Map players to include an array of planetIds
      const playersMap: Record<string, any> = {};

      playersData.forEach((p) => {
        if (!playersMap[p.playerId]) {
          playersMap[p.playerId] = {
            id: p.id,
            playerId: p.playerId,
            name: p.name,
            resources: p.resources,
            influence: p.influence,
            commodities: p.commodities,
            tradeGoods: p.trade_goods, // Note the mapping from snake_case to camelCase
            victoryPoints: p.victoryPoints,
            planets: [],
          };
        }
        if (p.planetId) {
          playersMap[p.playerId].planets.push(p.planetId);
        }
      });

      const players = Object.values(playersMap);

      // Fetch objectives
      const objectives = await db.all(`SELECT * FROM objectives`);

      // Calculate victoryPoints
      const victoryPoints: Record<string, number> = {};
      players.forEach((p: any) => {
        victoryPoints[p.playerId] = p.victoryPoints;
      });

      res.status(200).json({ players, objectives, victoryPoints });
    } catch (error) {
      console.error('Error fetching game state:', error);
      res.status(500).send({ error: 'Failed to fetch game state' });
    }
  };

  // Update Victory Points
  const updateVictoryPoints: RequestHandler = async (req, res) => {
    const { playerId, points } = req.body as { playerId: string; points: number };

    // Validate input
    if (typeof playerId !== 'string' || typeof points !== 'number') {
      res.status(400).send({ error: 'Invalid playerId or points' });
      return;
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

    const trimmedName = name.trim();

    try {
      const db = getDatabase();

      // Check if player name already exists
      const existingPlayer = await db.get(`SELECT * FROM players WHERE name = ?`, trimmedName);
      if (existingPlayer) {
        res.status(409).json({ error: 'Player name already exists', player: existingPlayer });
        return;
      }

      const playerId = uuidv4();

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
        res.status(409).json({ error: 'Player name already exists' });
      } else {
        res.status(500).json({ error: 'Failed to register player' });
      }
    }
  };

  // Get Local IPs
  const getLocalIPs: RequestHandler = (req, res) => {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    for (let name of Object.keys(interfaces)) {
      for (let iface of interfaces[name]!) {
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    res.status(200).json({ ips: addresses });
  };

  // Get All Planets
  const getPlanets: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const planets = await db.all(`SELECT * FROM planets`);
      res.status(200).json({ planets });
    } catch (error) {
      console.error('Error fetching planets:', error);
      res.status(500).json({ error: 'Failed to fetch planets' });
    }
  };

  // Assign Planets to a Player
  const assignPlanetsToPlayer: RequestHandler = async (req, res) => {
    const { playerId, planetIds } = req.body as { playerId: string; planetIds: number[] };

    console.log('Received assignPlanetsToPlayer request:', { playerId, planetIds });

    // Validate input
    if (typeof playerId !== 'string' || !Array.isArray(planetIds)) {
      console.error('Invalid playerId or planetIds:', { playerId, planetIds });
      res.status(400).send({ error: 'Invalid playerId or planetIds' });
      return;
    }

    try {
      const db = getDatabase();

      // Remove all existing planet assignments for the player
      const deleteResult = await db.run(`DELETE FROM player_planets WHERE playerId = ?`, playerId);
      console.log(`Deleted ${deleteResult.changes} existing planet assignments for playerId: ${playerId}`);

      // Assign new planets
      const insertPromises = planetIds.map(planetId => {
        console.log(`Assigning planetId: ${planetId} to playerId: ${playerId}`);
        return db.run(
          `INSERT INTO player_planets (playerId, planetId, tapped) VALUES (?, ?, ?)`,
          playerId,
          planetId,
          false
        );
      });

      const insertResults = await Promise.all(insertPromises);
      insertResults.forEach((result, index) => {
        console.log(`Inserted planetId: ${planetIds[index]} for playerId: ${playerId}`);
      });

      res.status(200).send({ message: 'Planets assigned to player successfully' });
    } catch (error) {
      console.error('Error assigning planets to player:', error);
      res.status(500).send({ error: 'Failed to assign planets to player' });
    }
  };

  // Register routes
  app.get('/api/health', healthCheck);
  app.get('/api/game-state', fetchGameState);
  app.post('/api/victory-points/update', updateVictoryPoints);
  app.post('/api/player/join', registerPlayer);
  app.get('/api/get-ip', getLocalIPs);
  app.get('/api/planets', getPlanets);
  app.post('/api/player/assign-planets', assignPlanetsToPlayer);
};