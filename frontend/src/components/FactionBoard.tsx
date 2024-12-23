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
  Checkbox,
  TextField,
} from '@mui/material';
import {
  fetchPlayerTechnologyCards,
  updatePlayerTechnologyCards,
  fetchVehicleCards,
  fetchGameState as apiFetchGameState,
} from '../services/api';
import { TechnologyCard } from '../types';
import { styled } from '@mui/material/styles';

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
    updatePlayerFactionHandler,
    setGameState,
  } = useContext(GameContext);

  const [isFlipped, setIsFlipped] = useState(false);
  const [isFactionDialogOpen, setIsFactionDialogOpen] = useState<boolean>(false);
  const [loading, setLoading] = useState(false);

  // State for Vehicles
  const [isVehicleDialogOpen, setIsVehicleDialogOpen] = useState<boolean>(false);
  const [vehicleLoading, setVehicleLoading] = useState<boolean>(false);
  const [allVehicleCards, setAllVehicleCards] = useState<TechnologyCard[]>([]);
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<number[]>([]);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState<string>('');
  const [tempSelectedVehicleIds, setTempSelectedVehicleIds] = useState<number[]>([]);

  // Define default positions for vehicles on the faction board
  const vehiclePositions: { [key: number]: { top: number; left: number } } = {
    // cardId: position
    17: { top: 124, left: -11 },  // War Sun
    10: { top: 124, left: 158 },  // Cruiser
    12: { top: 238, left: -11 },  // Dreadnought
    9: { top: 351, left: -11 },   // Carrier
    11: { top: 238, left: 158 },  // Destroyer
    13: { top: 351, left: 158 },  // Fighter
    15: { top: 238, left: 326 },  // PDS
    14: { top: 351, left: 326 },  // Infantry
    16: { top: 351, left: 495 },  // Space Dock

    // Faction Specific
    19: { top: 351, left: 326 },  // MGS - Crimson Legionnaire
  };

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

    // Add event listener for opening Manage Vehicles Dialog
    const handleOpenManageVehiclesDialog = () => {
      handleManageVehicles();
    };

    window.addEventListener('openManageVehiclesDialog', handleOpenManageVehiclesDialog);

    return () => {
      window.removeEventListener('openChangeFactionDialog', handleOpenFactionDialog);
      window.removeEventListener('openManageVehiclesDialog', handleOpenManageVehiclesDialog);
    };
  }, [allFactions]);

  // Vehicle Management Functions
  const loadVehicleCards = async () => {
    if (!playerId) return;
    setVehicleLoading(true);
    try {
      const vehicleCards = await fetchVehicleCards();
      const filteredVehicleCards = vehicleCards.filter(card =>
        card.faction === 'none' || card.faction === currentFaction
      );
      setAllVehicleCards(filteredVehicleCards);
      const playerTechCards = await fetchPlayerTechnologyCards(playerId);
      const selectedVehicles = playerTechCards
        .filter(card => card.type === 'vehicle')
        .map(card => card.id);
      setSelectedVehicleIds(selectedVehicles);
      setTempSelectedVehicleIds(selectedVehicles); // Pre-select
    } catch (error) {
      console.error('Error loading vehicle cards:', error);
    } finally {
      setVehicleLoading(false);
    }
  };

  const toggleTempVehicleSelection = (cardId: number) => {
    setTempSelectedVehicleIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleConfirmVehicles = async () => {
    if (!playerId) return;
    setVehicleLoading(true);
    try {
      await updatePlayerTechnologyCards(playerId, tempSelectedVehicleIds);
      // Refresh the game state after updating vehicles
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      setSelectedVehicleIds(tempSelectedVehicleIds);
      setIsVehicleDialogOpen(false);
    } catch (error) {
      console.error('Error updating vehicle cards:', error);
    } finally {
      setVehicleLoading(false);
    }
  };

  const handleManageVehicles = async () => {
    await loadVehicleCards();
    setIsVehicleDialogOpen(true);
  };

  const handleCloseVehicleDialog = () => {
    setIsVehicleDialogOpen(false);
    setTempSelectedVehicleIds(selectedVehicleIds);
  };

  // **Added useEffect to Listen for currentFaction Changes**
  useEffect(() => {
    if (playerId && currentFaction) {
      loadVehicleCards();
    }
  }, [playerId, currentFaction, isVehicleDialogOpen]);

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
            {/* Render Selected Vehicles */}
            {!isFlipped && selectedVehicleIds.map(cardId => {
            const vehicle = allVehicleCards.find(card => card.id === cardId);
            if (!vehicle) return null;
            const position = vehiclePositions[cardId] || { top: 0, left: 0 };
            return (
              <Box
              key={cardId}
              position="absolute"
              top={position.top}
              left={position.left}
              width="200px"
              sx={{ pointerEvents: 'none' }}
              >
              <img
                src={`/assets/${vehicle.image}`}
                alt={vehicle.name}
                style={{ width: '153px', height: '100px', borderRadius: '4px' }}
              />
              </Box>
            );
            })}
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

      {/* Vehicles Management Dialog */}
      <Dialog
        open={isVehicleDialogOpen}
        onClose={handleCloseVehicleDialog}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Manage Vehicles</DialogTitle>
        <DialogContent>
          {vehicleLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={3}>
              {/* Search Bar for Vehicle Cards */}
              <TextField
                label="Search Vehicles"
                variant="outlined"
                fullWidth
                margin="normal"
                value={vehicleSearchQuery}
                onChange={(e) => setVehicleSearchQuery(e.target.value)}
              />
              
              {/* Vehicle Cards List */}
              <Box display="flex" flexWrap="wrap" gap={3}>
                {allVehicleCards
                  .filter(card => card.name.toLowerCase().includes(vehicleSearchQuery.toLowerCase()))
                  .map(card => (
                    <Box
                      key={card.id}
                      position="relative"
                      width="200px"
                      textAlign="center"
                      sx={{
                        cursor: 'pointer',
                        border: tempSelectedVehicleIds.includes(card.id) ? '2px solid #1976d2' : '2px solid transparent',
                        borderRadius: '8px',
                        transition: 'border 0.3s, transform 0.3s',
                        '&:hover': {
                          border: '2px solid #1976d2',
                          transform: 'scale(1.05)',
                        },
                      }}
                      onClick={() => toggleTempVehicleSelection(card.id)}
                    >
                      <Checkbox
                        checked={tempSelectedVehicleIds.includes(card.id)}
                        onChange={() => toggleTempVehicleSelection(card.id)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          zIndex: 2,
                          '& .MuiSvgIcon-root': {
                            borderRadius: '50%',
                          },
                        }}
                      />
                      <img
                        src={`/assets/${card.image}`}
                        alt={card.name}
                        style={{ width: '100%', height: 'auto', borderRadius: '4px', zIndex: 1 }}
                      />
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseVehicleDialog}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmVehicles}
            disabled={vehicleLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default FactionBoard;