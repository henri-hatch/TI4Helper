// frontend/src/components/Technology.tsx
import React, { useContext, useEffect, useState, MouseEvent, TouchEvent } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Checkbox,
  TextField,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { TechnologyCard } from '../types';
import { styled } from '@mui/material/styles';
import {
  fetchAllTechnologyCards,
  fetchPlayerTechnologyCards,
  updatePlayerTechnologyCards,
  updateTechnologyCardTapped,
  fetchGameState as apiFetchGameState,
} from '../services/api';

const LONG_PRESS_DURATION = 500;

// Update Card styled component
const Card = styled(Box)<{ selected: boolean; tapped: boolean; onClick?: () => void }>(({ theme, selected, tapped }) => ({
  position: 'relative',
  border: selected ? '2px solid #1976d2' : '2px solid transparent',
  borderRadius: '8px',
  padding: '10px',
  width: '150px',
  height: '100px',
  cursor: 'pointer',
  transform: tapped ? 'rotate(90deg)' : 'none',
  transformOrigin: 'center center',
  transition: 'transform 0.3s ease',
  '&:hover': {
    border: '2px solid #1976d2',
  },
}));

const TechnologyTab: React.FC = () => {
  const { 
    playerId, 
    setGameState,
    playerTechnologyCards,
    setPlayerTechnologyCards,
    updatePlayerTechnologyCardsHandler,
    currentFaction
  } = useContext(GameContext);

  const [techContextMenu, setTechContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    cardId: number;
  } | null>(null);
  const [techOpen, setTechOpen] = useState<boolean>(false);
  const [allTechCards, setAllTechCards] = useState<TechnologyCard[]>([]);
  const [selectedTechCardIds, setSelectedTechCardIds] = useState<number[]>([]);
  const [techLoading, setTechLoading] = useState<boolean>(false);
  const [techTouchTimeout, setTechTouchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [techSearchQuery, setTechSearchQuery] = useState<string>('');

  useEffect(() => {
    if (playerId) {
      loadPlayerTechnology();
    }
  }, [playerId]);

  useEffect(() => {
    const handleOpenTechnologyDialog = () => {
      handleOpenTech();
    };
    window.addEventListener('openManageTechnologyDialog', handleOpenTechnologyDialog);
    return () => {
      window.removeEventListener('openManageTechnologyDialog', handleOpenTechnologyDialog);
    };
  }, []);

  const loadPlayerTechnology = async () => {
    if (!playerId) return;
    try {
      const cards = await fetchPlayerTechnologyCards(playerId);
      setPlayerTechnologyCards(cards);
    } catch (error) {
      console.error('Error loading player technology:', error);
    }
  };

  const handleOpenTech = () => {
    setTechOpen(true);
    loadTechCards();
  };

  const handleCloseTech = () => {
    setTechOpen(false);
    setTechSearchQuery('');
  };

  const loadTechCards = async () => {
    if (!playerId) return;
    setTechLoading(true);
    try {
      const [cards, playerCards] = await Promise.all([
        fetchAllTechnologyCards(),
        fetchPlayerTechnologyCards(playerId),
      ]);
      setAllTechCards(cards);
      setSelectedTechCardIds(playerCards.map(card => card.id));
    } catch (error) {
      console.error('Error loading technology cards:', error);
    } finally {
      setTechLoading(false);
    }
  };

  // Update handleTechContextMenu to handle all cards, not just action types
  const handleTechContextMenu = (event: MouseEvent, cardId: number) => {
    event.preventDefault();
    setTechContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      cardId,
    });
  };

  // Update handleTechTouchStart to handle all cards and prevent native menu
  const handleTechTouchStart = (event: TouchEvent, cardId: number) => {
    event.preventDefault();
    event.stopPropagation();
    const touch = event.touches[0];
    const timeout = setTimeout(() => {
      setTechContextMenu({
        mouseX: touch.clientX - 2,
        mouseY: touch.clientY - 4,
        cardId,
      });
    }, LONG_PRESS_DURATION);
    setTechTouchTimeout(timeout);
  };

  const handleTechTouchEnd = () => {
    if (techTouchTimeout) {
      clearTimeout(techTouchTimeout);
      setTechTouchTimeout(null);
    }
  };

  const handleCloseTechContextMenu = () => {
    setTechContextMenu(null);
  };

  // Update handleTapTechnology to take cardId directly:
  const handleTapTechnology = async (cardId: number) => {
    if (!playerId) return;
    const card = playerTechnologyCards.find(c => c.id === cardId);
    if (!card) return;

    try {
      await updateTechnologyCardTapped(playerId, cardId, !card.tapped);
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      setPlayerTechnologyCards(prev => 
        prev.map(c => c.id === cardId ? {...c, tapped: !c.tapped} : c)
      );
    } catch (error) {
      console.error('Error tapping technology card:', error);
    }
  };

  const toggleTechCard = (cardId: number) => {
    setSelectedTechCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleConfirmTech = async () => {
    if (!playerId) return;
    setTechLoading(true);
    try {
      await updatePlayerTechnologyCardsHandler(selectedTechCardIds);
      handleCloseTech();
    } catch (error) {
      console.error('Error updating technology cards:', error);
    } finally {
      setTechLoading(false);
    }
  };

  // Add new handler:
  const handleCardClick = (card: TechnologyCard) => {
    if (card.type === 'action') {
      handleTapTechnology(card.id);
    }
  };

  // Add remove handler
  const handleRemoveTechnology = async (cardId: number) => {
    if (!playerId) return;
    const updatedCards = playerTechnologyCards.filter(card => card.id !== cardId);
    const updatedCardIds = updatedCards.map(card => card.id);
    try {
      await updatePlayerTechnologyCards(playerId, updatedCardIds);
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      setPlayerTechnologyCards(updatedCards);
      handleCloseTechContextMenu();
    } catch (error) {
      console.error('Error removing technology:', error);
    }
  };

  return (
    <Box padding={2}>
      <Typography variant="h4" gutterBottom>Technology</Typography>

      {/* Technology sections by faction */}
      {['propulsion', 'warfare', 'biotic', 'cybernetic'].map((faction, index) => (
        <React.Fragment key={faction}>
          <Box marginY={4}>
            <Typography variant="h5" sx={{ textTransform: 'capitalize' }} gutterBottom>
              {faction} Technology
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={2} marginTop={2}>
              {playerTechnologyCards
                .filter(card => card.faction === faction)
                .map(card => (
                  <Card
                    key={card.id}
                    selected={false}
                    tapped={card.tapped || false}
                    onClick={() => handleCardClick(card)}
                    onContextMenu={(e) => handleTechContextMenu(e, card.id)}
                    onTouchStart={(e) => handleTechTouchStart(e, card.id)}
                    onTouchEnd={handleTechTouchEnd}
                    sx={{ 
                      WebkitTouchCallout: 'none',
                      userSelect: 'none',
                    }}
                  >
                    <img
                      src={`/assets/${card.image}`}
                      alt={card.name}
                      width="150px"
                      height="100px"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/default.jpg';
                      }}
                      draggable={false}
                    />
                  </Card>
                ))}
            </Box>
          </Box>
          {index < 3 && <Divider />} {/* Add divider between sections except after last one */}
        </React.Fragment>
      ))}

      <Divider />

      {/* Faction Specific Technology Section */}
      <Box marginY={4}>
        <Typography variant="h5" gutterBottom>
          Faction Technology
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2} marginTop={2}>
          {playerTechnologyCards
            .filter(card => card.faction === currentFaction && card.type !== 'vehicle')
            .map(card => (
              <Card
                key={card.id}
                selected={false}
                tapped={card.tapped || false}
                onClick={() => handleCardClick(card)}
                onContextMenu={(e) => handleTechContextMenu(e, card.id)}
                onTouchStart={(e) => handleTechTouchStart(e, card.id)}
                onTouchEnd={handleTechTouchEnd}
                sx={{ WebkitTouchCallout: 'none' }}
              >
                <img
                  src={`/assets/${card.image}`}
                  alt={card.name}
                  width="150px"
                  height="100px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/default.jpg';
                  }}
                  draggable={false}
                />
              </Card>
            ))}
        </Box>
      </Box>

      {/* Context Menu */}
      <Menu
        open={techContextMenu !== null}
        onClose={handleCloseTechContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          techContextMenu !== null
            ? { top: techContextMenu.mouseY, left: techContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => handleRemoveTechnology(techContextMenu?.cardId!)}>
          Remove Technology
        </MenuItem>
      </Menu>

      {/* Technology Management Dialog */}
      <Dialog open={techOpen} onClose={handleCloseTech} maxWidth="md" fullWidth>
        <DialogTitle>Manage Technology</DialogTitle>
        <DialogContent>
          {techLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={3}>
              <TextField
                label="Search Technology"
                variant="outlined"
                fullWidth
                margin="normal"
                value={techSearchQuery}
                onChange={(e) => setTechSearchQuery(e.target.value)}
              />
              
              <Box display="flex" flexWrap="wrap" gap={3}>
                {allTechCards
                  .filter(card => 
                    card.name.toLowerCase().includes(techSearchQuery.toLowerCase()) &&
                    card.type !== 'vehicle' &&
                    (card.faction === currentFaction || ['propulsion', 'warfare', 'biotic', 'cybernetic'].includes(card.faction))
                  )
                  .map(card => (
                    <Box key={card.id} position="relative" width="150px" textAlign="center">
                      <Card
                        selected={selectedTechCardIds.includes(card.id)}
                        tapped={false}
                        onClick={() => toggleTechCard(card.id)}
                      >
                        <img
                          src={`/assets/${card.image}`}
                          alt={card.name}
                          width="150px"
                          height="100px"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/default.jpg';
                          }}
                          draggable={false}
                        />
                        <Checkbox
                          checked={selectedTechCardIds.includes(card.id)}
                          icon={<CheckCircleIcon color="disabled" />}
                          checkedIcon={<CheckCircleIcon color="primary" />}
                          sx={{ position: 'absolute', top: 8, right: 8 }}
                        />
                      </Card>
                    </Box>
                  ))}
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseTech} disabled={techLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmTech}
            disabled={techLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default TechnologyTab;