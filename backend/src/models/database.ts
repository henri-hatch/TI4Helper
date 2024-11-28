import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';

let db: Database<sqlite3.Database, sqlite3.Statement>;

export const initializeDatabase = async () => {
    const db = await open({
        filename: './database.sqlite',
        driver: sqlite3.Database
    });

    // Create the tables if they don't exist
    await db.exec(`
        CREATE TABLE IF NOT EXIISTS players (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            victory_points INTEGER DEFAULT 0,
            resources INTEGER DEFAULT 0,
            influence INTEGER DEFAULT 0,
            commodities INTEGER DEFAULT 0,
            trade_goods INTEGER DEFAULT 0
        );
        
        CREATE TABLE IF NOT EXISTS objectives (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            description TEXT NOT NULL,
            points INTEGER NOT NULL,
            type TEXT NOT NULL CHECK (type IN ('public', 'secret')),
            completed BOOLEAN DEFAULT 0
        );
    `);

    console.log('Database initialized');
};

export const getDatabase = () => db;