// src/routes/routes.ts
import { Application, RequestHandler, Request, Response, NextFunction } from 'express';
import { getDatabase } from '../models/database';
import { Server } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import os from 'os';
import express from 'express';

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

  // Fetch all strategy cards
  const fetchAllStrategyCards: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const cards = await db.all(`SELECT * FROM strategy_cards`);
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching strategy cards:', error);
      res.status(500).json({ error: 'Failed to fetch strategy cards.' });
    }
  };

  // Fetch player's strategy cards
  const fetchPlayerStrategyCardsHandler: RequestHandler = async (req, res) => {
    const { playerId } = req.params;
    try {
      const db = getDatabase();
      const cards = await db.all(`
        SELECT sc.* FROM strategy_cards sc
        INNER JOIN player_strategy_cards psc ON sc.id = psc.cardId
        WHERE psc.playerId = ?
      `, [playerId]);
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching player strategy cards:', error);
      res.status(500).json({ error: 'Failed to fetch player strategy cards' });
    }
  };

  // Update player's strategy cards
  const updatePlayerStrategyCardsHandler: RequestHandler = async (req, res) => {
    const { playerId, cardIds } = req.body as { playerId: string; cardIds: number[] };
    
    if (!playerId || !Array.isArray(cardIds)) {
      res.status(400).json({ error: 'Invalid input data' });
      return;
    }

    const db = getDatabase();
    try {
      await db.run('BEGIN TRANSACTION');

      // Delete existing strategy cards for the player
      await db.run(`DELETE FROM player_strategy_cards WHERE playerId = ?`, [playerId]);

      // Insert new strategy cards
      const insertStmt = await db.prepare(`INSERT INTO player_strategy_cards (playerId, cardId) VALUES (?, ?)`);
      for (const cardId of cardIds) {
        await insertStmt.run(playerId, cardId);
      }
      await insertStmt.finalize();

      await db.run('COMMIT');
      res.status(200).json({ message: 'Strategy cards updated successfully' });
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error updating player strategy cards:', error);
      res.status(500).json({ error: 'Failed to update player strategy cards' });
    }
  };

  // Update trade good count for a strategy card
  const updateStrategyCardTradeGood: RequestHandler = async (req, res) => {
    const { cardId, increment } = req.body as { cardId: number; increment: boolean };

    if (typeof cardId !== 'number' || typeof increment !== 'boolean') {
      res.status(400).json({ error: 'Invalid input data.' });
      return;
    }

    const db = getDatabase();

    try {
      const card = await db.get(`SELECT tradeGoodCount FROM strategy_cards WHERE id = ?`, cardId);
      if (!card) {
        res.status(404).json({ error: 'Strategy card not found.' });
        return;
      }

      const newCount = increment ? card.tradeGoodCount + 1 : Math.max(card.tradeGoodCount - 1, 0);
      await db.run(`UPDATE strategy_cards SET tradeGoodCount = ? WHERE id = ?`, newCount, cardId);

      // Emit socket event for live updates
      const io: Server = req.app.get('io');
      io.emit('tradeGoodUpdated', { cardId, tradeGoodCount: newCount });

      res.status(200).json({ cardId, tradeGoodCount: newCount });
    } catch (error) {
      console.error('Error updating trade good count:', error);
      res.status(500).json({ error: 'Failed to update trade good count.' });
    }
  };

  // Fetch all action cards
  const fetchAllActionCards: RequestHandler = async (req, res) => {
    try {
      const db = await getDatabase();
      const cards = await db.all(`SELECT * FROM action_cards`);
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching action cards:', error);
      res.status(500).json({ error: 'Failed to fetch action cards.' });
    }
  };

  // Fetch player's action cards
  const fetchPlayerActionCardsHandler: RequestHandler = async (req, res) => {
    const { playerId } = req.params;

    try {
      const db = await getDatabase();
      const cards = await db.all(
        `SELECT ac.*
         FROM player_action_cards pac
         JOIN action_cards ac ON pac.cardId = ac.id
         WHERE pac.playerId = ?`,
        playerId
      );
      res.status(200).json({ cards });
    } catch (error) {
      console.error("Error fetching player's action cards:", error);
      res.status(500).send({ error: "Failed to fetch player's action cards" });
    }
  };

  // Update player's action cards
  const updatePlayerActionCardsHandler: RequestHandler = async (req, res) => {
    const { playerId, actionCardIds } = req.body as { playerId: string; actionCardIds: number[] };

    if (!playerId || !Array.isArray(actionCardIds)) {
      res.status(400).json({ error: 'playerId and actionCardIds are required.' });
      return;
    }

    const db = await getDatabase();
    try {
      await db.run('BEGIN TRANSACTION');

      // Delete existing action card assignments for the player
      await db.run('DELETE FROM player_action_cards WHERE playerId = ?', playerId);

      // Insert new action card assignments
      const insertStmt = await db.prepare('INSERT INTO player_action_cards (playerId, cardId) VALUES (?, ?)');
      for (const cardId of actionCardIds) {
        await insertStmt.run(playerId, cardId);
      }
      await insertStmt.finalize();

      await db.run('COMMIT');
      res.status(200).json({ message: 'Action cards updated successfully' });
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error updating player action cards:', error);
      res.status(500).json({ error: 'Failed to update action cards' });
    }
  };

  // Add new endpoints for relic functionality
  const fetchAllRelicCards: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const cards = await db.all(`SELECT * FROM relic_cards`);
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching relic cards:', error);
      res.status(500).json({ error: 'Failed to fetch relic cards' });
    }
  };

  const fetchPlayerRelicCards: RequestHandler = async (req, res) => {
    const { playerId } = req.params;
    try {
      const db = getDatabase();
      const cards = await db.all(`
        SELECT rc.* FROM relic_cards rc
        INNER JOIN player_relic_cards prc ON rc.id = prc.cardId
        WHERE prc.playerId = ?
      `, [playerId]);
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching player relic cards:', error);
      res.status(500).json({ error: 'Failed to fetch player relic cards' });
    }
  };

  const combineRelicFragments: RequestHandler = async (req, res) => {
    const { playerId, fragmentIds } = req.body;
    
    const db = getDatabase();
    try {
      // Verify fragments are valid for combination
      const fragments = await db.all(
        `SELECT * FROM exploration_cards WHERE id IN (${fragmentIds.join(',')}) AND subtype = 'relic_fragment'`
      );
      
      if (fragments.length !== 3) {
        res.status(400).json({ error: 'Must select exactly 3 fragments' });
        return;
      }
      
      // Check if fragments are compatible (same type or include frontier)
      const types = fragments.map(f => f.type);
      const hasFrontier = types.includes('frontier');
      const mainType = types.find(t => t !== 'frontier');
      const isValid = hasFrontier ? 
        types.filter(t => t === mainType || t === 'frontier').length === 3 :
        types.every(t => t === types[0]);
      
      if (!isValid) {
        res.status(400).json({ error: 'Invalid fragment combination' });
        return;
      }

      await db.run('BEGIN TRANSACTION');

      // Remove fragments from player
      await db.run(
        `DELETE FROM player_exploration_cards WHERE playerId = ? AND cardId IN (${fragmentIds.join(',')})`,
        playerId
      );

      // Draw random relic card
      const relic = await db.get(`
        SELECT rc.* FROM relic_cards rc
        INNER JOIN relic_deck rd ON rc.id = rd.cardId
        ORDER BY RANDOM() LIMIT 1
      `);

      if (!relic) {
        await db.run('ROLLBACK');
        res.status(404).json({ error: 'No relics remaining in deck' });
        return;
      }

      // Remove relic from deck
      await db.run(`DELETE FROM relic_deck WHERE cardId = ?`, relic.id);

      // Add relic to player
      await db.run(
        `INSERT INTO player_relic_cards (playerId, cardId) VALUES (?, ?)`,
        playerId,
        relic.id
      );

      await db.run('COMMIT');
      res.status(200).json({ relic });
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error combining relic fragments:', error);
      res.status(500).json({ error: 'Failed to combine relic fragments' });
    }
  };

  const updatePlayerRelicCards: RequestHandler = async (req, res) => {
    const { playerId, relicCardIds } = req.body as { playerId: string; relicCardIds: number[] };

    if (!playerId || !Array.isArray(relicCardIds)) {
      res.status(400).json({ error: 'playerId and relicCardIds are required.' });
      return;
    }

    const db = getDatabase();
    try {
      await db.run('BEGIN TRANSACTION');

      // Delete existing relic card assignments for the player
      await db.run('DELETE FROM player_relic_cards WHERE playerId = ?', playerId);

      // Insert new relic card assignments
      const insertStmt = await db.prepare('INSERT INTO player_relic_cards (playerId, cardId) VALUES (?, ?)');
      for (const cardId of relicCardIds) {
        await insertStmt.run(playerId, cardId);
      }
      await insertStmt.finalize();

      await db.run('COMMIT');
      res.status(200).json({ message: 'Relic cards updated successfully' });
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error updating player relic cards:', error);
      res.status(500).json({ error: 'Failed to update relic cards' });
    }
  }

  const fetchAllTechnologyCards: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const cards = await db.all(`SELECT * FROM technology_cards WHERE type != 'vehicle'`);
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching technology cards:', error);
      res.status(500).json({ error: 'Failed to fetch technology cards' });
    }
  };
  
  const fetchPlayerTechnologyCards: RequestHandler = async (req, res) => {
    const { playerId } = req.params;
    try {
      const db = getDatabase();
      const cards = await db.all(`
        SELECT tc.*, ptc.tapped 
        FROM technology_cards tc
        INNER JOIN player_technology_cards ptc ON tc.id = ptc.cardId
        WHERE ptc.playerId = ?`, 
        [playerId]
      );
      res.status(200).json({ cards });
    } catch (error) {
      console.error('Error fetching player technology cards:', error);
      res.status(500).json({ error: 'Failed to fetch player technology cards' });
    }
  };
  
  const updatePlayerTechnologyCards: RequestHandler = async (req, res) => {
    const { playerId, cardIds } = req.body;
    
    const db = getDatabase();
    try {
      await db.run('BEGIN TRANSACTION');
      await db.run('DELETE FROM player_technology_cards WHERE playerId = ?', playerId);
      
      const stmt = await db.prepare(
        'INSERT INTO player_technology_cards (playerId, cardId) VALUES (?, ?)'
      );
      for (const cardId of cardIds) {
        await stmt.run(playerId, cardId);
      }
      await stmt.finalize();
      
      await db.run('COMMIT');
      res.status(200).json({ message: 'Technology cards updated' });
    } catch (error) {
      await db.run('ROLLBACK');
      console.error('Error updating technology cards:', error);
      res.status(500).json({ error: 'Failed to update technology cards' });
    }
  };
  
  const updateTechnologyCardTapped: RequestHandler = async (req, res) => {
    const { playerId, cardId, tapped } = req.body;
    
    try {
      const db = getDatabase();
      await db.run(
        `UPDATE player_technology_cards 
         SET tapped = ? 
         WHERE playerId = ? AND cardId = ?`,
        tapped, playerId, cardId
      );
      res.status(200).json({ message: 'Technology card tapped status updated' });
    } catch (error) {
      console.error('Error updating technology card tapped status:', error);
      res.status(500).json({ error: 'Failed to update technology card tapped status' });
    }
  };

  const updatePlayerFaction: RequestHandler = async (req, res) => {
    const { playerId, faction } = req.body;
    
    try {
      const db = getDatabase();
      await db.run(
        `UPDATE players 
         SET faction = ? 
         WHERE playerId = ?`,
        faction, playerId
      );
      res.status(200).json({ message: 'Player faction updated' });
    } catch (error) {
      console.error('Error updating player faction:', error);
      res.status(500).json({ error: 'Failed to update player faction' });
    }
  }

  const fetchFaction: RequestHandler = async (req, res) => {
    const { factionName } = req.params;
    try {
      const db = getDatabase();
      const faction = await db.get(`SELECT * FROM factions WHERE name = ?`, factionName);
      res.status(200).json({ faction });
    } catch (error) {
      console.error('Error fetching faction:', error);
      res.status(500).json({ error: 'Failed to fetch faction' });
    }
  }

  const getAllFactions: RequestHandler = async (req, res) => {
    try {
      const db = getDatabase();
      const factions = await db.all('SELECT * FROM factions');
      res.status(200).json({ factions });
    } catch (error) {
      console.error('Error fetching factions:', error);
      res.status(500).json({ error: 'Failed to fetch factions' });
    }
  };

  // Register routes

  // Health check
  app.get('/api/health', healthCheck);

  // General game states
  app.get('/api/game-state', fetchGameState);
  app.get('/api/get-ip', getLocalIPs);
  app.post('/api/player/join', registerPlayer);

  // Victory Points & Objectives
  app.post('/api/victory-points/update', updateVictoryPoints);

  // Planets
  app.get('/api/planets', getPlanets);
  app.get('/api/planet/:planetId/attachments', getPlanetAttachments);
  app.post('/api/player/assign-planets', assignPlanetsToPlayer);
  app.post('/api/player/update-tapped', updatePlanetTapped);
  app.post('/api/explore-planet', explorePlanet);
  app.post('/api/planet/attachments', attachCardsToPlanet);
  app.post('/api/planet/detach', detachCardsFromPlanet);
  app.delete('/api/planet/delete', deletePlanet);

  // Exploration
  app.get('/api/exploration-cards', getExplorationCards);
  app.get('/api/exploration-cards/attach', getAttachTypeExplorationCards);
  app.get('/api/player/:playerId/exploration-cards', getPlayerExplorationCards);
  app.get('/api/exploration-cards-by-type', fetchExplorationCardsByType);
  app.post('/api/player/update-exploration-cards', updatePlayerExplorationCards);
  app.delete('/api/exploration-cards/:id', removeExplorationCard);

  // Strategies
  app.get('/api/strategy-cards', fetchAllStrategyCards);
  app.get('/api/player/:playerId/strategy-cards', fetchPlayerStrategyCardsHandler);
  app.post('/api/player/update-strategy-cards', updatePlayerStrategyCardsHandler);
  app.post('/api/strategy-card/update-trade-good', updateStrategyCardTradeGood);

  // Actions
  app.get('/api/action-cards', fetchAllActionCards);
  app.get('/api/player/:playerId/action-cards', fetchPlayerActionCardsHandler);
  app.post('/api/player/update-action-cards', updatePlayerActionCardsHandler);

  // Relics
  app.get('/api/relic-cards', fetchAllRelicCards);
  app.get('/api/player/:playerId/relic-cards', fetchPlayerRelicCards);
  app.post('/api/combine-relic-fragments', combineRelicFragments);
  app.post('/api/player/update-relic-cards', updatePlayerRelicCards);

  // Technology
  app.get('/api/technology-cards', fetchAllTechnologyCards);
  app.get('/api/player/:playerId/technology-cards', fetchPlayerTechnologyCards);
  app.post('/api/player/update-technology-cards', updatePlayerTechnologyCards);
  app.post('/api/technology-card/update-tapped', updateTechnologyCardTapped);

  // Factions
  app.post('/api/player/update-faction', updatePlayerFaction);
  app.get('/api/faction/:factionName', fetchFaction);
  app.get('/api/factions', getAllFactions);
};