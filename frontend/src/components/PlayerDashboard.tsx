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
import Actions from './Actions';
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

  const handleSelectPlanets = () => {
    const event = new CustomEvent('openSelectPlanetsDialog');
    window.dispatchEvent(event);
    handleMenuClose();
  };

  const handleChangeFaction = () => {
    console.log('Change Faction clicked');
    // Implement change faction logic here
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
          <Tab label="Actions" />
        </Tabs>
      </AppBar>

      {/* Menu for Actions */}
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
        {/* Add more conditional menu items here if needed */}
      </Menu>

      {/* Render Tab Content */}
      <Box sx={{ padding: 2 }}>
        {currentTab === 0 && (
          <FactionBoard playerName={playerName} currentPlayer={currentPlayer} />
        )}
        {currentTab === 1 && <PlanetsTab />}
        {currentTab === 2 && <Objectives />}
        {currentTab === 3 && <Technology />}
        {currentTab === 4 && <Actions />}
      </Box>
    </div>
  );
};

export default PlayerDashboard;