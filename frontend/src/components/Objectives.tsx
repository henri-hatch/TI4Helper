import React, { useContext, useState, useEffect } from 'react';
import { GameContext } from '../contexts/GameContext';
import {
  Box,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Checkbox,
  Menu,
  MenuItem,
  Divider,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { styled } from '@mui/material/styles';
import { Objective, DashboardObjective } from '../types';
import {
  fetchAllObjectives,
  fetchPlayerObjectives,
  updatePlayerObjectives,
  toggleObjectiveCompleted,
} from '../services/api';

const Card = styled(Box)<{ selected: boolean; completed: boolean }>(({ theme, selected, completed }) => ({
  position: 'relative',
  border: selected ? '2px solid #1976d2' : '2px solid transparent',
  borderRadius: '8px',
  padding: '10px',
  width: '100px',
  height: '150px',
  cursor: 'pointer',
  filter: completed ? 'grayscale(100%)' : 'none',
  '&:hover': {
    border: '2px solid #1976d2',
  },
}));

const Objectives: React.FC = () => {
  const { 
    playerId, 
    setGameState,
    playerObjectives,
    setPlayerObjectives,
    updatePlayerObjectivesHandler 
  } = useContext(GameContext);

  // State for modals and context menu
  const [publicObjectivesOpen, setPublicObjectivesOpen] = useState(false);
  const [secretObjectivesOpen, setSecretObjectivesOpen] = useState(false);
  const [allObjectives, setAllObjectives] = useState<Objective[]>([]);
  const [selectedObjectiveIds, setSelectedObjectiveIds] = useState<number[]>([]);
  const [objectiveLoading, setObjectiveLoading] = useState(false);
  const [objectiveSearchQuery, setObjectiveSearchQuery] = useState('');
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    objectiveId: number;
  } | null>(null);

  // Event listeners for menu commands
  useEffect(() => {
    const handleOpenPublicObjectives = () => {
      handleOpenPublic();
    };
    const handleOpenSecretObjectives = () => {
      handleOpenSecret();
    };

    window.addEventListener('openManagePublicObjectivesDialog', handleOpenPublicObjectives);
    window.addEventListener('openManageSecretObjectivesDialog', handleOpenSecretObjectives);

    return () => {
      window.removeEventListener('openManagePublicObjectivesDialog', handleOpenPublicObjectives);
      window.removeEventListener('openManageSecretObjectivesDialog', handleOpenSecretObjectives);
    };
  }, []);

  // Handlers
  const handleOpenPublic = async () => {
    setPublicObjectivesOpen(true);
    await loadObjectives('public');
  };

  const handleOpenSecret = async () => {
    setSecretObjectivesOpen(true);
    await loadObjectives('secret');
  };

  const loadObjectives = async (type: 'public' | 'secret') => {
    if (!playerId) return;
    setObjectiveLoading(true);
    try {
      const objectives = await fetchAllObjectives();
      setAllObjectives(objectives.filter(obj => obj.type === type));
      const playerObjs = await fetchPlayerObjectives(playerId);
      setSelectedObjectiveIds(playerObjs.filter(obj => obj.type === type).map(obj => obj.id));
    } catch (error) {
      console.error('Error loading objectives:', error);
    } finally {
      setObjectiveLoading(false);
    }
  };

  const toggleObjectiveSelection = (objectiveId: number) => {
    setSelectedObjectiveIds(prev =>
      prev.includes(objectiveId) 
        ? prev.filter(id => id !== objectiveId) 
        : [...prev, objectiveId]
    );
  };

  const handleConfirmObjectives = async (type: 'public' | 'secret') => {
    if (!playerId) return;
    setObjectiveLoading(true);
    try {
      // Get current selected objective IDs only for the current type
      const currentTypeObjectives = allObjectives.filter(obj => 
        obj.type === type && selectedObjectiveIds.includes(obj.id)
      ).map(obj => obj.id);

      await updatePlayerObjectivesHandler(type, currentTypeObjectives);
      if (type === 'public') {
        setPublicObjectivesOpen(false);
      } else {
        setSecretObjectivesOpen(false);
      }
    } catch (error) {
      console.error('Error updating objectives:', error);
    } finally {
      setObjectiveLoading(false);
    }
  };

  const handleToggleComplete = async (objectiveId: number) => {
    if (!playerId) return;
    const objective = playerObjectives.find(obj => obj.id === objectiveId);
    if (!objective) return;

    try {
      await toggleObjectiveCompleted(playerId, objectiveId);
      const updatedObjectives = await fetchPlayerObjectives(playerId);
      setPlayerObjectives(updatedObjectives);
    } catch (error) {
      console.error('Error toggling objective completion:', error);
    }
  };

  return (
    <Box padding={2}>
      <Typography variant="h4" gutterBottom>Objectives</Typography>
      
      {/* Public Objectives Section */}
      <Box marginY={4}>
        <Typography variant="h5" gutterBottom>Public Objectives</Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          {playerObjectives
            .filter(obj => obj.type === 'public')
            .map(objective => (
              <Card
                key={objective.id}
                selected={false}
                completed={objective.completed}
                onClick={() => handleToggleComplete(objective.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                    objectiveId: objective.id
                  });
                }}
              >
                <img
                  src={`/assets/${objective.image}`}
                  alt={objective.name}
                  style={{ width: '100px', height: '150px', objectFit: 'cover' }}
                />
              </Card>
            ))}
        </Box>
      </Box>
      
      <Divider />
      
      {/* Secret Objectives Section */}
      <Box marginY={4}>
        <Typography variant="h5" gutterBottom>Secret Objectives</Typography>
        <Box display="flex" flexWrap="wrap" gap={2}>
          {playerObjectives
            .filter(obj => obj.type === 'secret')
            .map(objective => (
              <Card
                key={objective.id}
                selected={false}
                completed={objective.completed}
                onClick={() => handleToggleComplete(objective.id)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setContextMenu({
                    mouseX: e.clientX,
                    mouseY: e.clientY,
                    objectiveId: objective.id
                  });
                }}
              >
                <img
                  src={`/assets/${objective.image}`}
                  alt={objective.name}
                  style={{ width: '100px', height: '150px', objectFit: 'cover' }}
                />
              </Card>
            ))}
        </Box>
      </Box>

      {/* Manage Objectives Modals */}
      {['public', 'secret'].map((type) => (
        <Dialog
          key={type}
          open={type === 'public' ? publicObjectivesOpen : secretObjectivesOpen}
          onClose={() => type === 'public' ? setPublicObjectivesOpen(false) : setSecretObjectivesOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Manage {type === 'public' ? 'Public' : 'Secret'} Objectives</DialogTitle>
          <DialogContent>
            <TextField
              label="Search Objectives"
              variant="outlined"
              fullWidth
              margin="normal"
              value={objectiveSearchQuery}
              onChange={(e) => setObjectiveSearchQuery(e.target.value)}
            />
            <Box display="flex" flexWrap="wrap" gap={2}>
              {allObjectives
                .filter(obj => 
                  obj.name.toLowerCase().includes(objectiveSearchQuery.toLowerCase())
                )
                .map(objective => (
                  <Card
                    key={objective.id}
                    selected={selectedObjectiveIds.includes(objective.id)}
                    completed={false}
                    onClick={() => toggleObjectiveSelection(objective.id)}
                  >
                    <img
                      src={`/assets/${objective.image}`}
                      alt={objective.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <Checkbox
                      checked={selectedObjectiveIds.includes(objective.id)}
                      icon={<CheckCircleIcon color="disabled" />}
                      checkedIcon={<CheckCircleIcon color="primary" />}
                      sx={{ position: 'absolute', top: 8, right: 8 }}
                    />
                  </Card>
                ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => type === 'public' ? setPublicObjectivesOpen(false) : setSecretObjectivesOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={() => handleConfirmObjectives(type as 'public' | 'secret')}
              disabled={objectiveLoading}
            >
              Confirm
            </Button>
          </DialogActions>
        </Dialog>
      ))}

      {/* Context Menu */}
      <Menu
        open={contextMenu !== null}
        onClose={() => setContextMenu(null)}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => {
          if (contextMenu) {
            const objective = playerObjectives.find(obj => obj.id === contextMenu.objectiveId);
            if (objective) {
              handleToggleComplete(objective.id);
            }
          }
          setContextMenu(null);
        }}>
          Toggle Completed
        </MenuItem>
      </Menu>
    </Box>
  );
};

export default Objectives;