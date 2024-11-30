// src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { GameProvider } from './contexts/GameContext';
import HostDashboard from './components/HostDashboard';
import PlayerDashboard from './components/PlayerDashboard';
import Login from './components/Login';

const App: React.FC = () => {
  return (
    <GameProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          <Route path="/host" element={<HostDashboard />} />
          <Route path="/player" element={<PlayerDashboard />} />
        </Routes>
      </Router>
    </GameProvider>
  );
};

export default App;