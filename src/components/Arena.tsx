import * as THREE from 'three';
import { useMemo } from 'react';

export const ARENA_SIZE = 50;
export const WALL_HEIGHT = 6;

export const OBSTACLES = [
  { pos: [10, 0, 10], size: [4, 4, 4] },
  { pos: [-10, 0, -15], size: [3, 5, 3] },
  { pos: [15, 0, -10], size: [2, 4, 8] },
  { pos: [-15, 0, 10], size: [6, 3, 2] },
  { pos: [0, 0, 20], size: [8, 4, 2] },
  { pos: [0, 0, -20], size: [8, 4, 2] },
  { pos: [20, 0, 0], size: [2, 4, 8] },
  { pos: [-20, 0, 0], size: [2, 4, 8] },
];

const Obstacle = ({ obs }: { obs: typeof OBSTACLES[0] }) => {
  const geometry = useMemo(() => new THREE.BoxGeometry(obs.size[0], obs.size[1], obs.size[2]), [obs.size]);
  const edges = useMemo(() => new THREE.EdgesGeometry(geometry), [geometry]);

  return (
    <mesh position={[obs.pos[0] as number, (obs.pos[1] as number) + (obs.size[1] as number) / 2, obs.pos[2] as number]} castShadow receiveShadow userData={{ isWall: true }} frustumCulled={false}>
      <primitive object={geometry} attach="geometry" />
      <meshStandardMaterial color="#222" emissive="#00ffff" emissiveIntensity={0.05} />
      <lineSegments frustumCulled={false}>
        <primitive object={edges} attach="geometry" />
        <lineBasicMaterial color="#00ffff" />
      </lineSegments>
    </mesh>
  );
};

export function Arena() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.01, 0]} userData={{ isFloor: true }}>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color="#111" roughness={0.8} metalness={0.2} />
      </mesh>
      
      {/* Grid Helper */}
      <gridHelper args={[ARENA_SIZE, 50, "#00ffff", "#002222"]} position={[0, -0.005, 0]} />

      {/* Walls */}
      <mesh position={[0, WALL_HEIGHT / 2, ARENA_SIZE / 2]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 0.5]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, -ARENA_SIZE / 2]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 0.5]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[ARENA_SIZE / 2, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 0.5]} />
        <meshStandardMaterial color="#111" />
      </mesh>
      <mesh position={[-ARENA_SIZE / 2, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 0.5]} />
        <meshStandardMaterial color="#111" />
      </mesh>

      {/* Obstacles */}
      {OBSTACLES.map((obs, i) => (
        <Obstacle key={i} obs={obs} />
      ))}

      {/* Ambient and Point Lights for Atmosphere */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#ff00ff" castShadow shadow-bias={-0.0001} />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00ffff" castShadow shadow-bias={-0.0001} />
      <pointLight position={[0, 15, 0]} intensity={0.3} color="#ffffff" />
    </group>
  );
}
