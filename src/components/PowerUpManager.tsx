import { useEffect, useRef } from 'react';
import { useGameStore, PowerUpType } from '../hooks/useGameStore';
import { PowerUp } from './PowerUp';
import { ARENA_SIZE, OBSTACLES } from './Arena';

export function PowerUpManager() {
  const { spawnedPowerUps, spawnPowerUp, gameStarted, timeLeft } = useGameStore();
  const lastSpawnTime = useRef(0);

  useEffect(() => {
    if (!gameStarted || timeLeft <= 0) return;

    const interval = setInterval(() => {
      // Spawn every 15-25 seconds
      const now = Date.now();
      if (now - lastSpawnTime.current > 15000 && spawnedPowerUps.length < 3) {
        const types: PowerUpType[] = ['SPEED', 'RAPID_FIRE', 'SHIELD'];
        const type = types[Math.floor(Math.random() * types.length)];
        
        // Random position, avoiding obstacles
        let pos: [number, number, number] = [0, 1, 0];
        let valid = false;
        let attempts = 0;

        while (!valid && attempts < 10) {
          const x = (Math.random() - 0.5) * (ARENA_SIZE - 4);
          const z = (Math.random() - 0.5) * (ARENA_SIZE - 4);
          pos = [x, 1, z];
          
          valid = true;
          for (const obs of OBSTACLES) {
            const minX = obs.pos[0] - obs.size[0] / 2 - 1;
            const maxX = obs.pos[0] + obs.size[0] / 2 + 1;
            const minZ = obs.pos[2] - obs.size[2] / 2 - 1;
            const maxZ = obs.pos[2] + obs.size[2] / 2 + 1;
            if (x > minX && x < maxX && z > minZ && z < maxZ) {
              valid = false;
              break;
            }
          }
          attempts++;
        }

        if (valid) {
          spawnPowerUp(type, pos);
          lastSpawnTime.current = now;
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [gameStarted, timeLeft, spawnedPowerUps.length, spawnPowerUp]);

  return (
    <>
      {spawnedPowerUps.map((p) => (
        <PowerUp key={p.id} id={p.id} type={p.type} position={p.pos} />
      ))}
    </>
  );
}
