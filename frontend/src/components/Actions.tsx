import React, { useContext, useEffect, useState, MouseEvent, TouchEvent } from 'react';
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
  IconButton,
  TextField,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import {
  fetchAllExplorationCards,
  fetchPlayerExplorationCards,
  updatePlayerExplorationCards,
  fetchAllStrategyCards,
  fetchPlayerStrategyCards,
  updatePlayerStrategyCards,
  updateStrategyCardTradeGood,
  fetchGameState as apiFetchGameState,
  fetchAllActionCards,
  fetchPlayerActionCards,
  updatePlayerActionCards,
  fetchAllRelicCards,
  fetchPlayerRelicCards,
  updatePlayerRelicCards,
} from '../services/api';
import { ExplorationCard, StrategyCard, ActionCard, RelicCard } from '../types';
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
  const {
    playerId,
    playerExplorationCards,
    setPlayerExplorationCards,
    playerStrategyCards,
    setPlayerStrategyCards,
    playerActionCards,
    setPlayerActionCards,
    setGameState,
    playerRelicCards,
    setPlayerRelicCards,
    combineRelicFragments,
  } = useContext(GameContext);

  // State for Exploration Cards
  const [explorationContextMenu, setExplorationContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    cardId: number;
  } | null>(null);
  const [explorationOpen, setExplorationOpen] = useState<boolean>(false);
  const [explorationAllCards, setExplorationAllCards] = useState<ExplorationCard[]>([]);
  const [selectedExplorationCardIds, setSelectedExplorationCardIds] = useState<number[]>([]);
  const [explorationLoading, setExplorationLoading] = useState<boolean>(false);
  const [explorationTouchTimeout, setExplorationTouchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [explorationSearchQuery, setExplorationSearchQuery] = useState<string>('');

  // State for Strategy Cards
  const [strategyContextMenu, setStrategyContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    cardId: number;
  } | null>(null);
  const [strategyOpen, setStrategyOpen] = useState<boolean>(false);
  const [strategyAllCards, setStrategyAllCards] = useState<StrategyCard[]>([]);
  const [selectedStrategyCardIds, setSelectedStrategyCardIds] = useState<number[]>([]);
  const [strategyLoading, setStrategyLoading] = useState<boolean>(false);
  const [strategyTouchTimeout, setStrategyTouchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);

  // State for Action Cards
  const [actionContextMenu, setActionContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    cardId: number;
  } | null>(null);
  const [actionOpen, setActionOpen] = useState<boolean>(false);
  const [actionAllCards, setActionAllCards] = useState<ActionCard[]>([]);
  const [selectedActionCardIds, setSelectedActionCardIds] = useState<number[]>([]);
  const [actionLoading, setActionLoading] = useState<boolean>(false);
  const [actionTouchTimeout, setActionTouchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [actionSearchQuery, setActionSearchQuery] = useState<string>('');

  // State for relics
  const [relicContextMenu, setRelicContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    cardId: number;
  } | null>(null);
  const [relicOpen, setRelicOpen] = useState<boolean>(false);
  const [relicAllCards, setRelicAllCards] = useState<RelicCard[]>([]);
  const [selectedRelicCardIds, setSelectedRelicCardIds] = useState<number[]>([]);
  const [relicLoading, setRelicLoading] = useState<boolean>(false);
  const [relicTouchTimeout, setRelicTouchTimeout] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [relicSearchQuery, setRelicSearchQuery] = useState<string>('');
  const [combineRelicOpen, setCombineRelicOpen] = useState<boolean>(false);
  const [selectedFragmentIds, setSelectedFragmentIds] = useState<number[]>([]);

  useEffect(() => {
    if (playerId) {
      fetchPlayerExplorationCards(playerId).then(setPlayerExplorationCards);
      fetchPlayerStrategyCards(playerId).then(setPlayerStrategyCards);
      fetchPlayerActionCards(playerId).then(setPlayerActionCards);
      fetchPlayerRelicCards(playerId).then(setPlayerRelicCards); // Add this line
    }
  }, [playerId, setPlayerExplorationCards, setPlayerStrategyCards, setPlayerActionCards, setPlayerRelicCards]);

  // Handlers for Exploration Cards
  const handleRemoveExplorationCard = async () => {
    if (explorationContextMenu && playerId) {
      const { cardId } = explorationContextMenu;
      const updatedCards = playerExplorationCards.filter(card => card.id !== cardId);
      const updatedCardIds = updatedCards.map(card => card.id);
      try {
        await updatePlayerExplorationCards(playerId, updatedCardIds);
        const updatedGameState = await apiFetchGameState();
        setGameState(updatedGameState);
        setPlayerExplorationCards(updatedCards);
        setSelectedExplorationCardIds(updatedCardIds);
        handleCloseExplorationContextMenu();
      } catch (error) {
        console.error('Error removing exploration card:', error);
      }
    }
  };

  const handleOpenExploration = () => {
    setExplorationOpen(true);
    loadExplorationCards();
  };

  const handleCloseExploration = () => {
    setExplorationOpen(false);
  };

  const loadExplorationCards = async () => {
    if (!playerId) return;
    setExplorationLoading(true);
    try {
      const [cards, playerCards] = await Promise.all([
        fetchAllExplorationCards(['action', 'relic_fragment']),
        fetchPlayerExplorationCards(playerId),
      ]);
      setExplorationAllCards(cards);
      setSelectedExplorationCardIds(playerCards.map(card => card.id));
    } catch (error) {
      console.error('Error loading exploration cards:', error);
    } finally {
      setExplorationLoading(false);
    }
  };

  const toggleExplorationCard = (cardId: number) => {
    setSelectedExplorationCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleConfirmExploration = async () => {
    if (!playerId) return;
    setExplorationLoading(true);
    try {
      await updatePlayerExplorationCards(playerId, selectedExplorationCardIds);
      const updatedCards = await fetchPlayerExplorationCards(playerId);
      setPlayerExplorationCards(updatedCards);
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      handleCloseExploration();
    } catch (error) {
      console.error('Error updating exploration cards:', error);
    } finally {
      setExplorationLoading(false);
    }
  };

  const handleExplorationContextMenu = (event: MouseEvent, cardId: number) => {
    event.preventDefault();
    setExplorationContextMenu(
      explorationContextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            cardId,
          }
        : null,
    );
  };

  const handleExplorationTouchStart = (event: TouchEvent, cardId: number) => {
    event.preventDefault();
    const touch = event.touches[0];
    const timeout = setTimeout(() => {
      setExplorationContextMenu({
        mouseX: touch.clientX - 2,
        mouseY: touch.clientY - 4,
        cardId,
      });
    }, LONG_PRESS_DURATION);
    setExplorationTouchTimeout(timeout);
  };

  const handleExplorationTouchEnd = () => {
    if (explorationTouchTimeout) {
      clearTimeout(explorationTouchTimeout);
      setExplorationTouchTimeout(null);
    }
  };

  const handleCloseExplorationContextMenu = () => {
    setExplorationContextMenu(null);
  };

  // Handlers for Strategy Cards
  const handleRemoveStrategyCard = async () => {
    if (strategyContextMenu && playerId) {
      const { cardId } = strategyContextMenu;
      const updatedCards = playerStrategyCards.filter(card => card.id !== cardId);
      const updatedCardIds = updatedCards.map(card => card.id);
      try {
        await updatePlayerStrategyCards(playerId, updatedCardIds);
        const updatedGameState = await apiFetchGameState();
        setGameState(updatedGameState);
        setPlayerStrategyCards(updatedCards);
        setSelectedStrategyCardIds(updatedCardIds);
        handleCloseStrategyContextMenu();
      } catch (error) {
        console.error('Error removing strategy card:', error);
      }
    }
  };

  const handleOpenStrategy = () => {
    setStrategyOpen(true);
    loadStrategyCards();
  };

  const handleCloseStrategy = () => {
    setStrategyOpen(false);
  };

  const loadStrategyCards = async () => {
    if (!playerId) return;
    setStrategyLoading(true);
    try {
      const [cards, playerCards] = await Promise.all([
        fetchAllStrategyCards(),
        fetchPlayerStrategyCards(playerId),
      ]);
      setStrategyAllCards(cards);
      setSelectedStrategyCardIds(playerCards.map(card => card.id));
      console.log('Strategy All Cards:', cards); // Debugging line
    } catch (error) {
      console.error('Error loading strategy cards:', error);
    } finally {
      setStrategyLoading(false);
    }
  };

  const toggleStrategyCard = (cardId: number) => {
    setSelectedStrategyCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleConfirmStrategy = async () => {
    if (!playerId) return;
    setStrategyLoading(true);
    try {
      await updatePlayerStrategyCards(playerId, selectedStrategyCardIds);
      const updatedCards = await fetchPlayerStrategyCards(playerId);
      setPlayerStrategyCards(updatedCards);
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      handleCloseStrategy();
      console.log('Strategy Cards Updated:', updatedCards); // Debugging line
    } catch (error) {
      console.error('Error updating strategy cards:', error);
    } finally {
      setStrategyLoading(false);
    }
  };

  const handleStrategyContextMenu = (event: MouseEvent, cardId: number) => {
    event.preventDefault();
    setStrategyContextMenu(
      strategyContextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            cardId,
          }
        : null,
    );
  };

  const handleStrategyTouchStart = (event: TouchEvent, cardId: number) => {
    event.preventDefault();
    const touch = event.touches[0];
    const timeout = setTimeout(() => {
      setStrategyContextMenu({
        mouseX: touch.clientX - 2,
        mouseY: touch.clientY - 4,
        cardId,
      });
    }, LONG_PRESS_DURATION);
    setStrategyTouchTimeout(timeout);
  };

  const handleStrategyTouchEnd = () => {
    if (strategyTouchTimeout) {
      clearTimeout(strategyTouchTimeout);
      setStrategyTouchTimeout(null);
    }
  };

  const handleCloseStrategyContextMenu = () => {
    setStrategyContextMenu(null);
  };

  // Handlers for Trade Good Increment/Decrement
  const handleIncrementTradeGood = async (cardId: number) => {
    try {
      // Optimistically update local state
      setStrategyAllCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId
            ? { ...card, tradeGoodCount: card.tradeGoodCount + 1 }
            : card
        )
      );
      
      // Update the backend
      await updateStrategyCardTradeGood(cardId, true);
    } catch (error) {
      console.error('Error incrementing trade good:', error);
      // Optionally, rollback the optimistic update if needed
    }
  };

  const handleDecrementTradeGood = async (cardId: number) => {
    try {
      // Optimistically update local state
      setStrategyAllCards(prevCards =>
        prevCards.map(card =>
          card.id === cardId && card.tradeGoodCount > 0
            ? { ...card, tradeGoodCount: card.tradeGoodCount - 1 }
            : card
        )
      );
      
      // Update the backend
      await updateStrategyCardTradeGood(cardId, false);
    } catch (error) {
      console.error('Error decrementing trade good:', error);
      // Optionally, rollback the optimistic update if needed
    }
  };

  // Handlers for Action Cards
  const handleRemoveActionCard = async () => {
    if (actionContextMenu && playerId) {
      const { cardId } = actionContextMenu;
      const updatedCards = playerActionCards.filter(card => card.id !== cardId);
      const updatedCardIds = updatedCards.map(card => card.id);
      try {
        await updatePlayerActionCards(playerId, updatedCardIds);
        const updatedGameState = await apiFetchGameState();
        setGameState(updatedGameState);
        setPlayerActionCards(updatedCards);
        setSelectedActionCardIds(updatedCardIds);
        handleCloseActionContextMenu();
      } catch (error) {
        console.error('Error removing action card:', error);
      }
    }
  };

  const handleOpenAction = () => {
    setActionOpen(true);
    loadActionCards();
  };

  const handleCloseAction = () => {
    setActionOpen(false);
  };

  const loadActionCards = async () => {
    if (!playerId) return;
    setActionLoading(true);
    try {
      const [cards, playerCards] = await Promise.all([
        fetchAllActionCards(),
        fetchPlayerActionCards(playerId),
      ]);
      setActionAllCards(cards);
      setSelectedActionCardIds(playerCards.map(card => card.id));
    } catch (error) {
      console.error('Error loading action cards:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const toggleActionCard = (cardId: number) => {
    setSelectedActionCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  };

  const handleConfirmAction = async () => {
    if (!playerId) return;
    setActionLoading(true);
    try {
      await updatePlayerActionCards(playerId, selectedActionCardIds);
      const updatedCards = await fetchPlayerActionCards(playerId);
      setPlayerActionCards(updatedCards);
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      handleCloseAction();
    } catch (error) {
      console.error('Error updating action cards:', error);
    } finally {
      setActionLoading(false);
    }
  };

  const handleActionContextMenu = (event: MouseEvent, cardId: number) => {
    event.preventDefault();
    setActionContextMenu(
      actionContextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            cardId,
          }
        : null
    );
  };

  const handleActionTouchStart = (event: TouchEvent, cardId: number) => {
    event.preventDefault();
    const touch = event.touches[0];
    const timeout = setTimeout(() => {
      setActionContextMenu({
        mouseX: touch.clientX - 2,
        mouseY: touch.clientY - 4,
        cardId,
      });
    }, LONG_PRESS_DURATION);
    setActionTouchTimeout(timeout);
  };

  const handleActionTouchEnd = () => {
    if (actionTouchTimeout) {
      clearTimeout(actionTouchTimeout);
      setActionTouchTimeout(null);
    }
  };

  const handleCloseActionContextMenu = () => {
    setActionContextMenu(null);
  };

  // Handlers for Relic Cards
  const handleRemoveRelicCard = async () => {
    if (relicContextMenu && playerId) {
      const { cardId } = relicContextMenu;
      const updatedCards = playerRelicCards.filter(card => card.id !== cardId);
      const updatedCardIds = updatedCards.map(card => card.id);
      try {
        await updatePlayerRelicCards(playerId, updatedCardIds); // Changed from updatePlayerActionCards
        const updatedGameState = await apiFetchGameState();
        setGameState(updatedGameState);
        setPlayerRelicCards(updatedCards);
        handleCloseRelicContextMenu();
      } catch (error) {
        console.error('Error removing relic card:', error);
      }
    }
  };

  const handleOpenRelic = () => {
    setRelicOpen(true);
    loadRelicCards();
  };

  const handleCloseRelic = () => {
    setRelicOpen(false);
  };

  const loadRelicCards = async () => {
    if (!playerId) return;
    setRelicLoading(true);
    try {
      const [cards, playerCards] = await Promise.all([
        fetchAllRelicCards(),
        fetchPlayerRelicCards(playerId),
      ]);
      setRelicAllCards(cards);
      setSelectedRelicCardIds(playerCards.map(card => card.id));
    } catch (error) {
      console.error('Error loading relic cards:', error);
    } finally {
      setRelicLoading(false);
    }
  };

  const toggleRelicCard = (cardId: number) => {
    setSelectedRelicCardIds(prev =>
      prev.includes(cardId) ? prev.filter(id => id !== cardId) : [...prev, cardId]
    );
  }

  const handleConfirmRelic = async () => {
    if (!playerId) return;
    setRelicLoading(true);
    try {
      await updatePlayerRelicCards(playerId, selectedRelicCardIds); // Changed from updatePlayerActionCards
      const updatedCards = await fetchPlayerRelicCards(playerId);
      setPlayerRelicCards(updatedCards);
      const updatedGameState = await apiFetchGameState();
      setGameState(updatedGameState);
      handleCloseRelic();
    } catch (error) {
      console.error('Error updating relic cards:', error);
    } finally {
      setRelicLoading(false);
    }
  }

  const handleCombineRelic = () => {
    setCombineRelicOpen(true);
  };

  const toggleFragmentSelection = (cardId: number) => {
    setSelectedFragmentIds(prev => {
      if (prev.includes(cardId)) {
        return prev.filter(id => id !== cardId);
      }
      if (prev.length < 3) {
        return [...prev, cardId];
      }
      return prev;
    });
  };

  const handleConfirmCombineRelic = async () => {
    if (selectedFragmentIds.length !== 3) return;
    try {
      await combineRelicFragments(selectedFragmentIds);
      setCombineRelicOpen(false);
      setSelectedFragmentIds([]);
    } catch (error) {
      console.error('Error combining relic fragments:', error);
    }
  };

  const handleRelicContextMenu = (event: MouseEvent, cardId: number) => {
    event.preventDefault();
    setRelicContextMenu(
      relicContextMenu === null
        ? {
            mouseX: event.clientX - 2,
            mouseY: event.clientY - 4,
            cardId,
          }
        : null
    );
  };

  const handleRelicTouchStart = (event: TouchEvent, cardId: number) => {
    event.preventDefault();
    const touch = event.touches[0];
    const timeout = setTimeout(() => {
      setRelicContextMenu({
        mouseX: touch.clientX - 2,
        mouseY: touch.clientY - 4,
        cardId,
      });
    }, LONG_PRESS_DURATION);
    setRelicTouchTimeout(timeout);
  };

  const handleRelicTouchEnd = () => {
    if (relicTouchTimeout) {
      clearTimeout(relicTouchTimeout);
      setRelicTouchTimeout(null);
  }
};

const handleCloseRelicContextMenu = () => {
  setRelicContextMenu(null);
};

  useEffect(() => {
    // Event listener for opening Exploration Cards Dialog
    const openExplorationDialog = () => {
      handleOpenExploration();
    };
    window.addEventListener('openManageExplorationCardsDialog', openExplorationDialog);

    // Event listener for opening Strategy Cards Dialog
    const openStrategyDialog = () => {
      handleOpenStrategy();
    };
    window.addEventListener('openManageStrategyCardsDialog', openStrategyDialog);

    const openActionDialog = () => {
      handleOpenAction();
    };
    window.addEventListener('openManageActionCardsDialog', openActionDialog);

    // Add event listener for opening Relic Cards Dialog
    const openRelicDialog = () => {
      handleOpenRelic();
    };
    window.addEventListener('openManageRelicsDialog', openRelicDialog);

    // Cleanup event listeners on unmount
    return () => {
      window.removeEventListener('openManageExplorationCardsDialog', openExplorationDialog);
      window.removeEventListener('openManageStrategyCardsDialog', openStrategyDialog);
      window.removeEventListener('openManageActionCardsDialog', openActionDialog);
      window.removeEventListener('openManageRelicsDialog', openRelicDialog);
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
        {/* Strategy Cards */}
        {playerStrategyCards.length === 0 ? (
          <Typography variant="body1">No Strategy Cards available.</Typography>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={2} marginTop={2}>
            {playerStrategyCards.map((card) => (
              <Box
                key={card.id}
                position="relative"
                onContextMenu={(e) => handleStrategyContextMenu(e, card.id)}
                onTouchStart={(e) => handleStrategyTouchStart(e, card.id)}
                onTouchEnd={handleStrategyTouchEnd}
                sx={{
                  cursor: 'pointer',
                  WebkitTouchCallout: 'none',
                  userSelect: 'none',
                }}
              >
                <img
                  src={`/assets/${card.image}`}
                  alt={card.name}
                  width="100px"
                  height="150px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/default.jpg';
                  }}
                  draggable={false}
                />
              </Box>
            ))}
          </Box>
        )}
      </Box>

      {/* Action Cards Section */}
      <Box marginBottom={4}>
        <Typography variant="h5" gutterBottom>
          Action Cards
        </Typography>
        {/* Action Cards */}
        {playerActionCards.length === 0 ? (
          <Typography variant="body1">No Action Cards available.</Typography>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={2} marginTop={2}>
            {playerActionCards.map((card) => (
              <Box
                key={card.id}
                position="relative"
                onContextMenu={(e) => handleActionContextMenu(e, card.id)}
                onTouchStart={(e) => handleActionTouchStart(e, card.id)}
                onTouchEnd={handleActionTouchEnd}
                sx={{
                  cursor: 'pointer',
                  WebkitTouchCallout: 'none',
                  userSelect: 'none',
                }}
              >
                <img
                  src={`/assets/${card.image}`}
                  alt={card.name}
                  width="100px"
                  height="150px"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/default.jpg';
                  }}
                  draggable={false}
                />
              </Box>
            ))}
          </Box>
        )}
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
              onContextMenu={(e) => handleExplorationContextMenu(e, card.id)}
              onTouchStart={(e) => handleExplorationTouchStart(e, card.id)}
              onTouchEnd={handleExplorationTouchEnd}
              sx={{
                cursor: 'pointer',
                WebkitTouchCallout: 'none',
                userSelect: 'none',
              }}
            >
              <img
                src={`/assets/${card.image}`}
                alt={card.name}
                width="100px"
                height="150px"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/default.jpg';
                }}
                draggable={false}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Relics Section */}
      <Box marginY={4}>
        <Typography variant="h5" gutterBottom>
          Relics
        </Typography>
        <Box display="flex" flexWrap="wrap" gap={2} marginTop={2}>
          {playerRelicCards.map((card) => (
            <Box
              key={card.id}
              position="relative"
              onContextMenu={(e) => handleRelicContextMenu(e, card.id)}
              onTouchStart={(e) => handleRelicTouchStart(e, card.id)}
              onTouchEnd={handleRelicTouchEnd}
              sx={{
                cursor: 'pointer',
                WebkitTouchCallout: 'none',
                userSelect: 'none',
              }}
            >
              <img
                src={`/assets/${card.image}`}
                alt={card.name}
                width="100px"
                height="150px"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = '/assets/default.jpg';
                }}
                draggable={false}
              />
            </Box>
          ))}
        </Box>
      </Box>

      {/* Context Menu for Strategy Cards */}
      <Menu
        open={strategyContextMenu !== null}
        onClose={handleCloseStrategyContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          strategyContextMenu !== null
            ? { top: strategyContextMenu.mouseY, left: strategyContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleRemoveStrategyCard}>Remove Strategy Card</MenuItem>
      </Menu>

      {/* Context Menu for Exploration Cards */}
      <Menu
        open={explorationContextMenu !== null}
        onClose={handleCloseExplorationContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          explorationContextMenu !== null
            ? { top: explorationContextMenu.mouseY, left: explorationContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleRemoveExplorationCard}>Remove Exploration Card</MenuItem>
        {playerExplorationCards.find(card => card.id === explorationContextMenu?.cardId)?.subtype === 'relic_fragment' && (
          <MenuItem onClick={handleCombineRelic}>Combine Relic</MenuItem>
        )}
      </Menu>

      {/* Context Menu for Action Cards */}
      <Menu
        open={actionContextMenu !== null}
        onClose={handleCloseActionContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          actionContextMenu !== null
            ? { top: actionContextMenu.mouseY, left: actionContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleRemoveActionCard}>Remove Action Card</MenuItem>
      </Menu>

      {/* Context Menu for Relic Cards */}
      <Menu
        open={relicContextMenu !== null}
        onClose={handleCloseRelicContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          relicContextMenu !== null
            ? { top: relicContextMenu.mouseY, left: relicContextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={handleRemoveRelicCard}>Remove Relic Card</MenuItem>
      </Menu>

      {/* Manage Strategy Cards Modal */}
      <Dialog open={strategyOpen} onClose={handleCloseStrategy} maxWidth="md" fullWidth>
        <DialogTitle>Manage Strategy Cards</DialogTitle>
        <DialogContent>
          {strategyLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexWrap="wrap" gap={2}>
              {strategyAllCards.map(card => (
                <Box
                  key={card.id}
                  position="relative"
                  sx={{ width: '120px', textAlign: 'center' }}
                >
                  <Card
                    selected={selectedStrategyCardIds.includes(card.id)}
                    onClick={() => toggleStrategyCard(card.id)}
                    sx={{ cursor: 'pointer' }}
                  >
                    <img
                      src={`/assets/${card.image}`}
                      alt={card.name}
                      width="100px"
                      height="150px"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = '/assets/default.jpg';
                      }}
                      draggable={false}
                    />
                    <Checkbox
                      checked={selectedStrategyCardIds.includes(card.id)}
                      icon={<CheckCircleIcon color="disabled" />}
                      checkedIcon={<CheckCircleIcon color="primary" />}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  </Card>
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    mt={1}
                  >
                    <img
                      src="/assets/tokens/trade_good.jpg"
                      alt="Trade Good"
                      width="24px"
                      height="24px"
                      style={{ borderRadius: '50%' }}
                    />
                    <Typography variant="body1" ml={1} mr={1}>
                      {card.tradeGoodCount}
                    </Typography>
                    <IconButton
                      size="small"
                      onClick={() => handleIncrementTradeGood(card.id)}
                    >
                      <AddIcon fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDecrementTradeGood(card.id)}
                      disabled={card.tradeGoodCount === 0}
                    >
                      <RemoveIcon fontSize="small" />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseStrategy} disabled={strategyLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmStrategy}
            disabled={strategyLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Exploration Cards Modal */}
      <Dialog open={explorationOpen} onClose={handleCloseExploration} maxWidth="md" fullWidth>
        <DialogTitle>Manage Exploration Cards</DialogTitle>
        <DialogContent>
          {explorationLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              
              {/* Search Bar for Exploration Cards */}
              <TextField
                label="Search Exploration Cards"
                variant="outlined"
                fullWidth
                margin="normal"
                value={explorationSearchQuery}
                onChange={(e) => setExplorationSearchQuery(e.target.value)}
              />
              
              {/* Exploration Cards List */}
              <Box display="flex" flexWrap="wrap" gap={2}>
                {explorationAllCards
                  .filter(card => card.name.toLowerCase().includes(explorationSearchQuery.toLowerCase()))
                  .map(card => (
                    <Box key={card.id} position="relative" width="100px" textAlign="center">
                      <Card
                        selected={selectedExplorationCardIds.includes(card.id)}
                        onClick={() => toggleExplorationCard(card.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <img
                          src={`/assets/${card.image}`}
                          alt={card.name}
                          width="100px"
                          height="150px"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/default.jpg';
                          }}
                          draggable={false}
                        />
                        <Checkbox
                          checked={selectedExplorationCardIds.includes(card.id)}
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
          <Button onClick={handleCloseExploration} disabled={explorationLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmExploration}
            disabled={explorationLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Action Cards Modal */}
      <Dialog open={actionOpen} onClose={handleCloseAction} maxWidth="md" fullWidth>
        <DialogTitle>Manage Action Cards</DialogTitle>
        <DialogContent>
          {actionLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              
              {/* Search Bar for Action Cards */}
              <TextField
                label="Search Action Cards"
                variant="outlined"
                fullWidth
                margin="normal"
                value={actionSearchQuery}
                onChange={(e) => setActionSearchQuery(e.target.value)}
              />
              
              {/* Action Cards List */}
              <Box display="flex" flexWrap="wrap" gap={2}>
                {actionAllCards
                  .filter(card => card.name.toLowerCase().includes(actionSearchQuery.toLowerCase()))
                  .map(card => (
                    <Box key={card.id} position="relative" width="100px" textAlign="center">
                      <Card
                        selected={selectedActionCardIds.includes(card.id)}
                        onClick={() => toggleActionCard(card.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <img
                          src={`/assets/${card.image}`}
                          alt={card.name}
                          width="100px"
                          height="150px"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/default.jpg';
                          }}
                          draggable={false}
                        />
                        <Checkbox
                          checked={selectedActionCardIds.includes(card.id)}
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
          <Button onClick={handleCloseAction} disabled={actionLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmAction}
            disabled={actionLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Manage Relic Modal */}
      <Dialog open={relicOpen} onClose={handleCloseRelic} maxWidth="md" fullWidth>
        <DialogTitle>Manage Relics</DialogTitle>
        <DialogContent>
          {relicLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
              <CircularProgress />
            </Box>
          ) : (
            <Box display="flex" flexDirection="column" gap={2}>
              {/* Search Bar for Relic Cards */}
              <TextField
                label="Search Relic Cards"
                variant="outlined"
                fullWidth
                margin="normal"
                value={relicSearchQuery}
                onChange={(e) => setRelicSearchQuery(e.target.value)}
              />
              
              {/* Relic Cards List */}
              <Box display="flex" flexWrap="wrap" gap={2}>
                {relicAllCards
                  .filter(card => card.name.toLowerCase().includes(relicSearchQuery.toLowerCase()))
                  .map(card => (
                    <Box key={card.id} position="relative" width="100px" textAlign="center">
                      <Card
                        selected={selectedRelicCardIds.includes(card.id)}
                        onClick={() => toggleRelicCard(card.id)}
                        sx={{ cursor: 'pointer' }}
                      >
                        <img
                          src={`/assets/${card.image}`}
                          alt={card.name}
                          width="100px"
                          height="150px"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = '/assets/default.jpg';
                          }}
                          draggable={false}
                        />
                        <Checkbox
                          checked={selectedRelicCardIds.includes(card.id)}
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
          <Button onClick={handleCloseRelic} disabled={relicLoading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleConfirmRelic}
            disabled={relicLoading}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>

      {/* Combine Relic Modal */}
      <Dialog open={combineRelicOpen} onClose={() => setCombineRelicOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Combine Relic Fragments</DialogTitle>
        <DialogContent>
          <Box display="flex" flexWrap="wrap" gap={2}>
            {playerExplorationCards
              .filter(card => card.subtype === 'relic_fragment')
              .map(card => (
                <Card
                  key={card.id}
                  selected={selectedFragmentIds.includes(card.id)}
                  onClick={() => toggleFragmentSelection(card.id)}
                  sx={{ cursor: 'pointer' }}
                >
                  <img
                    src={`/assets/${card.image}`}
                    alt={card.name}
                    width="100px"
                    height="150px"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/default.jpg';
                    }}
                    draggable={false}
                  />
                  <Checkbox
                    checked={selectedFragmentIds.includes(card.id)}
                    icon={<CheckCircleIcon color="disabled" />}
                    checkedIcon={<CheckCircleIcon color="primary" />}
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                  />
                </Card>
              ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCombineRelicOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleConfirmCombineRelic}
            disabled={selectedFragmentIds.length !== 3}
          >
            Combine
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ActionsTab;