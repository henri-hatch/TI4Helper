// frontend/src/components/PlayerDashboard.tsx

import React, { useContext, useState } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Tabs,
  Tab,
  Box,
  Menu,
  MenuItem,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import FactionBoard from './FactionBoard';
import PlanetsTab from './Planets';
import Objectives from './Objectives';
import Technology from './Technology';
import CardInventory from './CardInventory';
import { useTheme } from '@mui/material/styles';

const PlayerDashboard: React.FC = () => {
  const { gameState, playerId, playerName } = useContext(GameContext);
  const [currentTab, setCurrentTab] = useState<number>(0);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Existing handlers
  const handleChangeFaction = () => {
    console.log('Change Faction clicked');
    const event = new CustomEvent('openChangeFactionDialog');
    window.dispatchEvent(event);
    console.log('Event dispatched');
    handleMenuClose();
  };

  const handleSelectPlanets = () => {
    const event = new CustomEvent('openSelectPlanetsDialog');
    window.dispatchEvent(event);
    handleMenuClose();
  };

  const handleManageTechnology = () => {
    const event = new CustomEvent('openManageTechnologyDialog');
    window.dispatchEvent(event);
    handleMenuClose
  };

  // New handlers for Card Inventory tab
  const handleManageStrategyCards = () => {
    const event = new CustomEvent('openManageStrategyCardsDialog');
    window.dispatchEvent(event);
    handleMenuClose();
  };

  const handleManageExplorationCards = () => {
    const event = new CustomEvent('openManageExplorationCardsDialog');
    window.dispatchEvent(event);
    handleMenuClose();
  };

  const handleManageActionCards = () => {
    const event = new Event('openManageActionCardsDialog');
    window.dispatchEvent(event);
    handleMenuClose();
  };

  const handleManageRelics = () => {
    const event = new CustomEvent('openManageRelicsDialog');
    window.dispatchEvent(event);
    handleMenuClose();
  };

  if (!gameState) return <div>Loading...</div>;
  if (!playerId) return <div>Please log in.</div>;

  const currentPlayer = gameState.players.find(p => p.playerId === playerId);

  return (
    <div>
      {/* Top Navigation Bar */}
      <AppBar position="static">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            onClick={handleMenuOpen}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Player Dashboard
          </Typography>
          <Typography variant="h6">Welcome, {playerName}!</Typography>
        </Toolbar>
        {/* Tabs with Responsive Styling */}
        <Tabs
          value={currentTab}
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
          textColor="inherit"
          indicatorColor="secondary"
          sx={{
            '& .MuiTab-root': {
              minWidth: { xs: 80, sm: 120 }, // Adjust minWidth based on screen size
              padding: theme.spacing(1),
            },
            '& .Mui-selected': {
              border: '2px solid #fff',
              borderRadius: '4px',
            },
          }}
        >
          <Tab label="Faction Board" />
          <Tab label="Planets" />
          <Tab label="Objectives" />
          <Tab label="Technology" />
          <Tab label="Card Inventory" />
        </Tabs>
      </AppBar>

      {/* Menu for Card Inventory - Add here for each menu item for each */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        {currentTab === 0 && (
          <MenuItem onClick={handleChangeFaction}>Change Faction</MenuItem>
        )}
        {currentTab === 1 && (
          <MenuItem onClick={handleSelectPlanets}>Manage Planets</MenuItem>
        )}
        {currentTab === 3 && (
          <MenuItem onClick={handleManageTechnology}>Manage Technology</MenuItem>
        )}
        {currentTab === 4 && (
          <>
            <MenuItem onClick={handleManageStrategyCards}>Manage Strategy Cards</MenuItem>
            <MenuItem onClick={handleManageExplorationCards}>Manage Exploration Cards</MenuItem>
            <MenuItem onClick={handleManageRelics}>Manage Relics</MenuItem>
            <MenuItem onClick={handleManageActionCards}>Manage Action Cards</MenuItem>
          </>
        )}
      </Menu>

      {/* Render Tab Content */}
      <Box sx={{ padding: 2 }}>
        {currentTab === 0 && <FactionBoard />}
        {currentTab === 1 && <PlanetsTab />}
        {currentTab === 2 && <Objectives />}
        {currentTab === 3 && <Technology />}
        {currentTab === 4 && <CardInventory />}
      </Box>
    </div>
  );
};

export default PlayerDashboard;