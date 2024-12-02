// src/components/Login.tsx
import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameContext } from '../contexts/GameContext';

const Login: React.FC = () => {
  const [name, setName] = useState('');
  const { registerPlayer } = useContext(GameContext);
  const navigate = useNavigate();

  const handleLogin = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      console.error('Player name cannot be empty.');
      return;
    }
    console.log('Attempting to register player:', trimmedName);
    await registerPlayer(trimmedName);
    console.log('Navigating to Player Dashboard');
    navigate('/player');
  };

  const handleHostLogin = () => {
    console.log('Navigating to Host Dashboard');
    navigate('/host');
  };

  return (
    <div>
      <h2>Join the Game</h2>
      <input
        type="text"
        placeholder="Enter your name"
        value={name}
        onChange={(e) => {
          const inputValue = e.target.value ?? '';
          console.log('Input changed:', inputValue);
          setName(inputValue);
        }}
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