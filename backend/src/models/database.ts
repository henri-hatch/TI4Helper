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
      victoryPoints INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS objectives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('public', 'secret')),
      points INTEGER NOT NULL
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
  `);

  console.log('Database tables ensured.');

  await initializePlanets();
  await initializeExplorationCards();
  await initializeStrategyCards();
  await initializeActionCards();
  await initializeRelicCards();

  console.log('All database tables initialized.');
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

export const getDatabase = (): Database<sqlite3.Database, sqlite3.Statement> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
