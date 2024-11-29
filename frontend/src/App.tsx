// src/App.tsx
import React, { useContext } from 'react';
import { GameProvider, GameContext } from './contexts/GameContext';
import Dashboard from './components/Dashboard/Dashboard';
import Registration from './components/Registration/Registration';

const AppContent: React.FC = () => {
  const { playerId } = useContext(GameContext);

  if (!playerId) {
    return <Registration />;
  }

  return <Dashboard />;
};

const App = () => {
  return (
    <GameProvider>
      <AppContent />
    </GameProvider>
  );
};

export default App;