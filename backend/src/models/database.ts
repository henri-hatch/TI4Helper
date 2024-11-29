// src/models/database.ts
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database<sqlite3.Database, sqlite3.Statement>;

export const initializeDatabase = async () => {
  db = await open({
    filename: './db.sqlite',
    driver: sqlite3.Database,
  });

  // Create tables with victoryPoints column
  await db.exec(`
    CREATE TABLE IF NOT EXISTS players (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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
  `);

  console.log('Database initialized');
};

export const getDatabase = (): Database<sqlite3.Database, sqlite3.Statement> => {
  if (!db) {
    throw new Error('Database not initialized');
  }
  return db;
};
