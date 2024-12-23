// src/models/database.ts
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import fs from 'fs/promises';
import path from 'path';

let db: Database<sqlite3.Database, sqlite3.Statement>;

export const initializeDatabase = async () => {
  db = await open({
    filename: './db.sqlite',
    driver: sqlite3.Database,
  });

  // Create tables with victoryPoints and unique playerId
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      resources INTEGER DEFAULT 0,
      influence INTEGER DEFAULT 0,
      commodities INTEGER DEFAULT 0,
      trade_goods INTEGER DEFAULT 0,
      victoryPoints INTEGER DEFAULT 0,
      faction TEXT
    );

    CREATE TABLE IF NOT EXISTS planets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      resources INTEGER NOT NULL,
      influence INTEGER NOT NULL,
      legendaryAbility TEXT,
      type TEXT NOT NULL CHECK (type IN ('hazardous', 'cultural', 'industrial'))
    );

    CREATE TABLE IF NOT EXISTS player_planets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      planetId INTEGER NOT NULL,
      tapped BOOLEAN NOT NULL DEFAULT FALSE,
      FOREIGN KEY (playerId) REFERENCES players(playerId),
      FOREIGN KEY (planetId) REFERENCES planets(id)
    );

    CREATE TABLE IF NOT EXISTS exploration_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('hazardous', 'cultural', 'industrial', 'frontier')),
      subtype TEXT CHECK (subtype IN ('action', 'attach', 'relic_fragment')),
      image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS exploration_deck (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cardId INTEGER NOT NULL,
      type TEXT NOT NULL,
      FOREIGN KEY (cardId) REFERENCES exploration_cards(id)
    );

    CREATE TABLE IF NOT EXISTS player_exploration_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      cardId INTEGER NOT NULL,
      FOREIGN KEY (playerId) REFERENCES players(playerId),
      FOREIGN KEY (cardId) REFERENCES exploration_cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS planet_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planetId INTEGER NOT NULL,
      cardId INTEGER NOT NULL,
      FOREIGN KEY (planetId) REFERENCES planets(id),
      FOREIGN KEY (cardId) REFERENCES exploration_cards(id),
      UNIQUE (planetId, cardId) -- Add this line
    );

    CREATE TABLE IF NOT EXISTS strategy_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      image TEXT,
      tradeGoodCount INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS player_strategy_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      cardId INTEGER NOT NULL,
      FOREIGN KEY (playerId) REFERENCES players(playerId) ON DELETE CASCADE,
      FOREIGN KEY (cardId) REFERENCES strategy_cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS action_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_action_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      cardId INTEGER NOT NULL,
      FOREIGN KEY (playerId) REFERENCES players(playerId) ON DELETE CASCADE,
      FOREIGN KEY (cardId) REFERENCES action_cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS relic_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS relic_deck (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cardId INTEGER NOT NULL,
      FOREIGN KEY (cardId) REFERENCES relic_cards(id)
    );

    CREATE TABLE IF NOT EXISTS player_relic_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      cardId INTEGER NOT NULL,
      FOREIGN KEY (playerId) REFERENCES players(playerId) ON DELETE CASCADE,
      FOREIGN KEY (cardId) REFERENCES relic_cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS technology_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      type TEXT CHECK (type IN ('action', 'passive', 'vehicle')) NOT NULL,
      faction TEXT NOT NULL,
      image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_technology_cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      cardId INTEGER NOT NULL,
      tapped BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (playerId) REFERENCES players(playerId) ON DELETE CASCADE,
      FOREIGN KEY (cardId) REFERENCES technology_cards(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS factions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      faction_board_front_image TEXT NOT NULL,
      faction_board_back_image TEXT NOT NULL,
      faction_reference_image TEXT NOT NULL,
      faction_token_image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT CHECK (type IN ('public', 'secret')),
      points INTEGER NOT NULL,
      image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS player_objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      playerId TEXT NOT NULL,
      objectiveId INTEGER NOT NULL,
      completed BOOLEAN DEFAULT FALSE,
      FOREIGN KEY (playerId) REFERENCES players(playerId),
      FOREIGN KEY (objectiveId) REFERENCES objectives(id)
    );
  `);

  // Check if tables are empty before initializing
  const hasExistingData = await db.get('SELECT COUNT(*) as count FROM players');
  if (hasExistingData.count === 0) {
    // Only initialize data if database is empty
    await initializePlanets();
    await initializeExplorationCards();
    await initializeStrategyCards();
    await initializeActionCards();
    await initializeRelicCards();
    await initializeTechnologyCards();
    await initializeFactions();
    await initializeObjectives();
  } else {
    console.log('Existing game found. Database already initialized.');
    console.log('Getting previous game...');
  }
};

// Update the planet insertion to include 'type'
const initializePlanets = async () => {
  try {
    const planetsPath = path.join(__dirname, 'assets', 'planets.json');
    const data = await fs.readFile(planetsPath, 'utf-8');
    const planets: PlanetInput[] = JSON.parse(data);

    for (const planet of planets) {
      const existing = await db.get(`SELECT id FROM planets WHERE name = ?`, planet.name);
      if (!existing) {
        await db.run(
          `INSERT INTO planets (name, resources, influence, legendaryAbility, type) VALUES (?, ?, ?, ?, ?)`,

          planet.name,
          planet.resources,
          planet.influence,
          planet.legendaryAbility,
          planet.type
        );
        console.log(`Inserted planet: ${planet.name}`);
      } else {
        console.log(`Planet already exists: ${planet.name}`);
      }
    }
  } catch (error) {
    console.error('Error initializing planets:', error);
  }
};

// Define PlanetInput interface
interface PlanetInput {
  name: string;
  resources: number;
  influence: number;
  legendaryAbility: string;
  type: string;
}

const initializeExplorationCards = async () => {
  try {
    const db = getDatabase();
    const cardsPath = path.join(__dirname, 'assets', 'exploration_cards.json');
    const data = await fs.readFile(cardsPath, 'utf-8');
    const cards: ExplorationCardInput[] = JSON.parse(data);

    // Clear existing cards and deck
    await db.run(`DELETE FROM exploration_deck`);
    await db.run(`DELETE FROM exploration_cards`);

    // Insert each card as a new entry, regardless of name
    for (const card of cards) {
      const insertResult = await db.run(
        `INSERT INTO exploration_cards (name, type, subtype, image) VALUES (?, ?, ?, ?)`,
        card.name,
        card.type,
        card.subtype,
        card.image
      );
      const cardId = insertResult.lastID as number;

      // Add card to the exploration deck
      await db.run(
        `INSERT INTO exploration_deck (cardId, type) VALUES (?, ?)`,
        cardId,
        card.type
      );
      
      console.log(`Inserted exploration card: ${card.name}`);
    }

    console.log('Exploration deck initialized.');
  } catch (error) {
    console.error('Error initializing exploration cards:', error);
  }
};

// Define ExplorationCardInput interface
interface ExplorationCardInput {
  name: string;
  type: string; // 'hazardous', 'cultural', 'industrial', 'frontier'
  subtype: string; // 'action', 'attach', 'relic_fragment'
  image: string; // Relative path to image
}

// Define StrategyCardInput interface
interface StrategyCardInput {
  name: string;
  image: string;
}

const initializeStrategyCards = async () => {
  try {
    const db = getDatabase();
    const strategyCardsPath = path.join(__dirname, 'assets', 'strategy_cards.json');
    const data = await fs.readFile(strategyCardsPath, 'utf-8');
    const cards: StrategyCardInput[] = JSON.parse(data);

    for (const card of cards) {
      const existing = await db.get(`SELECT id FROM strategy_cards WHERE name = ?`, card.name);
      if (!existing) {
        await db.run(
          `INSERT INTO strategy_cards (name, image, tradeGoodCount) VALUES (?, ?, ?)`,
          card.name,
          card.image,
          0
        );
        console.log(`Inserted strategy card: ${card.name}`);
      } else {
        console.log(`Strategy card already exists: ${card.name}`);
      }
    }

    console.log('Strategy cards initialized.');
  } catch (error) {
    console.error('Error initializing strategy cards:', error);
  }
};

const initializeActionCards = async () => {
  try {
    const db = await getDatabase();
    const cardsPath = path.join(__dirname, 'assets', 'action_cards.json');
    const data = await fs.readFile(cardsPath, 'utf-8');
    const cards: ActionCardInput[] = JSON.parse(data);

    // Clear existing action cards
    await db.run(`DELETE FROM action_cards`);

    for (const card of cards) {
      const existing = await db.get(`SELECT id FROM action_cards WHERE name = ?`, card.name);
      if (!existing) {
        const insertResult = await db.run(
          `INSERT INTO action_cards (name, image) VALUES (?, ?)`,

          card.name,
          card.image
        );
        console.log(`Inserted action card: ${card.name}`);
      } else {
        console.log(`Action card already exists: ${card.name}`);
      }
    }

    console.log('Action cards initialized.');
  } catch (error) {
    console.error('Error initializing action cards:', error);
  }
};

// Define ActionCardInput interface
interface ActionCardInput {
  name: string;
  image: string;
}

const initializeRelicCards = async () => {
  try {
    const db = await getDatabase();
    const cardsPath = path.join(__dirname, 'assets', 'relic_cards.json');
    const data = await fs.readFile(cardsPath, 'utf-8');
    const cards: RelicCardInput[] = JSON.parse(data);

    // Clear existing relics
    await db.run(`DELETE FROM relic_cards`);
    await db.run(`DELETE FROM relic_deck`);

    for (const card of cards) {
      const existing = await db.get(`SELECT id FROM relic_cards WHERE name = ?`, card.name);
      if (!existing) {
        const insertResult = await db.run(
          `INSERT INTO relic_cards (name, image) VALUES (?, ?)`,
          card.name,
          card.image
        );
        // Add to relic deck
        await db.run(
          `INSERT INTO relic_deck (cardId) VALUES (?)`,
          insertResult.lastID
        );
      }
    }
    console.log('Relic cards initialized.');
  } catch (error) {
    console.error('Error initializing relic cards:', error);
  }
};

interface RelicCardInput {
  name: string;
  image: string;
}

// Add initialization function
const initializeTechnologyCards = async () => {
  try {
    const db = getDatabase();
    const cardsPath = path.join(__dirname, 'assets', 'technology_cards.json');
    const data = await fs.readFile(cardsPath, 'utf-8');
    const cards: TechnologyCardInput[] = JSON.parse(data);

    await db.run(`DELETE FROM technology_cards`);

    for (const card of cards) {
      await db.run(
        `INSERT INTO technology_cards (name, type, faction, image) 
         VALUES (?, ?, ?, ?)`,
        card.name,
        card.type,
        card.faction,
        card.image
      );
    }

    console.log("Technology cards initialized.");
  } catch (error) {
    console.error('Error initializing technology cards:', error);
  }
};


interface TechnologyCardInput {
  name: string;
  type: string; // 'action', 'passive', 'vehicle'
  faction: string; // 'propulsion', 'warfare', 'biotics', 'cybernetics' + any faction name
  image: string;
}

// Initialize factions
const initializeFactions = async () => {
  try {
    const db = getDatabase();
    const factionsPath = path.join(__dirname, 'assets', 'factions.json');
    const data = await fs.readFile(factionsPath, 'utf-8');
    const factions: FactionInput[] = JSON.parse(data);

    for (const faction of factions) {
      const existing = await db.get(`SELECT id FROM factions WHERE name = ?`, faction.name);
      if (!existing) {
        await db.run(
          `INSERT INTO factions (name, faction_board_front_image, faction_board_back_image, faction_reference_image, faction_token_image) 
           VALUES (?, ?, ?, ?, ?)`,
          faction.name,
          faction.faction_board_front_image,
          faction.faction_board_back_image,
          faction.faction_reference_image,
          faction.faction_token_image
        );
        console.log(`Inserted faction: ${faction.name}`);
      } else {
        console.log(`Faction already exists: ${faction.name}`);
      }
    }

    console.log('Factions initialized.');
  } catch (error) {
    console.error('Error initializing factions:', error);
  }
}

// Define FactionInput interface
interface FactionInput {
  name: string;
  faction_board_front_image: string;
  faction_board_back_image: string;
  faction_reference_image: string;
  faction_token_image: string;
}

// Initialize objectives
export const initializeObjectives = async () => {
  try {
    const db = getDatabase();
    const objectivesPath = path.join(__dirname, 'assets', 'objectives.json');
    const data = await fs.readFile(objectivesPath, 'utf-8');
    const objectives: ObjectiveInput[] = JSON.parse(data);

    for (const objective of objectives) {
      const existing = await db.get(`SELECT id FROM objectives WHERE name = ?`, objective.name);
      if (!existing) {
        await db.run(
          `INSERT INTO objectives (name, type, points, image) 
           VALUES (?, ?, ?, ?)`,
          objective.name,
          objective.type,
          objective.points,
          objective.image
        );
        console.log(`Inserted objectives: ${objective.name}`);
      } else {
        console.log(`Objective already exists: ${objective.name}`);
      }
    }

    console.log("Objectives initialized.");
  } catch (error) {
    console.error('Error initializing objectives:', error);
  }
};

// Define ObjectiveInput interface
interface ObjectiveInput {
  name: string;
  type: string; // 'public', 'secret'
  points: number;
  image: string;
}

export const getDatabase = (): Database<sqlite3.Database, sqlite3.Statement> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
