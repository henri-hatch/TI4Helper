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
  planets: PlayerPlanet[]; // Updated to include 'tapped' status
  victoryPoints: number;
  faction: string | null;
}

// Represents a planet owned by a player with tapped status
export interface PlayerPlanet {
  id: number;
  tapped: boolean;
  attachments?: ExplorationCard[]; // Optional property
}

// Represents a planet in general
export interface Planet {
  id: number;
  name: string;
  resources: number;
  influence: number;
  legendaryAbility: string;
  type: 'hazardous' | 'cultural' | 'industrial'; // Added type
}

// Represents a planet with tapped status for the dashboard
export interface DashboardPlanet extends Planet {
  tapped: boolean;
  attachments?: ExplorationCard[]; // Optional property
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

// Represents an exploration card
export interface ExplorationCard {
  id: number;
  name: string;
  type: 'hazardous' | 'cultural' | 'industrial';
  subtype?: 'attach' | 'action' | 'relic_fragment';
  image: string;
}

export interface StrategyCard {
  id: number;
  name: string;
  image: string;
  tradeGoodCount: number;
}

export interface ActionCard {
  id: number;
  name: string;
  image: string;
}

export interface RelicCard {
  id: number;
  name: string;
  image: string;
}

export interface TechnologyCard {
  id: number;
  name: string;
  type: 'action' | 'passive' | 'vehicle';
  faction: string;
  image: string;
  tapped?: boolean;
}

export interface Faction {
  name: string;
  faction_board_front_image: string;
  faction_board_back_image: string;
  faction_reference_image: string;
  faction_token_image: string;
}

export interface Objective {
  id: number;
  name: string
  type: 'public' | 'secret';
  points: number;
  image: string;
}

export interface DashboardObjective extends Objective {
  completed: boolean;
}