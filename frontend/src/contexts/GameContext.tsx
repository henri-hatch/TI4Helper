// src/contexts/GameContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { GameState, PlayerJoinResponse } from '../types';
import { fetchGameState, joinGame } from '../services/api';
import socket from '../services/socket';

interface GameContextType {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
  playerId: string | null;
  playerName: string | null;
  registerPlayer: (name: string) => Promise<void>;
}

export const GameContext = createContext<GameContextType>({
  gameState: null,
  setGameState: () => {},
  playerId: null,
  playerName: null,
  registerPlayer: async () => {},
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => {
    return localStorage.getItem('playerId');
  });
  const [playerName, setPlayerName] = useState<string | null>(() => {
    return localStorage.getItem('playerName');
  });

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

    fetchData();

    // Handle socket events
    const handleVictoryPointsUpdated = (updatedPoints: Record<string, number>) => {
      console.log('Received victory-points-updated event:', updatedPoints);
      setGameState((prevState) => {
        if (prevState) {
          // Update players' victoryPoints
          const updatedPlayers = prevState.players.map((player) => {
            if (updatedPoints[player.playerId] !== undefined) {
              return { ...player, victoryPoints: updatedPoints[player.playerId] };
            }
            return player;
          });

          // Optionally update the separate victoryPoints mapping
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

    // Listen for 'victory-points-updated' events
    socket.on('victory-points-updated', handleVictoryPointsUpdated);

    // Clean up the socket listener on unmount
    return () => {
      socket.off('victory-points-updated', handleVictoryPointsUpdated);
    };
  }, []);

  const registerPlayer = async (name: string) => {
    try {
      const data: PlayerJoinResponse = await joinGame(name);
      console.log('Register player response:', data);
      setPlayerId(data.playerId);
      setPlayerName(data.name);
      localStorage.setItem('playerId', data.playerId);
      localStorage.setItem('playerName', data.name);
    } catch (error) {
      console.error('Error registering player:', error);
      throw error;
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameState,
        setGameState,
        playerId,
        playerName,
        registerPlayer,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};