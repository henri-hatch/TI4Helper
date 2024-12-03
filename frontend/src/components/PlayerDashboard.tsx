// src/components/PlayerDashboard.tsx
import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  AppBar,
  Toolbar,
  Button,
  Menu,
  MenuItem,
  Typography,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  Box,
  CircularProgress,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Planet } from '../types';

const PlayerDashboard: React.FC = () => {
  const { gameState, playerId, playerName, planets, updatePlayerPlanets } = useContext(GameContext);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [isPlanetsDialogOpen, setIsPlanetsDialogOpen] = useState<boolean>(false);
  const [selectedPlanetIds, setSelectedPlanetIds] = useState<number[]>([]);
  const [dashboardPlanets, setDashboardPlanets] = useState<Planet[]>([]);

  // Fetch assigned planets from game state
  useEffect(() => {
    if (gameState && playerId) {
      const currentPlayer = gameState.players.find(p => p.playerId === playerId);
      if (currentPlayer && currentPlayer.planets) {
        const assignedPlanets = planets.filter(planet => currentPlayer.planets.includes(planet.id));
        setDashboardPlanets(assignedPlanets);
        setSelectedPlanetIds(currentPlayer.planets);
        console.log('Assigned Planets:', currentPlayer.planets); // Debugging log
      }
    }
  }, [gameState, playerId, planets]);

  if (!gameState) return <div>Loading...</div>;
  if (!playerId) return <div>Please log in.</div>;

  const currentPlayer = gameState.players.find(p => p.playerId === playerId);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // Menu action handlers
  const handlePlanetsClick = () => {
    console.log('Planets menu clicked');
    setIsPlanetsDialogOpen(true);
    handleMenuClose();
  };

  const handleObjectivesClick = () => {
    console.log('Objectives menu clicked');
    handleMenuClose();
  };

  const handleTechnologiesClick = () => {
    console.log('Technologies menu clicked');
    handleMenuClose();
  };

  const handleRelicsClick = () => {
    console.log('Relics menu clicked');
    handleMenuClose();
  };

  const handleTradeGoodsClick = () => {
    console.log('Trade Goods menu clicked');
    handleMenuClose();
  };

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
    console.log('Selected Planet IDs:', selectedPlanetIds); // Debugging log
    await updatePlayerPlanets(selectedPlanetIds);
    setIsPlanetsDialogOpen(false);
  };

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
          <Typography variant="h6">
            Welcome, {playerName}!
          </Typography>
        </Toolbar>
      </AppBar>

      {/* Dropdown Menu */}
      <Menu
        id="player-menu"
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handlePlanetsClick}>Planets</MenuItem>
        <MenuItem onClick={handleObjectivesClick}>Objectives</MenuItem>
        <MenuItem onClick={handleTechnologiesClick}>Technologies</MenuItem>
        <MenuItem onClick={handleRelicsClick}>Relics</MenuItem>
        <MenuItem onClick={handleTradeGoodsClick}>Trade Goods</MenuItem>
      </Menu>

      {/* Planets Dialog */}
      <Dialog open={isPlanetsDialogOpen} onClose={() => setIsPlanetsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Select Your Planets</DialogTitle>
        <DialogContent>
          {planets.length === 0 ? (
            <CircularProgress />
          ) : (
            <Box display="flex" flexWrap="wrap" gap={2}>
              {planets.map(planet => (
                <Box
                  key={planet.id}
                  display="flex"
                  alignItems="center"
                  flexDirection="column"
                  onClick={() => togglePlanetSelection(planet.id)}
                  sx={{
                    cursor: 'pointer',
                    position: 'relative',
                    border: selectedPlanetIds.includes(planet.id) ? '2px solid #1976d2' : '2px solid transparent',
                    borderRadius: '8px',
                    padding: '10px',
                    width: '120px',
                    textAlign: 'center',
                  }}
                >
                  <img
                    src={`/assets/${planet.name.toLowerCase()}.png`}
                    alt={planet.name}
                    width={100}
                    height={100}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = '/assets/default.png'; // Fallback image
                    }}
                  />
                  <Typography variant="subtitle1">{planet.name.charAt(0).toUpperCase() + planet.name.slice(1)}</Typography>
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsPlanetsDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleConfirmPlanets}>Confirm</Button>
        </DialogActions>
      </Dialog>

      {/* Player Stats */}
      {currentPlayer && (
        <div style={{ padding: '20px' }}>
          <h2>Your Stats</h2>
          <p>Resources: {currentPlayer.resources}</p>
          <p>Influence: {currentPlayer.influence}</p>
          <p>Commodities: {currentPlayer.commodities}</p>
          <p>Trade Goods: {currentPlayer.tradeGoods}</p>
          <p>Victory Points: {currentPlayer.victoryPoints}</p>
        </div>
      )}

      {/* Selected Planets Dashboard */}
      <div style={{ padding: '20px' }}>
        <h2>Your Planets</h2>
        {dashboardPlanets.length === 0 ? (
          <Typography variant="body1">No planets selected.</Typography>
        ) : (
          <Box display="flex" flexWrap="wrap" gap={2}>
            {dashboardPlanets.map(planet => (
              <Box key={planet.id} position="relative">
                <img
                  src={`/assets/${planet.name.toLowerCase()}.png`}
                  alt={planet.name}
                  width={100}
                  height={100}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = '/assets/default.png'; // Fallback image
                  }}
                />
                <CheckCircleIcon
                  color="primary"
                  sx={{ position: 'absolute', top: 0, right: 0 }}
                />
              </Box>
            ))}
          </Box>
        )}
      </div>
    </div>
  );
};

export default PlayerDashboard;