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
      legendaryAbility TEXT
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
  `);

  console.log('Database tables ensured.');

  // Initialize Planets
  await initializePlanets();
};

const initializePlanets = async () => {
  try {
    const planetsPath = path.join(__dirname, 'assets', 'planets.json');
    const data = await fs.readFile(planetsPath, 'utf-8');
    const planets: PlanetInput[] = JSON.parse(data);

    for (const planet of planets) {
      const existing = await db.get(`SELECT id FROM planets WHERE name = ?`, planet.name);
      if (!existing) {
        await db.run(
          `INSERT INTO planets (name, resources, influence, legendaryAbility) VALUES (?, ?, ?, ?)`,
          planet.name,
          planet.resources,
          planet.influence,
          planet.legendaryAbility
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
}

export const getDatabase = (): Database<sqlite3.Database, sqlite3.Statement> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
