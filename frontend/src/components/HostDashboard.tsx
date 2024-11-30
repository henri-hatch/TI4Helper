// src/components/HostDashboard.tsx
import React, { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';

const HostDashboard: React.FC = () => {
  const { gameState } = useContext(GameContext);

  if (!gameState) return <div>Loading...</div>;

  return (
    <div>
      <h1>Host Dashboard</h1>
      <h2>Victory Points</h2>
      <ul>
        {gameState.players.map(player => (
          <li key={player.playerId}>
            {player.name}: {player.victoryPoints} points
          </li>
        ))}
      </ul>
      {/* Add more host-specific components here */}
    </div>
  );
};

export default HostDashboard;