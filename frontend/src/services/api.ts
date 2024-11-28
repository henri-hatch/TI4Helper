// src/services/api.ts
import axios from 'axios';

// Configure Axios instance
const api = axios.create({
  baseURL: 'http://localhost:5000/api', // Replace with your server's address
  timeout: 5000,
});

export default api;

// Example API calls
export const fetchGameState = async () => {
  const response = await api.get('/game-state');
  return response.data;
};

export const updatePlayerResources = async (playerId: number, resources: number) => {
  const response = await api.post('/player/update-resources', { playerId, resources });
  return response.data;
};
