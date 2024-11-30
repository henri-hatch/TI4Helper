// src/components/Login.tsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext';

const Login: React.FC = () => {
  const [name, setName] = useState('');
  const { registerPlayer } = useContext(GameContext);
  const navigate = useNavigate();

  const handleLogin = async () => {
    await registerPlayer(name);
    navigate('/player');
  };

  const handleHostLogin = () => {
    navigate('/host');
  };

  return (
    <div>
      <h2>Join the Game</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <button onClick={handleLogin} disabled={!name.trim()}>
        Join as Player
      </button>
      <hr />
      <button onClick={handleHostLogin}>
        Host Dashboard
      </button>
    </div>
  );
};

export default Login;