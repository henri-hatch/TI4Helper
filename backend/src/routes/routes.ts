// src/routes/routes.ts
import { Application, RequestHandler, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../models/database';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import express from 'express';
const router = express.Router();

// Define Planet interface to match the database
interface Planet {
  id: number;
  name: string;
  resources: number;
  influence: number;
  legendaryAbility: string;
}

// Add new interfaces
interface ExplorationCard {
  id: number;
  name: string;
  type: string;
  subtype?: string;
  image: string;
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

      // Fetch players with their assigned planets and tapped status
      const playersData = await db.all(`
        SELECT p.*, pp.planetId, pp.tapped
        FROM players p
        LEFT JOIN player_planets pp ON p.playerId = pp.playerId
      `);

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
            tradeGoods: p.trade_goods, // Mapping from snake_case to camelCase
            victoryPoints: p.victoryPoints,
            planets: [], // This will hold planet details including 'tapped'
          };
        }
        if (p.planetId) {
          playersMap[p.playerId].planets.push({
            id: p.planetId,
            tapped: p.tapped === 1, // SQLite stores BOOLEAN as integers
            attachments: [], // Initialize attachments array
          });
        }
      });

      const players = Object.values(playersMap);

      // Fetch attachments for each planet
      for (const player of players) {
        for (const planet of player.planets) {
          const attachments = await db.all(
            `SELECT ec.*
             FROM planet_attachments pa
             JOIN exploration_cards ec ON pa.cardId = ec.id
             WHERE pa.planetId = ?`,
            planet.id
          );
          planet.attachments = attachments;
        }
      }

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

  // Update Planet Tapped Status
  const updatePlanetTapped: RequestHandler = async (req, res) => {
    const { playerId, planetId, tapped } = req.body as { playerId: string; planetId: number; tapped: boolean };

    // Validate input
    if (typeof playerId !== 'string' || typeof planetId !== 'number' || typeof tapped !== 'boolean') {
      res.status(400).send({ error: 'Invalid input data' });
      return;
    }

    try {
      const db = getDatabase();

      // Update the tapped status
      const result = await db.run(
        `UPDATE player_planets SET tapped = ? WHERE playerId = ? AND planetId = ?`,
        tapped,
        playerId,
        planetId
      );

      if (result.changes === 0) {
        res.status(404).send({ error: 'Planet assignment not found' });
        return;
      }

      res.status(200).send({ message: 'Planet tapped status updated successfully' });
    } catch (error) {
      console.error('Error updating planet tapped status:', error);
      res.status(500).send({ error: 'Failed to update planet tapped status' });
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

  // Get Exploration Cards
  const getExplorationCards: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const cards = await db.all(`SELECT * FROM exploration_cards`);
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching exploration cards:', error);
      res.status(500).json({ error: 'Failed to fetch exploration cards' });
    }
  };

  // Explore a Planet
  const explorePlanet: RequestHandler = async (req, res) => {
    const { playerId, planetId } = req.body as { playerId: string; planetId: number };

    if (typeof playerId !== 'string' || typeof planetId !== 'number') {
      res.status(400).send({ error: 'Invalid input data' });
      return;
    }

    try {
      const db = getDatabase();

      // Get planet type
      const planet = await db.get(`SELECT * FROM planets WHERE id = ?`, planetId);
      if (!planet) {
        res.status(404).send({ error: 'Planet not found' });
        return;
      }

      // Draw a random card from the corresponding deck
      const card = await db.get(
        `SELECT ec.*
         FROM exploration_deck ed
         JOIN exploration_cards ec ON ed.cardId = ec.id
         WHERE ed.type = ?
         ORDER BY RANDOM()
         LIMIT 1`,
        planet.type
      );

      if (!card) {
        res.status(404).send({ error: 'No cards left in the deck' });
        return;
      }

      // Remove the card from the deck
      await db.run(`DELETE FROM exploration_deck WHERE cardId = ?`, card.id);

      if (card.subtype === 'attach') {
        // Attach the card to the planet
        await db.run(
          `INSERT INTO planet_attachments (planetId, cardId) VALUES (?, ?)`,
          planetId,
          card.id
        );
      } else if (card.subtype === 'action' || card.subtype === 'fragment') {
        // Add the card to the player's exploration cards
        await db.run(
          `INSERT INTO player_exploration_cards (playerId, cardId) VALUES (?, ?)`,
          playerId,
          card.id
        );
      }

      res.status(200).json({ card });
    } catch (error) {
      console.error('Error exploring planet:', error);
      res.status(500).send({ error: 'Failed to explore planet' });
    }
  };

  // Get Planet Attachments
  const getPlanetAttachments: RequestHandler = async (req, res) => {
    const { planetId } = req.params;

    try {
      const db = getDatabase();
      const attachments = await db.all(
        `SELECT ec.*
         FROM planet_attachments pa
         JOIN exploration_cards ec ON pa.cardId = ec.id
         WHERE pa.planetId = ?`,
        planetId
      );
      res.status(200).json({ attachments });
    } catch (error) {
      console.error('Error fetching planet attachments:', error);
      res.status(500).send({ error: 'Failed to fetch planet attachments' });
    }
  };

  // Get Attach-Type Exploration Cards
  const getAttachTypeExplorationCards: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const cards = await db.all(
        `SELECT * FROM exploration_cards WHERE subtype = 'attach'`
      );
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching attach-type exploration cards:', error);
      res.status(500).json({ error: 'Failed to fetch attach-type exploration cards' });
    }
  };

  // Attach Cards to a Planet
  const attachCardsToPlanet: RequestHandler = async (req, res) => {
    const { planetId, cardIds } = req.body as { planetId: number; cardIds: number[] };

    if (typeof planetId !== 'number' || !Array.isArray(cardIds)) {
      res.status(400).send({ error: 'Invalid input data' });
      return;
    }

    try {
      const db = getDatabase();

      // Insert attachments with uniqueness enforced
      const insertPromises = cardIds.map((cardId) => {
        return db.run(
          `INSERT OR IGNORE INTO planet_attachments (planetId, cardId) VALUES (?, ?)`,
          planetId,
          cardId
        );
      });

      await Promise.all(insertPromises);

      res.status(200).json({ message: 'Attachments added successfully' });
    } catch (error) {
      console.error('Error attaching cards to planet:', error);
      res.status(500).send({ error: 'Failed to attach cards to planet' });
    }
  };

  // Detach Cards from a Planet
  const detachCardsFromPlanet: RequestHandler = async (req, res) => {
    const { planetId, cardIds } = req.body as { planetId: number; cardIds: number[] };

    if (typeof planetId !== 'number' || !Array.isArray(cardIds)) {
      res.status(400).send({ error: 'Invalid input data' });
      return;
    }

    try {
      const db = getDatabase();

      const deletePromises = cardIds.map((cardId) => {
        return db.run(
          `DELETE FROM planet_attachments WHERE planetId = ? AND cardId = ?`,
          planetId,
          cardId
        );
      });

      await Promise.all(deletePromises);

      res.status(200).json({ message: 'Attachments removed successfully' });
    } catch (error) {
      console.error('Error detaching cards from planet:', error);
      res.status(500).send({ error: 'Failed to detach cards from planet' });
    }
  };

  // Delete Planet
  const deletePlanet: RequestHandler = async (req, res) => {
    const { planetId } = req.body as { planetId: number };

    if (typeof planetId !== 'number') {
      res.status(400).send({ error: 'Invalid planetId' });
      return;
    }

    try {
      const db = getDatabase();

      // Delete attachments first due to foreign key constraints
      await db.run(
        `DELETE FROM planet_attachments WHERE planetId = ?`,
        planetId
      );

      // Delete planet assignments to players
      await db.run(
        `DELETE FROM player_planets WHERE planetId = ?`,
        planetId
      );

      // Delete the planet
      await db.run(
        `DELETE FROM planets WHERE id = ?`,
        planetId
      );

      res.status(200).json({ message: 'Planet deleted successfully' });
    } catch (error) {
      console.error('Error deleting planet:', error);
      res.status(500).send({ error: 'Failed to delete planet' });
    }
  };

  // Get Player's Exploration Cards
  const getPlayerExplorationCards: RequestHandler = async (req, res) => {
    const { playerId } = req.params;

    if (typeof playerId !== 'string') {
      res.status(400).send({ error: 'Invalid playerId' });
      return;
    }

    try {
      const db = getDatabase();
      const cards = await db.all(
        `SELECT ec.*
         FROM player_exploration_cards pec
         JOIN exploration_cards ec ON pec.cardId = ec.id
         WHERE pec.playerId = ?`,
        playerId
      );
      res.status(200).json({ cards });
    } catch (error) {
      console.error("Error fetching player's exploration cards:", error);
      res.status(500).send({ error: "Failed to fetch player's exploration cards" });
    }
  };

  // Remove an exploration card
  const removeExplorationCard = async (req: Request, res: Response) => {
    const { playerId, id } = req.params;
    if (!id || !playerId) {
      res.status(400).json({ error: 'A cardID or playerID is required' });
      return;
    }

    try {
      const db = getDatabase();
      const result = await db.run(`DELETE FROM exploration_cards WHERE id = ?`, id);
      if (result.changes === 0) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }
      res.status(200).json({ message: 'Exploration card removed successfully' });
    } catch (error) {
      console.error('Error removing exploration card:', error);
      res.status(500).json({ error: 'Failed to remove exploration card' });
    }
  };

  // Fetch all exploration cards by types
  const fetchExplorationCardsByType =  async (req: Request, res: Response) => {
    const { subtypes } = req.query;
    if (!subtypes || typeof subtypes !== 'string') {
      res.status(400).json({ error: 'Subtypes query parameter is required and should be a comma-separated string.' });
      return;
    }

    const subtypeArray = subtypes.split(',').map(subtype => subtype.trim());

    try {
      const db = getDatabase();
      const placeholders = subtypeArray.map(() => '?').join(',');
      const cards = await db.all(
        `SELECT * FROM exploration_cards WHERE subtype IN (${placeholders})`,
        ...subtypeArray
      );
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching exploration cards:', error);
      res.status(500).json({ error: 'Failed to fetch exploration cards.' });
    }
  };

  // Update player's exploration cards
  const updatePlayerExplorationCards: RequestHandler = async (req, res) => {
    const { playerId, cardIds } = req.body as { playerId: string; cardIds: number[] };

    if (!playerId || !Array.isArray(cardIds)) {
      res.status(400).json({ error: 'playerId and cardIds are required.' });
      return;
    }

    const db = getDatabase();
    try {
      await db.run('BEGIN TRANSACTION');

      // Delete existing exploration card assignments for the player
      await db.run('DELETE FROM player_exploration_cards WHERE playerId = ?', playerId);

      // Insert new exploration card assignments
      const insertStmt = await db.prepare('INSERT INTO player_exploration_cards (playerId, cardId) VALUES (?, ?)');
      for (const cardId of cardIds) {
        await insertStmt.run(playerId, cardId);
      }
      await insertStmt.finalize();

      await db.run('COMMIT');

      res.status(200).json({ message: 'Exploration cards updated successfully' });
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error updating player exploration cards:', error);
      res.status(500).json({ error: 'Failed to update exploration cards' });
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
  app.post('/api/player/update-tapped', updatePlanetTapped);
  app.get('/api/exploration-cards', getExplorationCards);
  app.post('/api/explore-planet', explorePlanet);
  app.get('/api/planet/:planetId/attachments', getPlanetAttachments);
  app.get('/api/exploration-cards/attach', getAttachTypeExplorationCards);
  app.post('/api/planet/attachments', attachCardsToPlanet);
  app.post('/api/planet/detach', detachCardsFromPlanet);
  app.delete('/api/planet/delete', deletePlanet);
  app.get('/api/player/:playerId/exploration-cards', getPlayerExplorationCards);
  app.delete('/api/exploration-cards/:id', removeExplorationCard);
  app.get('/api/exploration-cards-by-type', fetchExplorationCardsByType);
  app.post('/api/player/update-exploration-cards', updatePlayerExplorationCards);
};