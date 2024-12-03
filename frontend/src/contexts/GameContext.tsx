// src/contexts/GameContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { GameState, Player, Planet, Objective, PlayerJoinResponse } from '../types';
import { fetchGameState, joinGame, fetchPlanets, assignPlanetsToPlayer } from '../services/api';
import socket from '../services/socket';
import axios from 'axios';

// Utility function to check localStorage availability
const isLocalStorageAvailable = (() => {
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
})();

interface GameContextType {
  gameState: GameState | null;
  setGameState: React.Dispatch<React.SetStateAction<GameState | null>>;
  playerId: string | null;
  playerName: string | null;
  planets: Planet[];
  registerPlayer: (name: string) => Promise<void>;
  updatePlayerPlanets: (planetIds: number[]) => Promise<void>;
}

export const GameContext = createContext<GameContextType>({
  gameState: null,
  setGameState: () => {},
  playerId: null,
  playerName: null,
  planets: [],
  registerPlayer: async () => {},
  updatePlayerPlanets: async () => {},
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    if (isLocalStorageAvailable) {
      return localStorage.getItem('playerId');
    }
    return null;
  });
  const [playerName, setPlayerName] = useState<string | null>(() => {
    if (isLocalStorageAvailable) {
      return localStorage.getItem('playerName');
    }
    return null;
  });
  const [planets, setPlanets] = useState<Planet[]>([]);

  useEffect(() => {
    // Fetch initial game state
    const fetchData = async () => {
      try {
        const data = await fetchGameState();
        setGameState(data);
        console.log('Initial game state fetched:', data);
      } catch (error) {
        console.error('Error fetching game state:', error);
      }
    };

    // Fetch planets
    const fetchAllPlanets = async () => {
      try {
        const fetchedPlanets = await fetchPlanets();
        setPlanets(fetchedPlanets);
        console.log('Planets fetched:', fetchedPlanets);
      } catch (error) {
        console.error('Error fetching planets:', error);
      }
    };

    fetchData();
    fetchAllPlanets();

    // Handle socket events
    const handleVictoryPointsUpdated = (updatedPoints: Record<string, number>) => {
      console.log('Received victory-points-updated event:', updatedPoints);
      setGameState((prevState) => {
        if (prevState) {
          const updatedPlayers = prevState.players.map((player) => {
            if (updatedPoints[player.playerId] !== undefined) {
              return { ...player, victoryPoints: updatedPoints[player.playerId] };
            }
            return player;
          });

          const updatedVictoryPoints = { ...prevState.victoryPoints, ...updatedPoints };

          const updatedGameState: GameState = {
            ...prevState,
            players: updatedPlayers,
            victoryPoints: updatedVictoryPoints,
          };

          console.log('Updated GameState:', updatedGameState);
          return updatedGameState;
        }
        return prevState;
      });
    };

    const handlePlayerJoined = (newPlayer: Player) => {
      console.log('Received player-joined event:', newPlayer);
      setGameState((prevState) => {
        if (prevState) {
          // Check if player already exists to prevent duplicates
          const playerExists = prevState.players.some(p => p.playerId === newPlayer.playerId);
          if (playerExists) return prevState;

          // Add the new player to the players array
          const updatedPlayers = [...prevState.players, newPlayer];

          // Update victoryPoints mapping
          const updatedVictoryPoints = { ...prevState.victoryPoints, [newPlayer.playerId]: newPlayer.victoryPoints };

          const updatedGameState: GameState = {
            ...prevState,
            players: updatedPlayers,
            victoryPoints: updatedVictoryPoints,
          };

          console.log('Updated GameState with new player:', updatedGameState);
          return updatedGameState;
        }
        return prevState;
      });
    };

    socket.on('victory-points-updated', handleVictoryPointsUpdated);
    socket.on('player-joined', handlePlayerJoined); // Listen for new player joins

    // Clean up the socket listeners on unmount
    return () => {
      socket.off('victory-points-updated', handleVictoryPointsUpdated);
      socket.off('player-joined', handlePlayerJoined);
    };
  }, []);

  const registerPlayerHandler = async (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      console.error('Player name cannot be empty.');
      return;
    }
    try {
      const data: PlayerJoinResponse = await joinGame(trimmedName);
      console.log('Register player response:', data);
      setPlayerId(data.playerId);
      setPlayerName(data.name);

      if (isLocalStorageAvailable) {
        try {
          localStorage.setItem('playerId', data.playerId);
          localStorage.setItem('playerName', data.name);
        } catch (e) {
          console.error('Error setting localStorage:', e);
        }
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response?.status === 409) {
        console.log('Player name already exists. Using existing player data.');
        const existingPlayer = error.response.data.player as PlayerJoinResponse;
        if (existingPlayer) {
          setPlayerId(existingPlayer.playerId);
          setPlayerName(existingPlayer.name);

          if (isLocalStorageAvailable) {
            localStorage.setItem('playerId', existingPlayer.playerId);
            localStorage.setItem('playerName', existingPlayer.name);
          }
        } else {
          console.error('Player name exists but no player data returned.');
        }
        // Handle other cases if necessary
      } else {
        console.error('Error registering player:', error);
      }
    }
  };

  const updatePlayerPlanets = async (planetIds: number[]) => {
    if (!playerId) {
      console.error('No player ID available.');
      return;
    }
    try {
      console.log('Assigning Planets:', { playerId, planetIds }); // Debugging log
      await assignPlanetsToPlayer(playerId, planetIds);
      // Refetch game state after assignment
      const updatedGameState = await fetchGameState();
      setGameState(updatedGameState);
      console.log('Updated game state after assigning planets:', updatedGameState);
    } catch (error) {
      console.error('Error assigning planets to player:', error);
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        playerId,
        playerName,
        planets,
        registerPlayer: registerPlayerHandler,
        updatePlayerPlanets,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};