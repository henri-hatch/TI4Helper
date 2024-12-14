// src/services/api.ts
import axios from 'axios';
import { GameState, PlayerJoinResponse, Planet, ExplorationCard, StrategyCard, ActionCard, RelicCard } from '../types';

// Dynamically set the backend URL based on the current window location
const BACKEND_PORT = '5000'; // Ensure this matches your backend's port
const BACKEND_HOST = window.location.hostname; // Automatically uses the current host
const BACKEND_URL = `${window.location.protocol}//${BACKEND_HOST}:${BACKEND_PORT}`;

const api = axios.create({
  baseURL: `${BACKEND_URL}/api`,
  timeout: 5000,
});

export default api;

// Existing API calls
export const fetchGameState = async (): Promise<GameState> => {
  const response = await api.get('/game-state');
  return response.data;
};

export const updatePlayerResources = async (playerId: number, resources: number) => {
  const response = await api.post('/player/update-resources', { playerId, resources });
  return response.data;
};

// API call for joining the game
export const joinGame = async (name: string): Promise<PlayerJoinResponse> => {
  const response = await api.post('/player/join', { name });
  return response.data;
};

// New API call to get local IPs
export const getLocalIPs = async (): Promise<string[]> => {
  const response = await api.get('/get-ip');
  return response.data.ips;
};

// New API call to fetch planets
export const fetchPlanets = async (): Promise<Planet[]> => {
  const response = await api.get('/planets');
  return response.data.planets;
};

// New API call to assign planets to a player
export const assignPlanetsToPlayer = async (playerId: string, planetIds: number[]): Promise<void> => {
  console.log('Calling assignPlanetsToPlayer API with:', { playerId, planetIds });
  await api.post('/player/assign-planets', { playerId, planetIds });
};

// API call to update planet tapped status
export const updatePlanetTapped = async (playerId: string, planetId: number, tapped: boolean): Promise<void> => {
  console.log('Updating planet tapped status:', { playerId, planetId, tapped });
  await api.post('/player/update-tapped', { playerId, planetId, tapped });
};

// Fetch exploration cards
export const fetchExplorationCards = async (): Promise<ExplorationCard[]> => {
  const response = await api.get('/exploration-cards');
  return response.data.cards;
};

// Explore a planet
export const explorePlanet = async (playerId: string, planetId: number): Promise<ExplorationCard> => {
  const response = await api.post('/explore-planet', { playerId, planetId });
  return response.data.card;
};

// Fetch planet attachments
export const fetchPlanetAttachments = async (planetId: number): Promise<ExplorationCard[]> => {
  const response = await api.get(`/planet/${planetId}/attachments`);
  return response.data.attachments;
};

// Fetch attach-type exploration cards
export const fetchAttachTypeCards = async (): Promise<ExplorationCard[]> => {
  const response = await api.get('/exploration-cards/attach');
  return response.data.cards;
};

// Attach cards to a planet
export const attachCardsToPlanet = async (
  planetId: number,
  cardIds: number[]
): Promise<void> => {
  await api.post('/planet/attachments', { planetId, cardIds });
};

// Detach cards from a planet
export const detachCardsFromPlanet = async (
  planetId: number,
  cardIds: number[]
): Promise<void> => {
  await api.post('/planet/detach', { planetId, cardIds });
};

// Fetch player's exploration cards
export const fetchPlayerExplorationCards = async (playerId: string): Promise<ExplorationCard[]> => {
  const response = await api.get(`/player/${playerId}/exploration-cards`);
  return response.data.cards;
};

// Fetch all exploration cards by types
export const fetchAllExplorationCards = async (subtypes: string[]): Promise<ExplorationCard[]> => {
  const response = await api.get('/exploration-cards-by-type', { params: { subtypes: subtypes.join(',') } });
  return response.data.cards;
};

// Update player's exploration cards
export const updatePlayerExplorationCards = async (
  playerId: string,
  cardIds: number[]
): Promise<void> => {
  await api.post('/player/update-exploration-cards', { playerId, cardIds });
};

// Fetch all strategy cards
export const fetchAllStrategyCards = async (): Promise<StrategyCard[]> => {
  const response = await api.get('/strategy-cards');
  return response.data.cards;
};

// Fetch player's strategy cards
export const fetchPlayerStrategyCards = async (playerId: string): Promise<StrategyCard[]> => {
  const response = await api.get(`/player/${playerId}/strategy-cards`);
  return response.data.cards;
};

// Update player's strategy cards
export const updatePlayerStrategyCards = async (playerId: string, cardIds: number[]): Promise<void> => {
  await api.post('/player/update-strategy-cards', { playerId, cardIds });
};

// Update trade good count for a strategy card
export const updateStrategyCardTradeGood = async (
  cardId: number,
  increment: boolean
): Promise<{ cardId: number; tradeGoodCount: number }> => {
  const response = await api.post('/strategy-card/update-trade-good', { cardId, increment });
  return response.data;
};

// Fetch all Action Cards
export const fetchAllActionCards = async (): Promise<ActionCard[]> => {
  const response = await api.get('/action-cards');
  return response.data.cards;
};

// Fetch Player's Action Cards
export const fetchPlayerActionCards = async (playerId: string): Promise<ActionCard[]> => {
  const response = await api.get(`/player/${playerId}/action-cards`);
  return response.data.cards;
};

// Update Player's Action Cards
export const updatePlayerActionCards = async (playerId: string, actionCardIds: number[]): Promise<void> => {
  await api.post('/player/update-action-cards', { playerId, actionCardIds });
};

export const fetchAllRelicCards = async (): Promise<RelicCard[]> => {
  const response = await api.get('/relic-cards');
  return response.data.cards;
};

export const fetchPlayerRelicCards = async (playerId: string): Promise<RelicCard[]> => {
  const response = await api.get(`/player/${playerId}/relic-cards`);
  return response.data.cards;
};

export const combineRelicFragments = async (playerId: string, fragmentIds: number[]): Promise<RelicCard> => {
  const response = await api.post('/combine-relic-fragments', { playerId, fragmentIds });
  return response.data.relic;
};

export const updatePlayerRelicCards = async (playerId: string, relicCardIds: number[]): Promise<void> => {
  await api.post('/player/update-relic-cards', { playerId, relicCardIds });
};
