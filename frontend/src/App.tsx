import React from 'react';
import { GameProvider } from './contexts/GameContext';
import Dashboard from './components/Dashboard/Dashboard';

const App = () => {
  return (
    <GameProvider>
      <Dashboard />
    </GameProvider>
  );
};

export default App;
