// frontend/src/components/FactionBoard.tsx
import React from 'react';
import { Typography, Box } from '@mui/material';

interface FactionBoardProps {
  playerName: string | null;
  currentPlayer: any; // Replace with appropriate type
}

const FactionBoard: React.FC<FactionBoardProps> = ({ playerName, currentPlayer }) => {
  return (
    <Box padding={2}>
      {currentPlayer && (
        <Box mt={2}>
          <Typography variant="h6">Your Stats</Typography>
          <p>Resources: {currentPlayer.resources}</p>
          <p>Influence: {currentPlayer.influence}</p>
          <p>Commodities: {currentPlayer.commodities}</p>
          <p>Trade Goods: {currentPlayer.tradeGoods}</p>
          <p>Victory Points: {currentPlayer.victoryPoints}</p>
        </Box>
      )}
    </Box>
  );
};

export default FactionBoard;