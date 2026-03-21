import * as THREE from 'three';

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

export function Arena() {
  return (
    <group>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ARENA_SIZE, ARENA_SIZE]} />
        <meshStandardMaterial color="#111" roughness={0.8} metalness={0.2} />
      </mesh>

      {/* Grid on floor */}
      <gridHelper args={[ARENA_SIZE, 50, "#333", "#222"]} position={[0, 0.01, 0]} />

      {/* Walls */}
      <mesh position={[0, WALL_HEIGHT / 2, -ARENA_SIZE / 2]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0, WALL_HEIGHT / 2, ARENA_SIZE / 2]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-ARENA_SIZE / 2, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[ARENA_SIZE / 2, WALL_HEIGHT / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow castShadow userData={{ isWall: true }}>
        <boxGeometry args={[ARENA_SIZE, WALL_HEIGHT, 1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Obstacles */}
      {OBSTACLES.map((obs, i) => (
        <mesh key={i} position={[obs.pos[0], obs.pos[1] + obs.size[1] / 2, obs.pos[2]]} castShadow receiveShadow userData={{ isWall: true }}>
          <boxGeometry args={obs.size as [number, number, number]} />
          <meshStandardMaterial color="#222" emissive="#00ffff" emissiveIntensity={0.05} />
          {/* Neon edges */}
          <lineSegments>
            <edgesGeometry args={[new THREE.BoxGeometry(...obs.size)]} />
            <lineBasicMaterial color="#00ffff" />
          </lineSegments>
        </mesh>
      ))}

      {/* Ambient and Point Lights for Atmosphere */}
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#ff00ff" castShadow />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#00ffff" castShadow />
      <pointLight position={[0, 15, 0]} intensity={0.3} color="#ffffff" />
    </group>
  );
}
