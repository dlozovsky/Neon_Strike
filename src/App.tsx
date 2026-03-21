import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Sky, Stars } from '@react-three/drei';
import { useEffect } from 'react';
import { Arena } from './components/Arena';
import { Player } from './components/Player';
import { AIUnit } from './components/AIUnit';
import { PowerUpManager } from './components/PowerUpManager';
import { HUD } from './components/HUD';
import { useGameStore } from './hooks/useGameStore';

import { soundManager } from './services/soundService';

const keyboardMap = [
  { name: 'forward', keys: ['ArrowUp', 'KeyW'] },
  { name: 'backward', keys: ['ArrowDown', 'KeyS'] },
  { name: 'left', keys: ['ArrowLeft', 'KeyA'] },
  { name: 'right', keys: ['ArrowRight', 'KeyD'] },
];

export default function App() {
  const { gameStarted, tick, timeLeft, resetGame } = useGameStore();

  useEffect(() => {
    let interval: any;
    if (gameStarted && timeLeft > 0) {
      interval = setInterval(tick, 1000);
    } else if (timeLeft === 0 && gameStarted) {
      soundManager.play('GAME_OVER', 0.8);
      document.exitPointerLock?.();
    }
    return () => clearInterval(interval);
  }, [gameStarted, timeLeft, tick]);

  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <KeyboardControls map={keyboardMap}>
        <Canvas shadows camera={{ fov: 75 }}>
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 0, 50]} />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          <ambientLight intensity={0.2} />
          
          {gameStarted && timeLeft > 0 && (
            <>
              <Arena />
              <Player />
              <PowerUpManager />
              
              {/* AI Units (Teammates and Opponents) */}
              <AIUnit 
                id="ai-1" 
                initialPosition={[15, 1, 15]} 
                type="aggressive" 
                team="B" 
                patrolPath={[
                  [15, 1, 15],
                  [20, 1, 0],
                  [15, 1, -15],
                  [0, 1, -20]
                ]}
              />
              <AIUnit 
                id="ai-2" 
                initialPosition={[-15, 1, -15]} 
                type="tactical" 
                team="B" 
                patrolPath={[
                  [-15, 1, -15],
                  [-20, 1, 0],
                  [-15, 1, 15],
                  [0, 1, 20]
                ]}
              />
              <AIUnit 
                id="ai-3" 
                initialPosition={[15, 1, -15]} 
                type="sniper" 
                team="B" 
                patrolPath={[
                  [15, 1, -15],
                  [20, 1, -20],
                  [0, 1, -20],
                  [10, 1, -10]
                ]}
              />
              <AIUnit 
                id="ai-4" 
                initialPosition={[-15, 1, 15]} 
                type="tactical" 
                team="A" 
                patrolPath={[
                  [-15, 1, 15],
                  [-10, 1, 10],
                  [0, 1, 20],
                  [-20, 1, 10]
                ]}
              />
              <AIUnit 
                id="ai-5" 
                initialPosition={[0, 1, 10]} 
                type="aggressive" 
                team="A" 
                patrolPath={[
                  [0, 1, 10],
                  [10, 1, 0],
                  [0, 1, -10],
                  [-10, 1, 0]
                ]}
              />
            </>
          )}
        </Canvas>
        
        <HUD />
      </KeyboardControls>
    </div>
  );
}
