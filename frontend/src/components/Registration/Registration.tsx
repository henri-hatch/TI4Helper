// src/components/Registration/Registration.tsx
import React, { useState, useContext } from 'react';
import { GameContext } from '../../contexts/GameContext';

const Registration: React.FC = () => {
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const { registerPlayer } = useContext(GameContext);

  const handleJoin = async () => {
    if (isRegistering) return; // Prevent multiple registrations
    setIsRegistering(true);
    console.log('Joining game with name:', name);
    try {
      await registerPlayer(name);
    } catch (err: any) {
      console.error('Error joining game:', err);
      setError(err.response?.data?.error || 'Failed to join the game');
    } finally {
      setIsRegistering(false);
    }
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
      <button onClick={handleJoin} disabled={isRegistering || name.trim() === ''}>
        {isRegistering ? 'Joining...' : 'Join'}
      </button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Registration;