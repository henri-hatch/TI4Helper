// src/contexts/GameContext.tsx
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { GameState, Player, Planet, Objective, PlayerJoinResponse, PlayerPlanet, ExplorationCard, StrategyCard } from '../types';
import { fetchGameState as apiFetchGameState, joinGame, fetchPlanets, assignPlanetsToPlayer, updatePlanetTapped as apiUpdatePlanetTapped, explorePlanet as apiExplorePlanet, fetchPlanetAttachments, fetchPlayerExplorationCards, fetchAllExplorationCards, updatePlayerExplorationCards, fetchPlayerStrategyCards } from '../services/api';
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
  handleUpdatePlanetTapped: (planetId: number, tapped: boolean) => Promise<void>;
  explorePlanet: (planetId: number) => Promise<void>;
  getPlanetAttachments: (planetId: number) => Promise<ExplorationCard[]>;
  playerExplorationCards: ExplorationCard[];
  setPlayerExplorationCards: React.Dispatch<React.SetStateAction<ExplorationCard[]>>;
  playerStrategyCards: StrategyCard[];
  setPlayerStrategyCards: React.Dispatch<React.SetStateAction<StrategyCard[]>>;
}

export const GameContext = createContext<GameContextType>({
  gameState: null,
  setGameState: () => {},
  playerId: null,
  playerName: null,
  planets: [],
  registerPlayer: async () => {},
  updatePlayerPlanets: async () => {},
  handleUpdatePlanetTapped: async () => {},
  explorePlanet: async () => {},
  getPlanetAttachments: async () => [],
  playerExplorationCards: [],
  setPlayerExplorationCards: () => {},
  playerStrategyCards: [],
  setPlayerStrategyCards: () => {},
});

export const GameProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(() => localStorage.getItem('playerId'));
  const [playerName, setPlayerName] = useState<string | null>(() => localStorage.getItem('playerName'));
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [playerExplorationCards, setPlayerExplorationCards] = useState<ExplorationCard[]>([]);
  const [playerStrategyCards, setPlayerStrategyCards] = useState<StrategyCard[]>([]);

  useEffect(() => {
    // Fetch initial game state
    const fetchData = async () => {
      try {
        const data = await apiFetchGameState();
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

    socket.on('victory-points-updated', handleVictoryPointsUpdated);

    // Cleanup on unmount
    return () => {
      socket.off('victory-points-updated', handleVictoryPointsUpdated);
    };
  }, []);

  useEffect(() => {
    if (playerId) {
      fetchPlayerExplorationCards(playerId)
        .then(setPlayerExplorationCards)
        .catch(console.error);
      fetchPlayerStrategyCards(playerId)
        .then(setPlayerStrategyCards)
        .catch(console.error);
      apiFetchGameState()
        .then(setGameState)
        .catch(console.error);
    }
  }, [playerId]);

  const registerPlayerHandler = async (name: string) => {
    try {
      const response = await joinGame(name);
      setPlayerId(response.playerId);
      setPlayerName(response.name);

      if (isLocalStorageAvailable) {
        localStorage.setItem('playerId', response.playerId);
        localStorage.setItem('playerName', response.name);
      }

      // Optionally, fetch the updated game state
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 409) {
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
        } else {
          console.error('Error registering player:', error);
        }
      } else {
        console.error('Unexpected error:', error);
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
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      console.log('Updated game state after assigning planets:', updatedGameState);
    } catch (error) {
      console.error('Error assigning planets to player:', error);
    }
  };

  // New function to handle planet tapped status updates
  const handleUpdatePlanetTapped = async (planetId: number, tapped: boolean) => {
    if (!playerId) {
      console.error('No player ID available.');
      return;
    }
    try {
      console.log('Updating planet tapped status:', { playerId, planetId, tapped });
      await apiUpdatePlanetTapped(playerId, planetId, tapped);
      // Refetch game state after updating planet
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      console.log('Updated game state after tapping planet:', updatedGameState);
    } catch (error) {
      console.error('Error updating planet tapped status:', error);
    }
  };

  const explorePlanetHandler = async (planetId: number) => {
    if (!playerId) {
      console.error('No player ID available.');
      return;
    }
    try {
      const card = await apiExplorePlanet(playerId, planetId);
      console.log('Exploration result:', card);

      if (card.subtype === 'attach') {
        // The backend already attaches the card to the planet
        // Update game state to reflect changes
        const updatedGameState = await apiFetchGameState();
        setGameState(updatedGameState);
      } else {
        // For 'action' and 'fragment' cards
        // Fetch player's exploration cards
        const explorationCards = await fetchPlayerExplorationCards(playerId);
        setPlayerExplorationCards(explorationCards);
      }
    } catch (error) {
      console.error('Error exploring planet:', error);
    }
  };

  const getPlanetAttachments = async (planetId: number): Promise<ExplorationCard[]> => {
    try {
      const attachments = await fetchPlanetAttachments(planetId);
      return attachments;
    } catch (error) {
      console.error('Error fetching planet attachments:', error);
      return [];
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
        handleUpdatePlanetTapped,
        explorePlanet: explorePlanetHandler,
        getPlanetAttachments,
        playerExplorationCards,
        setPlayerExplorationCards,
        playerStrategyCards,
        setPlayerStrategyCards,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};