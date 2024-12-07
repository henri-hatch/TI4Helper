// frontend/src/components/Planets.tsx

import React, { useContext, useState, useEffect, MouseEvent, TouchEvent } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  CircularProgress,
  TextField,
  Menu,
  MenuItem,
  Checkbox,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DashboardPlanet, ExplorationCard } from '../types';
import { 
  fetchGameState as apiFetchGameState, 
  attachCardsToPlanet, 
  detachCardsFromPlanet, 
  fetchAttachTypeCards, 
  deletePlanet as apiDeletePlanet,
  explorePlanet,
} from '../services/api';

const LONG_PRESS_DURATION = 500; // Duration in milliseconds

const PlanetsTab: React.FC = () => {
  const {
    gameState,
    setGameState,
    playerId,
    planets,
    getPlanetAttachments,
    updatePlayerPlanets,
    handleUpdatePlanetTapped,
    explorePlanet: explorePlanetHandler, // Destructure and rename
    // ... other context methods
  } = useContext(GameContext);

  // Existing state variables
  const [selectedPlanetIds, setSelectedPlanetIds] = useState<number[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    planetId: number | null;
  } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPlanetsDialogOpen, setIsPlanetsDialogOpen] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<ExplorationCard[]>([]);
  const [selectedPlanetId, setSelectedPlanetId] = useState<number | null>(null);
  
  // New state variables for Add and Remove Attachments
  const [addAttachmentsModalOpen, setAddAttachmentsModalOpen] = useState<boolean>(false);
  const [removeAttachmentsModalOpen, setRemoveAttachmentsModalOpen] = useState<boolean>(false);
  const [availableAttachments, setAvailableAttachments] = useState<ExplorationCard[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<number[]>([]);
  const [attachmentsToRemove, setAttachmentsToRemove] = useState<number[]>([]);
  const [touchTimeout, setTouchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (gameState && playerId) {
      const currentPlayer = gameState.players.find(p => p.playerId === playerId);
      if (currentPlayer && currentPlayer.planets) {
        setSelectedPlanetIds(currentPlayer.planets.map(pp => pp.id));
      }
    }
    // Listen for custom event to open planet dialog
    const openDialog = () => setIsPlanetsDialogOpen(true);
    window.addEventListener('openSelectPlanetsDialog', openDialog);
    return () => {
      window.removeEventListener('openSelectPlanetsDialog', openDialog);
    };
  }, [gameState, playerId]);

  // Toggle Planet Selection
  const togglePlanetSelection = (planetId: number) => {
    setSelectedPlanetIds(prev => {
      if (prev.includes(planetId)) {
        return prev.filter(id => id !== planetId);
      } else {
        return [...prev, planetId];
      }
    });
  };

  // Handle Confirm Planets
  const handleConfirmPlanets = async () => {
    await updatePlayerPlanets(selectedPlanetIds);
    setIsPlanetsDialogOpen(false);
  };

  // Handle Tap Planet
  const handleTapPlanet = async (planetId: number) => {
    const currentPlayer = gameState?.players.find(p => p.playerId === playerId);
    const planet = currentPlayer?.planets.find(pp => pp.id === planetId);
    if (!planet) return;

    const newTappedStatus = !planet.tapped;

    await handleUpdatePlanetTapped(planetId, newTappedStatus);
  };

  // Handle Explore Planet
  const handleExplorePlanet = async (planetId: number) => {
    if (planetId !== null) {
      await explorePlanetHandler(planetId); // Use the handler from context
    }
    handleCloseContextMenu();
  };

  // Handle Add Attachments
  const handleAddAttachments = async (planetId: number) => {
    if (planetId !== null) {
      setSelectedPlanetId(planetId);
      // Fetch all attach-type cards without filtering out attached ones
      const attachCards = await fetchAttachTypeCards();
      setAvailableAttachments(attachCards);
      setAddAttachmentsModalOpen(true);
      setSelectedAttachmentIds([]); // Reset selection
    }
    handleCloseContextMenu();
  };

  // Handle Remove Attachments
  const handleRemoveAttachments = async (planetId: number) => {
    if (planetId !== null) {
      setSelectedPlanetId(planetId);
      // Fetch current attachments
      const currentAttachments = await getPlanetAttachments(planetId);
      setAttachments(currentAttachments);
      setRemoveAttachmentsModalOpen(true);
      setAttachmentsToRemove([]); // Reset selection
    }
    handleCloseContextMenu();
  };

  // Other functions like toggleAttachmentSelection, handleConfirmAddAttachments, etc.

  // Handle Context Menu
  const handleContextMenu = (event: MouseEvent, planetId: number) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            planetId,
          }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Handle Touch Events for Mobile with Long Press Detection
  const handleTouchStart = (event: TouchEvent, planetId: number) => {
    event.preventDefault();
    const touch = event.touches[0];
    const timeout = setTimeout(() => {
      setContextMenu({
        mouseX: touch.clientX - 2,
        mouseY: touch.clientY - 4,
        planetId,
      });
    }, LONG_PRESS_DURATION);
    setTouchTimeout(timeout);
  };

  const handleTouchEnd = () => {
    if (touchTimeout) {
      clearTimeout(touchTimeout);
      setTouchTimeout(null);
    }
  };

  // Toggle Attachment Selection for Adding
  const toggleAttachmentSelection = (cardId: number) => {
    setSelectedAttachmentIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  // Toggle Attachment Selection for Removing
  const toggleAttachmentToRemove = (cardId: number) => {
    setAttachmentsToRemove((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  // Handle Confirm Add Attachments
  const handleConfirmAddAttachments = async () => {
    if (selectedPlanetId !== null) {
      // Attach new cards
      if (selectedAttachmentIds.length > 0) {
        await attachCardsToPlanet(selectedPlanetId, selectedAttachmentIds);
      }

      // Refresh game state to reflect changes
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);

      setAddAttachmentsModalOpen(false);
      setSelectedAttachmentIds([]); // Reset selection
    }
  };

  // Handle Confirm Remove Attachments
  const handleConfirmRemoveAttachments = async () => {
    if (selectedPlanetId !== null && attachmentsToRemove.length > 0) {
      await detachCardsFromPlanet(selectedPlanetId, attachmentsToRemove);

      // Refresh game state to reflect changes
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);

      setRemoveAttachmentsModalOpen(false);
      setAttachmentsToRemove([]); // Reset selection
    }
  };

  // Filtered planets based on search query
  const filteredPlanets = planets.filter((planet) =>
    planet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected planets from gameState
  const selectedPlanets = gameState?.players
    .find((p) => p.playerId === playerId)
    ?.planets.map((pp) => {
      const planetInfo = planets.find((p) => p.id === pp.id);
      return planetInfo
        ? {
            ...planetInfo,
            tapped: pp.tapped,
            attachments: pp.attachments,
          }
        : null;
    })
    .filter(Boolean) as DashboardPlanet[] | undefined;

  return (
    <Box padding={2}>
      {/* Planets Dialog */}
      <Dialog
        open={isPlanetsDialogOpen}
        onClose={() => setIsPlanetsDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Your Planets</DialogTitle>
        <DialogContent>
          {planets.length === 0 ? (
            <CircularProgress />
          ) : (
            <>
              {/* Search Bar */}
              <TextField
                label="Search Planets"
                variant="outlined"
                fullWidth
                margin="normal"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {/* Planets List */}
              <Box display="flex" flexWrap="wrap" gap={2}>
                {filteredPlanets.map((planet) => (
                  <Box
                    key={planet.id}
                    display="flex"
                    alignItems="center"
                    flexDirection="column"
                    onClick={() => togglePlanetSelection(planet.id)}
                    sx={{
                      cursor: 'pointer',
                      position: 'relative',
                      border: selectedPlanetIds.includes(planet.id)
                        ? '2px solid #1976d2'
                        : '2px solid transparent',
                      borderRadius: '8px',
                      padding: '10px',
                      width: '100px',
                      height: '150px',
                    }}
                  >
                    <img
                      src={`/assets/planet_cards/${planet.name.toLowerCase()}.face.jpg`}
                      alt={planet.name}
                      width={100}
                      height={150}
                      style={{
                        filter: 'none',
                        transition: 'filter 0.3s',
                      }}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/default.jpg';
                      }}
                      draggable={false}
                    />
                    <Checkbox
                      checked={selectedPlanetIds.includes(planet.id)}
                      icon={<CheckCircleIcon color="disabled" />}
                      checkedIcon={<CheckCircleIcon color="primary" />}
                      sx={{ position: 'absolute', top: 8, left: 8 }}
                      onChange={() => togglePlanetSelection(planet.id)}
                    />
                  </Box>
                ))}
              </Box>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPlanetsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmPlanets}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Context Menu for Planets */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem
          onClick={() => {
            if (contextMenu && typeof contextMenu.planetId === 'number') {
              handleExplorePlanet(contextMenu.planetId);
            }
          }}
        >
          Explore Planet
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu && typeof contextMenu.planetId === 'number') {
              handleAddAttachments(contextMenu.planetId);
            }
          }}
        >
          Add Attachments
        </MenuItem>
        <MenuItem
          onClick={() => {
            if (contextMenu && typeof contextMenu.planetId === 'number') {
              handleRemoveAttachments(contextMenu.planetId);
            }
          }}
        >
          Remove Attachments
        </MenuItem>
      </Menu>

      {/* Selected Planets Dashboard */}
      <Box padding="20px">
        <Typography variant="h5" gutterBottom>
          Your Planets
        </Typography>
        {selectedPlanets && selectedPlanets.length === 0 ? (
          <Typography variant="body1">No planets selected.</Typography>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={2}>
            {selectedPlanets?.map((planet) => (
              <Box
                key={planet.id}
                position="relative"
                onClick={() => handleTapPlanet(planet.id)}
                onContextMenu={(e) => handleContextMenu(e, planet.id)}
                onTouchStart={(e) => handleTouchStart(e, planet.id)}
                onTouchEnd={handleTouchEnd}
                sx={{
                  cursor: 'pointer',
                  WebkitTouchCallout: 'none',
                  userSelect: 'none',
                  opacity: planet.tapped ? 0.6 : 1,
                  width: '100px',
                  height: '150px',
                  border: '2px solid transparent',
                  borderRadius: '8px',
                  padding: '10px',
                }}
              >
                <img
                  src={`/assets/planet_cards/${planet.name.toLowerCase()}.face.jpg`}
                  alt={planet.name}
                  width={100}
                  height={150}
                  style={{
                    filter: 'none',
                    transition: 'filter 0.3s',
                  }}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/default.jpg';
                  }}
                  draggable={false}
                />

                {/* Attached Cards Peeking */}
                {planet.attachments?.map((attachment, index) => (
                  <img
                    key={attachment.id}
                    src={`/assets/${attachment.image}`}
                    alt={attachment.name}
                    width="80"
                    height="120"
                    style={{
                      position: 'absolute',
                      top: 30 * (index + 1),
                      left: 0,
                      zIndex: 1,
                      clipPath: 'inset(75% 0% 0% 0%)', // Show bottom 25%
                      transition: 'top 0.3s',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/default.jpg';
                    }}
                    draggable={false}
                  />
                ))}

                {/* Triple Dot Menu */}
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    // You can add additional menu actions here
                  }}
                  sx={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    zIndex: 1,
                  }}
                >
                  <MoreVertIcon fontSize="small" />
                </IconButton>

                {/* Tapped Indicator */}
                {planet.tapped && (
                  <Typography
                    variant="caption"
                    color="error"
                    sx={{ position: 'absolute', bottom: 4, left: '50%', transform: 'translateX(-50%)' }}
                  >
                    Tapped
                  </Typography>
                )}
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Add Attachments Modal */}
      <Dialog
        open={addAttachmentsModalOpen}
        onClose={() => setAddAttachmentsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Attachments to {selectedPlanetId !== null && planets.find(p => p.id === selectedPlanetId)?.name}</DialogTitle>
        <DialogContent>
          {availableAttachments.length === 0 ? (
            <CircularProgress />
          ) : (
            <Box display="flex" flexWrap="wrap" gap={2}>
              {availableAttachments.map((card) => (
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
                  <Checkbox
                    checked={selectedAttachmentIds.includes(card.id)}
                    onChange={() => toggleAttachmentSelection(card.id)}
                    icon={<CheckCircleIcon color="disabled" />}
                    checkedIcon={<CheckCircleIcon color="primary" />}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddAttachmentsModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmAddAttachments}
            disabled={selectedAttachmentIds.length === 0}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Remove Attachments Modal */}
      <Dialog
        open={removeAttachmentsModalOpen}
        onClose={() => setRemoveAttachmentsModalOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Remove Attachments from {selectedPlanetId !== null && planets.find(p => p.id === selectedPlanetId)?.name}</DialogTitle>
        <DialogContent>
          {attachments.length === 0 ? (
            <CircularProgress />
          ) : (
            <Box display="flex" flexWrap="wrap" gap={2}>
              {attachments.map((card) => (
                <Box key={card.id} textAlign="center">
                  <img
                    src={`/assets/${card.image}`}
                    alt={card.name}
                    width={80}
                    height={120}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/default.jpg';
                    }}
                    draggable={false}
                  />
                  <Checkbox
                    checked={attachmentsToRemove.includes(card.id)}
                    onChange={() => toggleAttachmentToRemove(card.id)}
                    icon={<CheckCircleIcon color="disabled" />}
                    checkedIcon={<CheckCircleIcon color="primary" />}
                  />
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRemoveAttachmentsModalOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmRemoveAttachments}
            disabled={attachmentsToRemove.length === 0}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PlanetsTab;