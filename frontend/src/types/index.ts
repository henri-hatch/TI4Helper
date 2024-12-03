// src/types/index.ts

// Represents a player in the game
export interface Player {
  id: number;
  playerId: string;
  name: string;
  resources: number;
  influence: number;
  commodities: number;
  tradeGoods: number;
  planets: number[]; // Array of planet IDs
  victoryPoints: number;
}

// Represents a planet owned by a player
export interface Planet {
  id: number;
  name: string;
  resources: number;
  influence: number;
  legendaryAbility: string;
}

// Represents a public or secret objective
export interface Objective {
  id: number;
  description: string;
  type: 'public' | 'secret';
  points: number;
  completedBy?: number; // Player ID who completed the objective
}

// Represents the full game state
export interface GameState {
  players: Player[];
  objectives: Objective[];
  victoryPoints: Record<string, number>; // Player ID (string) -> Victory Points (number)
}

// Response from joining the game
export interface PlayerJoinResponse {
  playerId: string;
  name: string;
}