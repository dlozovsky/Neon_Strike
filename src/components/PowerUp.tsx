import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Text, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore, PowerUpType } from '../hooks/useGameStore';

interface PowerUpProps {
  id: string;
  type: PowerUpType;
  position: [number, number, number];
}

const POWERUP_CONFIG = {
  SPEED: { color: '#00ffff', label: 'SPEED', icon: '⚡' },
  RAPID_FIRE: { color: '#ff00ff', label: 'RAPID', icon: '🔥' },
  SHIELD: { color: '#ffff00', label: 'SHIELD', icon: '🛡️' },
};

export function PowerUp({ id, type, position }: PowerUpProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const collectPowerUp = useGameStore((state) => state.collectPowerUp);
  const config = POWERUP_CONFIG[type];

  useFrame((state) => {
    if (!meshRef.current) return;

    // Check distance to player
    const playerPos = state.camera.position;
    const dist = meshRef.current.getWorldPosition(new THREE.Vector3()).distanceTo(playerPos);

    if (dist < 1.5) {
      collectPowerUp(id);
    }
  });

  return (
    <group position={position}>
      <Float speed={5} rotationIntensity={2} floatIntensity={2}>
        <Sphere ref={meshRef} args={[0.5, 32, 32]}>
          <MeshDistortMaterial
            color={config.color}
            speed={3}
            distort={0.4}
            radius={1}
            emissive={config.color}
            emissiveIntensity={0.5}
            transparent
            opacity={0.8}
          />
        </Sphere>
        <Text
          position={[0, 1, 0]}
          fontSize={0.4}
          color="white"
          font="https://fonts.gstatic.com/s/pressstart2p/v14/e3t4euO8J-y97nizJ0VZ9ALWpr3E.woff"
          anchorX="center"
          anchorY="middle"
        >
          {config.icon}
        </Text>
      </Float>
      
      {/* Ground Glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.9, 0]}>
        <planeGeometry args={[2, 2]} />
        <meshBasicMaterial color={config.color} transparent opacity={0.2} />
      </mesh>
      
      <pointLight color={config.color} intensity={2} distance={5} />
    </group>
  );
}
