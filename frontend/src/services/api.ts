// src/services/api.ts
import axios from 'axios';
import { GameState, PlayerJoinResponse, Planet } from '../types';

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
  console.log('Calling assignPlanetsToPlayer API with:', { playerId, planetIds }); // Debugging log
  await api.post('/player/assign-planets', { playerId, planetIds });
};
