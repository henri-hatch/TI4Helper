// src/types/index.ts

// Represents a player in the game
export interface Player {
    id: number;
    name: string;
    resources: number;
    influence: number;
    commodities: number;
    tradeGoods: number;
    planets: Planet[];
  }
  
  // Represents a planet owned by a player
  export interface Planet {
    id: number;
    name: string;
    resources: number;
    influence: number;
    tapped: boolean;
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
    victoryPoints: Record<number, number>; // Player ID -> Victory Points
  }
  