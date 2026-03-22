import { useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls, useKeyboardControls } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../hooks/useGameStore';
import { OBSTACLES, ARENA_SIZE } from './Arena';
import { soundManager } from '../services/soundService';

const SPEED = 5;
const PLAYER_RADIUS = 0.5;

export function Player() {
  const [, getKeys] = useKeyboardControls();
  const camera = useThree((state) => state.camera);
  const scene = useThree((state) => state.scene);
  const { 
    isPlayerDisabled, 
    incrementScore, 
    respawnRequested, 
    triggerHitMarker, 
    updatePlayerTransform, 
    playerTeam,
    activePowerUps,
    isSpectating,
    spectatorTargetId,
    opponents,
    playerPos,
    playerYaw
  } = useGameStore();
  
  const velocity = useRef(new THREE.Vector3());
  const direction = useRef(new THREE.Vector3());
  const laserRef = useRef<THREE.Mesh>(null);
  const [laserActive, setLaserActive] = useState(false);
  const lastShotTime = useRef(0);

  const raycaster = useRef(new THREE.Raycaster());
  const mouse = useRef(new THREE.Vector2(0, 0));

  const checkCollision = (pos: THREE.Vector3) => {
    // Arena bounds
    const halfSize = ARENA_SIZE / 2 - PLAYER_RADIUS;
    if (Math.abs(pos.x) > halfSize || Math.abs(pos.z) > halfSize) return true;

    // Obstacles
    for (const obs of OBSTACLES) {
      const minX = obs.pos[0] - obs.size[0] / 2 - PLAYER_RADIUS;
      const maxX = obs.pos[0] + obs.size[0] / 2 + PLAYER_RADIUS;
      const minZ = obs.pos[2] - obs.size[2] / 2 - PLAYER_RADIUS;
      const maxZ = obs.pos[2] + obs.size[2] / 2 + PLAYER_RADIUS;

      if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
        return true;
      }
    }
    return false;
  };

  const respawn = () => {
    let valid = false;
    let attempts = 0;
    const newPos = new THREE.Vector3();

    while (!valid && attempts < 100) {
      newPos.set(
        (Math.random() - 0.5) * (ARENA_SIZE - 2),
        1.7,
        (Math.random() - 0.5) * (ARENA_SIZE - 2)
      );
      if (!checkCollision(newPos)) {
        valid = true;
      }
      attempts++;
    }

    camera.position.copy(newPos);
    velocity.current.set(0, 0, 0);
  };

  useEffect(() => {
    if (respawnRequested > 0) {
      respawn();
    }
  }, [respawnRequested]);

  const shoot = () => {
    if (isPlayerDisabled) return;
    
    const now = Date.now();
    const cooldown = activePowerUps.RAPID_FIRE ? 100 : 300;
    if (now - lastShotTime.current < cooldown) return;
    
    lastShotTime.current = now;
    setLaserActive(true);
    setTimeout(() => setLaserActive(false), 100);
    
    soundManager.play('PLAYER_LASER', 0.4);

    // Raycast from camera
    raycaster.current.setFromCamera(mouse.current, camera);
    const intersects = raycaster.current.intersectObjects(scene.children, true);

    if (intersects.length > 0) {
      for (const hit of intersects) {
        let obj: THREE.Object3D | null = hit.object;
        let isOpponent = false;
        let isPlayerWeapon = false;
        let isWall = false;
        
        while (obj) {
          if (obj.userData) {
            if (obj.userData.isOpponent) isOpponent = true;
            if (obj.userData.isPlayerWeapon) isPlayerWeapon = true;
            if (obj.userData.isWall) isWall = true;
          }
          if (isOpponent || isPlayerWeapon || isWall) break;
          obj = obj.parent;
        }

        if (isPlayerWeapon) {
          continue; // Ignore player's own weapons/shield and keep checking
        }

        if (isWall) {
          break; // Hit a wall, stop checking
        }

        // Check if we hit an opponent
        if (isOpponent && obj) {
          if (!obj.userData.isDisabled) {
            // Friendly fire check
            if (obj.userData.team !== playerTeam) {
              obj.userData.onHit();
              incrementScore();
              triggerHitMarker();
            }
          }
          break; // Stop checking after hitting an opponent (even if disabled or friendly)
        }
        
        // If it's none of the above (e.g. floor, health bar, laser beam), ignore it and keep checking
      }
    }
  };

  useEffect(() => {
    const handleMouseDown = () => {
      if (document.pointerLockElement) {
        shoot();
      }
    };
    window.addEventListener('mousedown', handleMouseDown);
    return () => window.removeEventListener('mousedown', handleMouseDown);
  }, [isPlayerDisabled]);

  useEffect(() => {
    if (!isSpectating) {
      camera.position.set(playerPos[0], playerPos[1], playerPos[2]);
      camera.rotation.set(0, playerYaw, 0);
    }
  }, [isSpectating]);

  useFrame((state, delta) => {
    if (isSpectating) {
      // Spectator Camera Logic
      let targetPos = new THREE.Vector3();
      let targetYaw = 0;

      if (spectatorTargetId === 'player') {
        // If spectating player, we use the player's last known position from store or just the camera's current if it was player
        // But player component IS the camera usually. 
        // Let's make it follow the player's logical position
        targetPos.set(camera.position.x, camera.position.y, camera.position.z);
        // For player, we don't need to move the camera as it IS the player
        // However, if we want a "chase cam" for the player too:
        // Actually, let's just stay in first person for player
        return; 
      } else {
        const opp = opponents[spectatorTargetId];
        if (opp) {
          targetPos.set(opp.pos[0], opp.pos[1], opp.pos[2]);
          // Chase camera offset
          const offset = new THREE.Vector3(0, 2, 5);
          // We don't have the opponent's yaw easily in the store yet, but we can look at them
          const camTarget = targetPos.clone();
          const camPos = targetPos.clone().add(offset);
          
          camera.position.lerp(camPos, 0.1);
          camera.lookAt(camTarget);
        }
      }
      return;
    }

    if (!document.pointerLockElement) return;

    const { forward, backward, left, right } = getKeys();

    // Movement logic
    const currentSpeed = activePowerUps.SPEED ? SPEED * 1.6 : SPEED;
    direction.current.z = Number(forward) - Number(backward);
    direction.current.x = Number(right) - Number(left);
    direction.current.normalize();

    if (forward || backward) velocity.current.z -= direction.current.z * currentSpeed * delta;
    if (left || right) velocity.current.x -= direction.current.x * currentSpeed * delta;

    // Apply movement with collision check
    const nextPos = camera.position.clone();
    
    // Try X movement
    const moveX = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).multiplyScalar(-velocity.current.x);
    const testPosX = nextPos.clone().add(moveX);
    if (!checkCollision(testPosX)) {
      camera.position.add(moveX);
    }

    // Try Z movement
    const moveZ = new THREE.Vector3().setFromMatrixColumn(camera.matrix, 0).cross(camera.up).multiplyScalar(velocity.current.z);
    const testPosZ = camera.position.clone().add(moveZ);
    if (!checkCollision(testPosZ)) {
      camera.position.add(moveZ);
    }

    velocity.current.multiplyScalar(0.9); // Friction

    // Keep player at eye level
    camera.position.y = 1.7;

    // Update laser position/rotation to match camera
    if (laserRef.current) {
      laserRef.current.position.copy(camera.position);
      laserRef.current.quaternion.copy(camera.quaternion);
      laserRef.current.rotateX(Math.PI / 2); // Rotate to align cylinder with forward
      laserRef.current.translateY(-50.5); // Cylinder's local Y is now forward
      laserRef.current.translateX(0.2); // Slightly offset to the right
      laserRef.current.translateZ(0.2); // Slightly down
    }

    // Update store for minimap
    updatePlayerTransform(
      [camera.position.x, camera.position.y, camera.position.z],
      camera.rotation.y
    );
  });

  return (
    <>
      {!isSpectating && <PointerLockControls />}
      {laserActive && (
        <mesh ref={laserRef} userData={{ isPlayerWeapon: true }}>
          <cylinderGeometry args={[0.01, 0.01, 100]} />
          <meshBasicMaterial color={activePowerUps.RAPID_FIRE ? "#ff00ff" : "#00ffff"} transparent opacity={0.8} />
        </mesh>
      )}
      {activePowerUps.SHIELD && activePowerUps.SHIELD > 0 && (
        <mesh position={[0, 0, -1]} rotation={[0, 0, 0]} userData={{ isPlayerWeapon: true }}>
          <sphereGeometry args={[2, 32, 32]} />
          <meshBasicMaterial color="#ffff00" transparent opacity={0.1} wireframe />
        </mesh>
      )}
    </>
  );
}
