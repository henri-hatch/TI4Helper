// frontend/src/components/Dashboard/Dashboard.tsx
import React, { useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';
import { Player, Objective } from '../../types';

const Dashboard: React.FC = () => {
  const { gameState, playerId, playerName } = useContext(GameContext);

  if (!gameState) {
    return <div>Loading...</div>;
  }

  const currentPlayer = gameState.players.find((p) => p.playerId === playerId);

  return (
    <div>
      <h1>Game Dashboard</h1>

      {playerName && (
        <div>
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
        </div>
      )}

      <h2>All Players</h2>
      <ul>
        {gameState.players.map((player: Player) => (
          <li key={player.playerId}>
            {player.name}: {player.victoryPoints} points
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
