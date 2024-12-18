// frontend/src/components/FactionBoard.tsx
import React, { useState, useEffect } from 'react';
import { useContext } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
} from '@mui/material';
import { styled } from '@mui/material/styles';

// Styled component for faction board
const Board = styled(Box)<{ flipped: boolean }>(({ flipped }) => ({
  position: 'relative',
  width: '100%',
  maxWidth: '800px',
  margin: '0 auto',
  cursor: 'pointer',
  transition: 'transform 0.6s',
  transformStyle: 'preserve-3d',
  transform: flipped ? 'rotateY(180deg)' : 'none',
}));

const BoardFace = styled(Box)<{ back?: boolean }>(({ back }) => ({
  position: 'relative',
  width: '100%',
  backfaceVisibility: 'hidden',
  transform: back ? 'rotateY(180deg)' : 'none',
}));

const FactionBoard: React.FC = () => {
  const { 
    playerId,
    currentFaction,
    allFactions,
    updatePlayerFactionHandler 
  } = useContext(GameContext);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isFactionDialogOpen, setIsFactionDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  const handleBoardClick = () => {
    setIsFlipped(!isFlipped);
  };

  const handleFactionSelect = async (factionName: string) => {
    if (!playerId) return;
    setLoading(true);
    try {
      await updatePlayerFactionHandler(factionName);
      setIsFactionDialogOpen(false);
    } catch (error) {
      console.error('Error selecting faction:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const handleOpenFactionDialog = () => {
      setIsFactionDialogOpen(true);
    };

    window.addEventListener('openChangeFactionDialog', handleOpenFactionDialog);
    
    return () => {
      window.removeEventListener('openChangeFactionDialog', handleOpenFactionDialog);
    };
  }, []);

  return (
    <Box padding={2}>
      <Typography variant="h4" gutterBottom>Faction Board</Typography>
      
      {currentFaction && (
        <Board flipped={isFlipped} onClick={handleBoardClick}>
          <BoardFace>
            <img
              src={`/assets/${currentFaction.factionBoardFrontImage}`}
              alt="Faction Board Front"
              style={{ width: '100%', height: 'auto' }}
            />
          </BoardFace>
          <BoardFace back>
            <img
              src={`/assets/${currentFaction.factionBoardBackImage}`}
              alt="Faction Board Back"
              style={{ width: '100%', height: 'auto' }}
            />
          </BoardFace>
        </Board>
      )}

      {!currentFaction && (
        <Typography>No faction selected. Use the menu to select a faction.</Typography>
      )}

      {/* Faction Selection Dialog */}
      <Dialog 
        open={isFactionDialogOpen} 
        onClose={() => setIsFactionDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Select Your Faction</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexWrap="wrap" gap={3}>
              {allFactions.map(faction => (
                <Box 
                  key={faction.name}
                  onClick={() => handleFactionSelect(faction.name)}
                  sx={{
                    cursor: 'pointer',
                    border: '2px solid transparent',
                    borderRadius: '8px',
                    padding: '10px',
                    '&:hover': {
                      border: '2px solid #1976d2',
                    },
                  }}
                >
                  <img
                    src={`/assets/${faction.factionReferenceImage}`}
                    alt={faction.name}
                    style={{ width: '200px', height: 'auto' }}
                  />
                  <Typography align="center" sx={{ textTransform: 'capitalize' }}>
                    {faction.name.replace(/_/g, ' ')}
                  </Typography>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsFactionDialogOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FactionBoard; // FIX IMAGES NOT SHOWING FOR CARDS