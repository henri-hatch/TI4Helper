import React, { useContext, useEffect } from 'react';
import { GameContext } from '../contexts/GameContext';
import { Box, Typography } from '@mui/material';
import { fetchPlayerExplorationCards } from '../services/api';

const ActionsTab: React.FC = () => {
  const { playerId, playerExplorationCards, setPlayerExplorationCards } = useContext(GameContext);

  useEffect(() => {
    if (playerId) {
      fetchPlayerExplorationCards(playerId).then(setPlayerExplorationCards);
    }
  }, [playerId, setPlayerExplorationCards]);

  return (
    <Box padding={2}>
      <Typography variant="h5" gutterBottom>
        Your Action and Relic Fragment Cards
      </Typography>
      <Box display="flex" flexWrap="wrap" gap={2}>
        {playerExplorationCards.map((card) => (
          <Box key={card.id} textAlign="center">
            <img
              src={`/assets/${card.image}`}
              alt={card.name}
              width={100}
              height={150}
              onError={(e) => {
                (e.target as HTMLImageElement).src = '/assets/default.jpg';
              }}
              draggable={false}
            />
            <Typography variant="body2">{card.name}</Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default ActionsTab;