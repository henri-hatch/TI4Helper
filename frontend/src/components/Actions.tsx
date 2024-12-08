import React, { useContext, useEffect, useState, MouseEvent } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  Box,
  Typography,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  CircularProgress,
  Checkbox,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  fetchAllExplorationCards,
  fetchPlayerExplorationCards,
  updatePlayerExplorationCards,
  fetchGameState as apiFetchGameState,
} from '../services/api';
import { ExplorationCard } from '../types';
import { styled } from '@mui/material/styles';

const LONG_PRESS_DURATION = 500;

// Styled component for generic Card
const Card = styled(Box)<{ selected: boolean }>(({ theme, selected }) => ({
  position: 'relative',
  border: selected ? '2px solid #1976d2' : '2px solid transparent',
  borderRadius: '8px',
  padding: '10px',
  width: '100px',
  height: '150px',
  cursor: 'pointer',
  '&:hover': {
    border: '2px solid #1976d2',
  },
}));

const ActionsTab: React.FC = () => {
  const { playerId, playerExplorationCards, setPlayerExplorationCards, setGameState } = useContext(GameContext);

  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    cardId: number;
  } | null>(null);

  const [open, setOpen] = useState<boolean>(false);
  const [allCards, setAllCards] = useState<ExplorationCard[]>([]);
  const [selectedCardIds, setSelectedCardIds] = useState<number[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [touchTimeout, setTouchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (playerId) {
      fetchPlayerExplorationCards(playerId).then(setPlayerExplorationCards);
    }
  }, [playerId, setPlayerExplorationCards]);

  const handleRemoveCard = async () => {
    if (contextMenu && playerId) {
      const { cardId } = contextMenu;
      const updatedSelectedCardIds = selectedCardIds.filter(id => id !== cardId);
      try {
        await updatePlayerExplorationCards(playerId, updatedSelectedCardIds);
        const updatedCards = await fetchPlayerExplorationCards(playerId);
        setPlayerExplorationCards(updatedCards);
        const updatedGameState = await apiFetchGameState();
        setGameState(updatedGameState);
        setSelectedCardIds(updatedSelectedCardIds);
        handleCloseContextMenu();
      } catch (error) {
        console.error('Error removing exploration card:', error);
      }
    }
  };

  const handleOpen = () => {
    setOpen(true);
    loadCards();
  };

  const handleClose = () => {
    setOpen(false);
  };

  const loadCards = async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      const [cards, playerCards] = await Promise.all([
        fetchAllExplorationCards(['action', 'relic_fragment']),
        fetchPlayerExplorationCards(playerId),
      ]);
      setAllCards(cards);
      setSelectedCardIds(playerCards.map(card => card.id));
    } catch (error) {
      console.error('Error loading exploration cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleCard = (cardId: number) => {
    setSelectedCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleConfirm = async () => {
    if (!playerId) return;
    setLoading(true);
    try {
      await updatePlayerExplorationCards(playerId, selectedCardIds);
      const updatedCards = await fetchPlayerExplorationCards(playerId);
      setPlayerExplorationCards(updatedCards);
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      handleClose();
    } catch (error) {
      console.error('Error updating exploration cards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleContextMenu = (event: MouseEvent, cardId: number) => {
    event.preventDefault();
    setContextMenu(
      contextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            cardId,
          }
        : null,
    );
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  // Handle Touch Events for Mobile with Long Press Detection
  const handleTouchStart = (event: React.TouchEvent, cardId: number) => {
    event.preventDefault();
    const touch = event.touches[0];
    const timeout = setTimeout(() => {
      setContextMenu({
        mouseX: touch.clientX - 2,
        mouseY: touch.clientY - 4,
        cardId,
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

  useEffect(() => {
    const listener = () => {
      handleOpen();
    };
    window.addEventListener('openManageExplorationCardsDialog', listener);
    return () => {
      window.removeEventListener('openManageExplorationCardsDialog', listener);
    };
  }, []);

  return (
    <Box padding={2}>
      <Typography variant="h4" gutterBottom>
        Actions
      </Typography>

      {/* Strategy Cards Section */}
      <Box marginBottom={4}>
        <Typography variant="h5" gutterBottom>
          Strategy Cards
        </Typography>
        {/* Placeholder for Strategy Cards */}
        <Typography variant="body1">No Strategy Cards available.</Typography>
      </Box>

      <Divider />

      {/* Exploration Cards Section */}
      <Box marginY={4}>
        <Typography variant="h5" gutterBottom>
          Exploration Cards
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2} marginTop={2}>
          {playerExplorationCards.map((card) => (
            <Box
              key={card.id}
              position="relative"
              onContextMenu={(e) => handleContextMenu(e, card.id)}
              onTouchStart={(e) => handleTouchStart(e, card.id)}
              onTouchEnd={handleTouchEnd}
              sx={{
                cursor: 'pointer',
                WebkitTouchCallout: 'none',
                userSelect: 'none',
                width: '100px',
                height: '150px',
              }}
            >
              <img
                src={`/assets/${card.image}`}
                alt={card.name}
                width="100%"
                height="100%"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/default.jpg';
                }}
                draggable={false}
              />
            </Box>
          ))}
        </Box>
      </Box>

      <Divider />

      {/* Relics Section */}
      <Box marginY={4}>
        <Typography variant="h5" gutterBottom>
          Relics
        </Typography>
        {/* Placeholder for Relics */}
        <Typography variant="body1">No Relics available.</Typography>
      </Box>

      <Divider />

      {/* Action Cards Section */}
      <Box marginY={4}>
        <Typography variant="h5" gutterBottom>
          Action Cards
        </Typography>
        {/* Placeholder for Action Cards */}
        <Typography variant="body1">No Action Cards available.</Typography>
      </Box>

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
        <MenuItem onClick={handleRemoveCard}>Remove Exploration Card</MenuItem>
      </Menu>

      {/* Manage Exploration Cards Modal */}
      <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
        <DialogTitle>Manage Exploration Cards</DialogTitle>
        <DialogContent>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexWrap="wrap" gap={2}>
              {allCards.map(card => (
                <Card
                  key={card.id}
                  selected={selectedCardIds.includes(card.id)}
                  onClick={() => toggleCard(card.id)}
                >
                  <img
                    src={`/assets/${card.image}`}
                    alt={card.name}
                    width="100%"
                    height="100%"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/default.jpg';
                    }}
                    draggable={false}
                  />
                  <Checkbox
                    checked={selectedCardIds.includes(card.id)}
                    icon={<CheckCircleIcon color="disabled" />}
                    checkedIcon={<CheckCircleIcon color="primary" />}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                </Card>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirm}
            disabled={loading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActionsTab;