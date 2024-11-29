// src/services/api.ts
import axios from 'axios';
import { GameState, PlayerJoinResponse } from '../types';

// Existing API instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
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
