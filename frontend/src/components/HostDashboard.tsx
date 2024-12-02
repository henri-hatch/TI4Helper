// src/components/HostDashboard.tsx
import React, { useContext, useEffect, useState } from 'react';
import { GameContext } from '../contexts/GameContext';
import { getLocalIPs } from '../services/api';

const HostDashboard: React.FC = () => {
  const { gameState } = useContext(GameContext);
  const [ips, setIps] = useState<string[]>([]);

  useEffect(() => {
    const fetchIPs = async () => {
      try {
        const fetchedIPs = await getLocalIPs();
        setIps(fetchedIPs);
      } catch (error) {
        console.error('Error fetching IPs:', error);
      }
    };
    fetchIPs();
  }, []);

  if (!gameState) return <div>Loading...</div>;

  return (
    <div style={{ padding: '20px' }}>
      <h1>Host Dashboard</h1>
      
      <div style={{ marginBottom: '20px', padding: '10px', border: '1px solid #ccc' }}>
        <h2>Connect to the Game</h2>
        <p>Share the following URLs with players on the same network:</p>
        {ips.length > 0 ? (
          ips.map(ip => (
            <div key={ip}>
              <code>{`http://${ip}:3000`}</code>
            </div>
          ))
        ) : (
          <p>Unable to retrieve IP addresses.</p>
        )}
      </div>
      
      <h2>Victory Points</h2>
      <ul>
        {gameState.players.map(player => (
          <li key={player.playerId}>
            {player.name}: {player.victoryPoints} points
          </li>
        ))}
      </ul>
      {/* Add more host-specific components here */}
    </div>
  );
};

export default HostDashboard;