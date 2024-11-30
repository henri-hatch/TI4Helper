// src/components/PlayerDashboard.tsx
import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';

const PlayerDashboard: React.FC = () => {
  const { gameState, playerId, playerName } = useContext(GameContext);

  if (!gameState) return <div>Loading...</div>;
  if (!playerId) return <div>Please log in.</div>;

  const currentPlayer = gameState.players.find(p => p.playerId === playerId);

  return (
    <div>
      <h1>Player Dashboard</h1>
      <h2>Welcome, {playerName}!</h2>
      {currentPlayer && (
        <div>
          <p>Resources: {currentPlayer.resources}</p>
          <p>Influence: {currentPlayer.influence}</p>
          <p>Commodities: {currentPlayer.commodities}</p>
          <p>Trade Goods: {currentPlayer.tradeGoods}</p>
          <p>Victory Points: {currentPlayer.victoryPoints}</p>
        </div>
      )}
      {/* Add more player-specific components here */}
    </div>
  );
};

export default PlayerDashboard;