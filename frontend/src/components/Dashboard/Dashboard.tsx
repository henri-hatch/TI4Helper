// src/components/Dashboard/Dashboard.tsx
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import { Player, Objective } from '../../types';

const Dashboard: React.FC = () => {
  const { gameState } = useContext(GameContext);

  if (!gameState) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>Game Dashboard</h1>
      
      <h2>Victory Points</h2>
      <ul>
        {Object.entries(gameState.victoryPoints).map(([playerId, points]) => (
          <li key={playerId}>
            Player {playerId}: {points} points
          </li>
        ))}
      </ul>

      <h2>Public Objectives</h2>
      <ul>
        {gameState.objectives.map((objective: Objective) => (
          <li key={objective.id}>
            {objective.description} ({objective.points} points)
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Dashboard;
