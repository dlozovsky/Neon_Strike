import { memo, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { KeyboardControls, Stars } from '@react-three/drei';
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

// Memoized Arena to prevent re-renders
const MemoizedArena = memo(Arena);

// Component to handle game scene rendering based on state
function GameScene() {
  const isGameActive = useGameStore((state) => state.gameStarted && state.timeLeft > 0);

  if (!isGameActive) return null;

  return (
    <>
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
  );
}

// Separate component to handle game logic without re-rendering the whole App
function GameController() {
  const gameStarted = useGameStore((state) => state.gameStarted);
  const timeLeft = useGameStore((state) => state.timeLeft);
  const tick = useGameStore((state) => state.tick);

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

  return null;
}

export default function App() {
  return (
    <div className="w-full h-screen bg-black overflow-hidden relative">
      <GameController />
      <KeyboardControls map={keyboardMap}>
        <Canvas 
          shadows 
          camera={{ fov: 75, near: 0.1, far: 1000 }}
          gl={{ 
            antialias: true, 
            logarithmicDepthBuffer: true,
            alpha: false,
            stencil: false,
            powerPreference: "high-performance"
          }}
        >
          <color attach="background" args={['#050505']} />
          <fog attach="fog" args={['#050505', 0, 300]} />
          
          <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />
          
          <MemoizedArena />
          <GameScene />
        </Canvas>
        
        <HUD />
      </KeyboardControls>
    </div>
  );
}
