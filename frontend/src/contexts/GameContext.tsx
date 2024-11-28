// src/contexts/GameContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { GameState } from '../types';
import { fetchGameState } from '../services/api';
import socket from '../services/socket';

// Update the context type to exclude null
interface GameContextType {
  gameState: GameState | null;
  setGameState: (state: GameState) => void;
}

// Provide a default value to avoid null
export const GameContext = createContext<GameContextType>({
  gameState: null,
  setGameState: () => {},
});

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);

  useEffect(() => {
    // Fetch initial game state
    const fetchData = async () => {
      try {
        const data = await fetchGameState();
        setGameState(data);
      } catch (error) {
        console.error('Error fetching game state:', error);
      }
    };

    fetchData();

    // Listen for real-time updates
    socket.on('victory-points-updated', (updatedPoints: Record<number, number>) => {
      setGameState((prevState) => {
        if (prevState) {
          return {
            ...prevState,
            victoryPoints: { ...prevState.victoryPoints, ...updatedPoints },
          };
        }
        return prevState;
      });
    });

    return () => {
      socket.off('victory-points-updated');
    };
  }, []);

  return (
    <GameContext.Provider value={{ gameState, setGameState }}>
      {children}
    </GameContext.Provider>
  );
};
