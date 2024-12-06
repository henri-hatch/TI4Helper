// frontend/src/components/Planets.tsx

import React, { useContext, useState, useEffect, MouseEvent, TouchEvent, Dispatch, SetStateAction } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Checkbox,
  CircularProgress,
  TextField,
  Menu,
  MenuItem,
  IconButton,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { Planet, DashboardPlanet, ExplorationCard } from '../types';
import { fetchGameState as apiFetchGameState, attachCardsToPlanet, fetchAttachTypeCards, explorePlanet } from '../services/api';

const PlanetsTab: React.FC = () => {
  const {
    gameState,
    setGameState,
    playerId,
    planets,
    getPlanetAttachments,
    updatePlayerPlanets,
    handleUpdatePlanetTapped,
  } = useContext(GameContext);

  const [selectedPlanetIds, setSelectedPlanetIds] = useState<number[]>([]);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    planetId: number | null;
  } | null>(null);
  
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPlanetsDialogOpen, setIsPlanetsDialogOpen] = useState<boolean>(false);
  const [attachmentModalOpen, setAttachmentModalOpen] = useState<boolean>(false);
  const [attachments, setAttachments] = useState<ExplorationCard[]>([]);
  const [selectedPlanetId, setSelectedPlanetId] = useState<number | null>(null);
  const [modifyAttachmentsModalOpen, setModifyAttachmentsModalOpen] = useState<boolean>(false);
  const [availableAttachments, setAvailableAttachments] = useState<ExplorationCard[]>([]);
  const [selectedAttachmentIds, setSelectedAttachmentIds] = useState<number[]>([]);

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

  const togglePlanetSelection = (planetId: number) => {
    setSelectedPlanetIds(prev => {
      if (prev.includes(planetId)) {
        return prev.filter(id => id !== planetId);
      } else {
        return [...prev, planetId];
      }
    });
  };

  const handleConfirmPlanets = async () => {
    await updatePlayerPlanets(selectedPlanetIds);
    setIsPlanetsDialogOpen(false);
  };

  const handleTapPlanet = async (planetId: number) => {
    const currentPlayer = gameState?.players.find(p => p.playerId === playerId);
    const planet = currentPlayer?.planets.find(pp => pp.id === planetId);
    if (!planet) return;

    const newTappedStatus = !planet.tapped;

    // Optimistically update UI by calling the context function
    await handleUpdatePlanetTapped(planetId, newTappedStatus);
  };

  const handleExplorePlanet = async (planetId: number | null) => {
    if (planetId !== null && playerId) { // Ensure playerId is available
      await explorePlanet(playerId, planetId); // Pass both arguments
      // Refresh game state or specific planet data if needed
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
    }
    handleCloseContextMenu();
  };

  const handleModifyAttachments = async (planetId: number | null) => {
    if (planetId !== null) {
      setSelectedPlanetId(planetId);
      // Fetch all attach-type cards without filtering out attached ones
      const attachCards = await fetchAttachTypeCards();

      setAvailableAttachments(attachCards);
      setModifyAttachmentsModalOpen(true);
    }
    handleCloseContextMenu();
  };

  const handleShowAttachments = async (planetId: number) => {
    const attachments = await getPlanetAttachments(planetId);
    setAttachments(attachments);
    setSelectedPlanetId(planetId);
    setAttachmentModalOpen(true);
  };

  const toggleAttachmentSelection = (cardId: number) => {
    setSelectedAttachmentIds((prev) => {
      if (prev.includes(cardId)) {
        return prev.filter((id) => id !== cardId);
      } else {
        return [...prev, cardId];
      }
    });
  };

  const handleConfirmAttachments = async () => {
    if (selectedPlanetId !== null) {
      // Fetch current attachments to determine additions and removals
      const currentAttachments = gameState?.players
        .find(p => p.playerId === playerId)
        ?.planets.find(pp => pp.id === selectedPlanetId)?.attachments || [];

      const currentAttachmentIds = currentAttachments.map(att => att.id);

      // Determine which attachments to add
      const attachmentsToAdd = selectedAttachmentIds.filter(id => !currentAttachmentIds.includes(id));

      // Determine which attachments to remove
      const attachmentsToRemove = currentAttachmentIds.filter(id => !selectedAttachmentIds.includes(id));

      // Attach new cards
      if (attachmentsToAdd.length > 0) {
        await attachCardsToPlanet(selectedPlanetId, attachmentsToAdd);
      }

      // Optionally, implement a detachCardsFromPlanet API call if you want to remove attachments
      // if (attachmentsToRemove.length > 0) {
      //   await detachCardsFromPlanet(selectedPlanetId, attachmentsToRemove);
      // }

      // Refresh game state to reflect changes
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);

      setModifyAttachmentsModalOpen(false);
    }
  };

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

  // Handle Touch Events for Mobile
  const handleTouchStart = (event: TouchEvent, planetId: number) => {
    event.preventDefault();
    const touch = event.touches[0];
    setContextMenu({
      mouseX: touch.clientX,
      mouseY: touch.clientY,
      planetId,
    });
  };

  const handleTouchEnd = () => {
    handleCloseContextMenu();
  };

  // Filtered planets based on search query
  const filteredPlanets = planets.filter(planet =>
    planet.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get selected planets from gameState
  const selectedPlanets = gameState?.players.find((p) => p.playerId === playerId)?.planets
    .map((pp) => {
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
                {filteredPlanets.map(planet => (
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

      {/* Attachments Modal */}
      <Dialog
        open={attachmentModalOpen}
        onClose={() => setAttachmentModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Attachments</DialogTitle>
        <DialogContent>
          {attachments.map((attachment) => (
            <Box key={attachment.id} mb={2}>
              <img
                src={`/assets/${attachment.image}`}
                alt={attachment.name}
                width="100%"
                style={{ maxWidth: 300, height: 'auto' }}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/default.jpg';
                }}
              />
            </Box>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAttachmentModalOpen(false)}>Close</Button>
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
        <MenuItem onClick={() => handleExplorePlanet(contextMenu?.planetId || null)}>
          Explore Planet
        </MenuItem>
        <MenuItem onClick={() => handleModifyAttachments(contextMenu?.planetId || null)}>
          Modify Attachments
        </MenuItem>
      </Menu>

      {/* Modify Attachments Modal */}
      <Dialog
        open={modifyAttachmentsModalOpen}
        onClose={() => setModifyAttachmentsModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Select Attachments</DialogTitle>
        <DialogContent>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {availableAttachments.map((card) => (
              <Box
                key={card.id}
                display="flex"
                flexDirection="column"
                alignItems="center"
                onClick={() => toggleAttachmentSelection(card.id)}
                sx={{
                  cursor: 'pointer',
                  border: selectedAttachmentIds.includes(card.id) ? '2px solid #1976d2' : '2px solid transparent',
                  borderRadius: '8px',
                  padding: '10px',
                  width: '100px',
                  opacity: selectedAttachmentIds.includes(card.id) ? 0.6 : 1,
                }}
              >
                <img
                  src={`/assets/${card.image}`}
                  alt={card.name}
                  width={80}
                  height={120}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/default.jpg';
                  }}
                />
                {/* Optionally, display the card name or other details */}
                {/* <Typography variant="body2">{card.name}</Typography> */}
              </Box>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModifyAttachmentsModalOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmAttachments} disabled={selectedAttachmentIds.length === 0}>
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

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
                  width: '100px', // Consistent width
                  height: '150px', // Fixed height
                }}
              >
                {/* Triple Dot Menu */}
                {planet.attachments && planet.attachments.length > 0 && (
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleShowAttachments(planet.id);
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
                )}

                {/* Planet Image */}
                <img
                  src={`/assets/planet_cards/${planet.name.toLowerCase()}.face.jpg`}
                  alt={planet.name}
                  width={100}
                  height={150} // Adjust height to maintain aspect ratio
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
                    width="100%"
                    style={{
                      position: 'absolute',
                      top: index === 0 ? 0 : 30 * index, // Adjust stacking offset
                      left: 0,
                      clipPath: 'inset(75% 0% 0% 0%)', // Show bottom 25%
                      transition: 'top 0.3s',
                    }}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/default.jpg';
                    }}
                    draggable={false}
                  />
                ))}
              </Box>
            ))}
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default PlanetsTab;