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

// Add styled components for flip animation
const FlipCard = styled(Box)(({ theme }) => ({
  perspective: '1000px',
  width: '683px',
  height: '460px',
}));

const FlipCardInner = styled(Box)<{ flipped: boolean }>(({ theme, flipped }) => ({
  position: 'relative',
  width: '100%',
  height: '100%',
  textAlign: 'center',
  transition: 'transform 0.6s',
  transformStyle: 'preserve-3d',
  transform: flipped ? 'rotateY(180deg)' : 'none',
}));

const FlipCardFace = styled(Box)<{ front?: boolean }>(({ theme, front }) => ({
  position: 'absolute',
  width: '100%',
  height: '100%',
  backfaceVisibility: 'hidden',
  borderRadius: '8px',
  boxShadow: theme.shadows[5],
  ...(front
    ? {}
    : {
        transform: 'rotateY(180deg)',
      }),
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

  const handleFlip = () => {
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
      console.log('factions:', allFactions);
    };

    window.addEventListener('openChangeFactionDialog', handleOpenFactionDialog);
    
    return () => {
      window.removeEventListener('openChangeFactionDialog', handleOpenFactionDialog);
    };
  }, []);

  return (
    <Box padding={2} sx={{ overflowX: 'auto' }}>
      <Typography variant="h4" gutterBottom>Faction Board</Typography>
      
      {currentFaction && (
        <FlipCard onClick={handleFlip}>
          <FlipCardInner flipped={isFlipped}>
            <FlipCardFace front>
              <img
                src={`/assets/${allFactions.find(faction => faction.name === currentFaction)?.faction_board_front_image}`}
                alt="Faction Board Front"
                style={{ width: '100%', height: '100%' }}
              />
            </FlipCardFace>
            <FlipCardFace>
              <img
                src={`/assets/${allFactions.find(faction => faction.name === currentFaction)?.faction_board_back_image}`}
                alt="Faction Board Back"
                style={{ width: '100%', height: '100%' }}
              />
            </FlipCardFace>
          </FlipCardInner>
        </FlipCard>
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
                    src={`/assets/${faction.faction_reference_image}`}
                    alt={faction.name}
                    style={{ width: '250px', height: 'auto' }}
                  />
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

export default FactionBoard;