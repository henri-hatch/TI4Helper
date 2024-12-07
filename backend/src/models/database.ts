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
    -- Players Table
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

    -- Player Planets Table
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
      name TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('hazardous', 'cultural', 'industrial', 'action', 'fragment')),
      subtype TEXT,
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
      FOREIGN KEY (cardId) REFERENCES exploration_cards(id)
    );

    CREATE TABLE IF NOT EXISTS planet_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      planetId INTEGER NOT NULL,
      cardId INTEGER NOT NULL,
      FOREIGN KEY (planetId) REFERENCES planets(id),
      FOREIGN KEY (cardId) REFERENCES exploration_cards(id),
      UNIQUE (planetId, cardId) -- Add this line
    );
  `);

  console.log('Database tables ensured.');

  // Initialize Planets
  await initializePlanets();

  // Initialize Exploration Cards
  await initializeExplorationCards();
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

    // Clear existing deck
    await db.run(`DELETE FROM exploration_deck`);

    for (const card of cards) {
      let cardId: number;
      const existing = await db.get(`SELECT id FROM exploration_cards WHERE name = ?`, card.name);

      if (!existing) {
        const insertResult = await db.run(
          `INSERT INTO exploration_cards (name, type, subtype, image) VALUES (?, ?, ?, ?)`,
          card.name,
          card.type,
          card.subtype || null,
          card.image
        );
        cardId = insertResult.lastID as number;
        console.log(`Inserted exploration card: ${card.name}`);
      } else {
        cardId = existing.id; // Use the existing card's ID
        console.log(`Exploration card already exists: ${card.name}`);
      }

      // Add card to the exploration deck
      await db.run(
        `INSERT INTO exploration_deck (cardId, type) VALUES (?, ?)`,
        cardId,
        card.type
      );
    }

    console.log('Exploration deck initialized.');
  } catch (error) {
    console.error('Error initializing exploration cards:', error);
  }
};

// Define ExplorationCardInput interface
interface ExplorationCardInput {
  name: string;
  type: string; // 'hazardous', 'cultural', 'industrial', 'action', 'fragment'
  subtype?: string; // Optional additional categorization
  image: string; // Relative path to image
}

export const getDatabase = (): Database<sqlite3.Database, sqlite3.Statement> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
