import { useRef, useState, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, Line } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../hooks/useGameStore';
import { OBSTACLES } from './Arena';
import { soundManager } from '../services/soundService';

interface OpponentProps {
  id: string;
  initialPosition: [number, number, number];
  type?: 'aggressive' | 'tactical' | 'sniper';
  team: 'A' | 'B';
  patrolPath?: [number, number, number][];
}

type AIState = 'patrol' | 'chase' | 'flank' | 'seekCover' | 'attack' | 'guardPlayer' | 'coordinateAttack' | 'peek';

export function AIUnit({ id, initialPosition, type = 'tactical', team, patrolPath }: OpponentProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [health, setHealth] = useState(100);
  const [isDisabled, setIsDisabled] = useState(false);
  const [isFlashing, setIsFlashing] = useState(false);
  const [laserActive, setLaserActive] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [targetPos, setTargetPos] = useState(new THREE.Vector3(...initialPosition));
  const currentWaypointIndex = useRef(0);
  const { 
    score, 
    hitsReceived, 
    playerHit, 
    isPlayerDisabled, 
    updateOpponent, 
    opponents, 
    playerTeam, 
    hitMarkerActive, 
    incrementTeamScore,
    tacticalData,
    updateTacticalData
  } = useGameStore();
  
  // Dynamic Difficulty Factor (0.6 to 1.5)
  const difficultyFactor = useMemo(() => {
    const playerHits = score / 100;
    const diff = playerHits - hitsReceived;
    // Base difficulty is 1.0. Increases/decreases by 0.05 per hit differential.
    return Math.min(1.5, Math.max(0.6, 1.0 + diff * 0.05));
  }, [score, hitsReceived]);

  const lastHitsReceived = useRef(hitsReceived);
  const playerUnderFireTimer = useRef(0);
  const lastShotTime = useRef(0);
  const lastHitTime = useRef(0);
  const reactionTimer = useRef(0);
  const hasLOSLastFrame = useRef(false);
  const aiState = useRef<AIState>('patrol');
  const stateTimer = useRef(0);
  const flankAngle = useRef(Math.random() > 0.5 ? Math.PI / 3 : -Math.PI / 3);
  const burstCount = useRef(0);
  const footstepTimer = useRef(0);
  const prevPlayerPos = useRef(new THREE.Vector3());
  const playerVelocity = useRef(new THREE.Vector3());
  const lastPlayerTargetId = useRef<string | null>(null);
  const peekOffset = useRef(new THREE.Vector3());
  const isPeekingOut = useRef(false);
  const coverBasePos = useRef(new THREE.Vector3());
  const peekDuration = useRef(1);
  const peekDistance = useRef(1.5);
  const lastPeekSide = useRef(1); // 1 or -1
  const currentMoveTarget = useRef(new THREE.Vector3());
  const distToPlayerRef = useRef(0);
  const [visualState, setVisualState] = useState<AIState>('patrol');
  const [showCallout, setShowCallout] = useState(false);
  const calloutText = useRef("");
  const leanAngle = useRef(0);

  // Combat Configs based on Type
  const combatConfig = useMemo(() => {
    switch (type) {
      case 'aggressive':
        return {
          accuracy: 0.35,
          cooldown: 1200,
          burstSize: 4,
          burstInterval: 150,
          reactionTime: 0.3,
          maxDist: 15
        };
      case 'sniper':
        return {
          accuracy: 0.85,
          cooldown: 4000,
          burstSize: 1,
          burstInterval: 0,
          reactionTime: 1.2,
          maxDist: 35
        };
      case 'tactical':
      default:
        return {
          accuracy: 0.55,
          cooldown: 2200,
          burstSize: 2,
          burstInterval: 300,
          reactionTime: 0.6,
          maxDist: 22
        };
    }
  }, [type]);

  // Reusable vectors for optimization
  const v1 = useMemo(() => new THREE.Vector3(), []);
  const v2 = useMemo(() => new THREE.Vector3(), []);
  const v3 = useMemo(() => new THREE.Vector3(), []);
  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const onHit = () => {
    if (isDisabled) return;
    
    setIsFlashing(true);
    setTimeout(() => setIsFlashing(false), 70);
    
    const volume = Math.max(0, 0.5 * (1 - distToPlayerRef.current / 30));
    if (volume > 0.05) {
      soundManager.play('HIT_AI', volume);
    }
    lastHitTime.current = Date.now();
    
    // Immediate reaction to being hit
    if (aiState.current === 'attack' || aiState.current === 'patrol') {
      aiState.current = Math.random() > 0.5 ? 'seekCover' : 'flank';
      stateTimer.current = 0;
    }

    const damage = type === 'aggressive' ? 25 : type === 'sniper' ? 50 : 34;
    setHealth(prev => {
      const newHealth = Math.max(0, prev - damage);
      if (newHealth === 0) {
        setIsDisabled(true);
        aiState.current = 'seekCover';
        setTimeout(() => {
          setIsDisabled(false);
          setHealth(100);
        }, 5000); // Longer disable for "depleted" health
      }
      return newHealth;
    });
  };

  // Find best cover relative to target
  const findCover = (targetPos: THREE.Vector3, scene: THREE.Scene) => {
    let bestCover = new THREE.Vector3(...initialPosition);
    let maxScore = -Infinity;

    OBSTACLES.forEach(obs => {
      const obsPos = v1.set(obs.pos[0], 1, obs.pos[2]);
      
      // Check 4 corners/edges of the obstacle for potential cover points
      const offsets = [
        [obs.size[0] / 2 + 1, 0, obs.size[2] / 2 + 1],
        [-(obs.size[0] / 2 + 1), 0, obs.size[2] / 2 + 1],
        [obs.size[0] / 2 + 1, 0, -(obs.size[2] / 2 + 1)],
        [-(obs.size[0] / 2 + 1), 0, -(obs.size[2] / 2 + 1)],
        // Mid-points
        [obs.size[0] / 2 + 1.2, 0, 0],
        [-(obs.size[0] / 2 + 1.2), 0, 0],
        [0, 0, obs.size[2] / 2 + 1.2],
        [0, 0, -(obs.size[2] / 2 + 1.2)],
      ];

      offsets.forEach(offset => {
        const testPos = obsPos.clone().add(v2.set(offset[0], 0, offset[2]));
        
        // Score this position
        let score = 0;
        
        // 1. Distance to current position (prefer closer cover)
        const distToAI = groupRef.current!.position.distanceTo(testPos);
        score -= distToAI * 0.5;

        // 2. Exposure check: Is there an obstacle between this point and the target?
        const dirToTarget = v2.subVectors(targetPos, testPos).normalize();
        raycaster.set(testPos, dirToTarget);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        let hasLOS = true;
        let isProtected = false;

        if (intersects.length > 0) {
          const hit = intersects[0];
          if (hit.object.userData.isWall && hit.distance < targetPos.distanceTo(testPos)) {
            hasLOS = false;
            isProtected = true;
          }
        }

        // We want a position that is PROTECTED but very close to having LOS (an edge)
        // Or even better: A position that is protected from the target's CURRENT pos
        // but can easily peek.
        
        if (isProtected) score += 50; // Good, we are hidden
        
        // 3. Check if we can see the target from a SLIGHT offset (peeking potential)
        // Check both sides
        const right = v2.copy(dirToTarget).cross(new THREE.Vector3(0, 1, 0)).normalize();
        
        const peekRight = testPos.clone().add(right.clone().multiplyScalar(1.5));
        raycaster.set(peekRight, v2.subVectors(targetPos, peekRight).normalize());
        const rightIntersects = raycaster.intersectObjects(scene.children, true);
        const canPeekRight = rightIntersects.length === 0 || !rightIntersects[0].object.userData.isWall;

        const peekLeft = testPos.clone().add(right.clone().multiplyScalar(-1.5));
        raycaster.set(peekLeft, v2.subVectors(targetPos, peekLeft).normalize());
        const leftIntersects = raycaster.intersectObjects(scene.children, true);
        const canPeekLeft = leftIntersects.length === 0 || !leftIntersects[0].object.userData.isWall;
        
        if (canPeekRight || canPeekLeft) score += 30;
        if (canPeekRight && canPeekLeft) score += 10; // Extra points for multiple peek options

        if (score > maxScore) {
          maxScore = score;
          bestCover = testPos;
        }
      });
    });
    return bestCover;
  };

  const checkLOS = (targetPos: THREE.Vector3, scene: THREE.Scene) => {
    if (!groupRef.current) return false;
    const origin = groupRef.current.position.clone().add(v1.set(0, 0.5, 0));
    const dir = v2.subVectors(targetPos, origin).normalize();
    raycaster.set(origin, dir);
    const intersects = raycaster.intersectObjects(scene.children, true);
    
    if (intersects.length > 0) {
      const hit = intersects[0];
      if (hit.object.userData.isWall) return false;
      // Friendly fire check: if we hit a teammate, don't shoot
      if (hit.object.userData.isOpponent && hit.object.userData.team === team) return false;
      return true;
    }
    return false;
  };

  useFrame((stateObj, delta) => {
    if (!groupRef.current || !meshRef.current || isDisabled) return;

    // Track if player is under heavy fire
    if (hitsReceived > lastHitsReceived.current) {
      playerUnderFireTimer.current = 3; // 3 seconds of "under fire" status
      lastHitsReceived.current = hitsReceived;
    }
    playerUnderFireTimer.current = Math.max(0, playerUnderFireTimer.current - delta);

    // Find nearest enemy
    const playerPos = stateObj.camera.position;
    const distToPlayer = groupRef.current.position.distanceTo(playerPos);
    distToPlayerRef.current = distToPlayer;
    let nearestEnemyPos = playerPos.clone();
    let minDist = distToPlayer;
    let targetIsPlayer = true;
    let targetId = 'player';

    // Check other opponents
    if (playerTeam === team) {
      // Player is a teammate, don't target them by default if there are other enemies
      minDist = Infinity;
      targetIsPlayer = false;
    }

    Object.values(opponents).forEach(opp => {
      if (opp.id === id || opp.team === team || opp.isDisabled) return;
      const oppPos = v1.set(opp.pos[0], opp.pos[1], opp.pos[2]);
      const dist = groupRef.current!.position.distanceTo(oppPos);
      if (dist < minDist) {
        minDist = dist;
        nearestEnemyPos.copy(oppPos);
        targetIsPlayer = false;
        targetId = opp.id;
      }
    });

    // If player is enemy and closer than any other AI enemy
    if (playerTeam !== team) {
      if (distToPlayer < minDist) {
        minDist = distToPlayer;
        nearestEnemyPos.copy(playerPos);
        targetIsPlayer = true;
        targetId = 'player';
      }
    }

    // Teammate specific logic: Guarding and Coordinating
    const isTeammate = playerTeam === team;
    if (isTeammate) {
      // Find the most immediate threat to the player
      let mostDangerousEnemyId: string | null = null;
      let closestEnemyToPlayerDist = Infinity;

      Object.values(opponents).forEach(opp => {
        if (opp.team !== team && !opp.isDisabled) {
          const enemyPos = v1.set(opp.pos[0], opp.pos[1], opp.pos[2]);
          const distToPlayer = enemyPos.distanceTo(playerPos);
          
          if (distToPlayer < 20 && distToPlayer < closestEnemyToPlayerDist) {
            closestEnemyToPlayerDist = distToPlayer;
            mostDangerousEnemyId = opp.id;
          }
        }
      });

      const isPlayerUnderHeavyFire = playerUnderFireTimer.current > 0;

      if ((isPlayerDisabled || isPlayerUnderHeavyFire) && mostDangerousEnemyId) {
        // Actively guard the player if they are disabled or taking hits
        aiState.current = 'guardPlayer';
        targetId = mostDangerousEnemyId;
        const opp = opponents[mostDangerousEnemyId];
        if (opp) nearestEnemyPos.set(opp.pos[0], opp.pos[1], opp.pos[2]);
      } else if (hitMarkerActive && aiState.current !== 'guardPlayer') {
        // Coordinate attack if player is performing well (landing hits)
        aiState.current = 'coordinateAttack';
        // Stick with the current nearest enemy but move more aggressively
      }
    }

    // If no enemy found, patrol
    if (minDist === Infinity && aiState.current !== 'guardPlayer') {
      aiState.current = 'patrol';
    }

    const distToTarget = minDist;
    stateTimer.current += delta;

    // Calculate target velocity (simplified for other AI)
    // For player, we use the previous logic
    if (targetIsPlayer) {
      if (prevPlayerPos.current.length() > 0) {
        playerVelocity.current.subVectors(playerPos, prevPlayerPos.current).divideScalar(delta);
      }
      prevPlayerPos.current.copy(playerPos);
    } else {
      // For other AI, we could track their velocity too, but let's keep it simple for now
      playerVelocity.current.set(0, 0, 0);
    }

    // Calculate lead position
    const projectileSpeed = 20;
    const leadTime = distToTarget / projectileSpeed;

    // --- Coordination Logic ---
    const hasLOS = checkLOS(nearestEnemyPos, stateObj.scene);
    
    // Broadcast LOS to teammates
    if (hasLOS && !isDisabled && !isTeammate) {
      const now = Date.now();
      if (now - tacticalData.lastSpottedTime > 1000 || !tacticalData.lastSpottedPlayerPos) {
        updateTacticalData({
          lastSpottedPlayerPos: [nearestEnemyPos.x, nearestEnemyPos.y, nearestEnemyPos.z],
          lastSpottedTime: now
        });
        
        // Visual Callout
        if (!showCallout) {
          calloutText.current = type === 'sniper' ? "Target acquired!" : "Enemy spotted!";
          setShowCallout(true);
          setTimeout(() => setShowCallout(false), 2000);
        }
      }
    }

    // React to teammate callouts if we don't have LOS
    let effectiveTargetPos = nearestEnemyPos.clone();
    const spottedRecently = tacticalData.lastSpottedPlayerPos && (Date.now() - tacticalData.lastSpottedTime < 5000);
    
    if (!hasLOS && spottedRecently && !isTeammate) {
      effectiveTargetPos.set(...tacticalData.lastSpottedPlayerPos!);
    }

    const predictedPos = v3.copy(effectiveTargetPos).add(playerVelocity.current.clone().multiplyScalar(leadTime));

    // State Transitions
    if (distToTarget < 20 || aiState.current === 'guardPlayer' || aiState.current === 'coordinateAttack') {
      // Tactical Flanking: If in seekCover and player is predictable, switch to flank
      if (aiState.current === 'seekCover' && stateTimer.current > 0.5) {
        const playerSpeed = playerVelocity.current.length();
        const isPredictable = playerSpeed < 1.5; // Stationary or slow movement
        
        if (isPredictable && Math.random() > 0.3) {
          aiState.current = 'flank';
          stateTimer.current = 0;
          // Choose a wide flanking angle (70-110 degrees)
          flankAngle.current = (Math.random() > 0.5 ? 1 : -1) * (Math.PI / 2.5 + Math.random() * Math.PI / 6);
        }
      }

      if (stateTimer.current > 3) {
        stateTimer.current = 0;
        const rand = Math.random();
        
        if (aiState.current === 'guardPlayer' && !isPlayerDisabled) {
          aiState.current = 'attack';
        } else if (aiState.current === 'coordinateAttack' && !hitMarkerActive) {
          aiState.current = 'attack';
        } else if (aiState.current === 'peek') {
          aiState.current = 'seekCover'; // Go back to cover after peeking
        } else if (aiState.current !== 'guardPlayer' && aiState.current !== 'coordinateAttack') {
          if (type === 'aggressive') {
            aiState.current = rand > 0.3 ? 'chase' : 'attack';
          } else if (type === 'tactical') {
            if (rand > 0.6) aiState.current = 'flank';
            else if (rand > 0.3) aiState.current = 'seekCover';
            else aiState.current = 'attack';
          } else { // sniper
            aiState.current = distToTarget < 10 ? 'seekCover' : 'attack';
          }
        }
      }
    } else {
      aiState.current = 'patrol';
    }

    // Execute States
    let moveSpeed = 2 * (0.8 + difficultyFactor * 0.2);
    let currentTarget = targetPos;

    // Special transition for peeking
    if (aiState.current === 'seekCover' && groupRef.current.position.distanceTo(currentTarget) < 0.8) {
      const peekCooldown = type === 'sniper' ? 1.5 : type === 'aggressive' ? 0.4 : 0.8;
      if (stateTimer.current > peekCooldown && Math.random() > 0.2) {
        aiState.current = 'peek';
        stateTimer.current = 0;
        coverBasePos.current.copy(groupRef.current.position);
        
        // Dynamic peek parameters
        peekDuration.current = type === 'sniper' ? 2.0 + Math.random() : 0.8 + Math.random() * 1.2;
        peekDistance.current = 1.5 + Math.random() * 0.5;
        
        // Choose side: Check which side gives better LOS
        const dirToTarget = v1.subVectors(nearestEnemyPos, groupRef.current.position).normalize();
        const right = v2.copy(dirToTarget).cross(new THREE.Vector3(0, 1, 0)).normalize();
        
        // Test right side
        const testRight = groupRef.current.position.clone().add(right.clone().multiplyScalar(2));
        const hasRightLOS = checkLOS(nearestEnemyPos, stateObj.scene); // Simplified check
        
        // Test left side
        const testLeft = groupRef.current.position.clone().add(right.clone().multiplyScalar(-2));
        // Actually, let's just alternate or choose based on a simple raycast
        if (Math.random() > 0.5) lastPeekSide.current *= -1;
        
        peekOffset.current.copy(right).multiplyScalar(peekDistance.current * lastPeekSide.current);
        isPeekingOut.current = true;
      }
    }

    // Reset lean if not peeking
    if (aiState.current !== 'peek') {
      leanAngle.current = THREE.MathUtils.lerp(leanAngle.current, 0, 0.1);
    }

    switch (aiState.current) {
      case 'peek':
        moveSpeed = 3.5 * (0.8 + difficultyFactor * 0.2);
        if (isPeekingOut.current) {
          currentTarget = coverBasePos.current.clone().add(peekOffset.current);
          
          // If we have LOS, we might stay a bit longer to fire
          const hasLOS = checkLOS(predictedPos, stateObj.scene);
          const currentPeekDuration = hasLOS ? peekDuration.current : peekDuration.current * 0.3;

          // Visual Leaning
          const targetLean = lastPeekSide.current * 0.3;
          leanAngle.current = THREE.MathUtils.lerp(leanAngle.current, targetLean, 0.1);

          if (groupRef.current.position.distanceTo(currentTarget) < 0.3) {
            // Reached peek position, stay for dynamic duration then go back
            if (stateTimer.current > currentPeekDuration) {
              isPeekingOut.current = false;
            }
          }
        } else {
          currentTarget = coverBasePos.current.clone();
          // Visual Leaning reset
          leanAngle.current = THREE.MathUtils.lerp(leanAngle.current, 0, 0.1);
          
          if (groupRef.current.position.distanceTo(currentTarget) < 0.3) {
            aiState.current = 'seekCover';
            stateTimer.current = 0;
          }
        }
        break;
      case 'guardPlayer':
        // Position between player and enemy
        const dirToEnemy = v1.subVectors(effectiveTargetPos, playerPos).normalize();
        currentTarget = playerPos.clone().add(dirToEnemy.multiplyScalar(3));
        moveSpeed = 4 * (0.8 + difficultyFactor * 0.2); // Rush to protect
        break;
      case 'coordinateAttack':
        // Move towards player's target but keep distance
        currentTarget = effectiveTargetPos.clone();
        moveSpeed = 2.5 * (0.8 + difficultyFactor * 0.2);
        if (score > 500) moveSpeed *= 1.3; // More aggressive if player is doing well
        break;
      case 'chase':
        moveSpeed = 4.5 * (0.8 + difficultyFactor * 0.2);
        // If teammate is already chasing, maybe we flank instead
        const otherTeammates = Object.values(opponents).filter(o => o.id !== id && o.team === team && !o.isDisabled);
        const teammateChasing = otherTeammates.some(o => o.id in tacticalData.activeManeuvers && tacticalData.activeManeuvers[o.id] === 'CHASE');
        
        if (teammateChasing && Math.random() > 0.5) {
          aiState.current = 'flank';
          stateTimer.current = 0;
        } else {
          currentTarget = effectiveTargetPos.clone();
          if (distToTarget < 10) aiState.current = 'attack';
        }
        break;

      case 'flank':
        moveSpeed = 5.0 * (0.8 + difficultyFactor * 0.2);
        // Coordinate flanking angles
        const flankingTeammates = Object.values(opponents).filter(o => o.id !== id && o.team === team && !o.isDisabled && tacticalData.activeManeuvers[o.id] === 'FLANK');
        if (flankingTeammates.length > 0 && stateTimer.current < 0.1) {
          // If another teammate is flanking, choose the opposite side
          flankAngle.current = -flankAngle.current;
        }

        const dirToPlayer = v1.subVectors(effectiveTargetPos, groupRef.current.position).normalize();
        const flankDir = v2.copy(dirToPlayer).applyAxisAngle(new THREE.Vector3(0, 1, 0), flankAngle.current);
        currentTarget = groupRef.current.position.clone().add(flankDir.multiplyScalar(8));
        
        if (hasLOS && distToTarget < 15) aiState.current = 'attack';
        if (stateTimer.current > 5) aiState.current = 'seekCover';
        break;
      case 'seekCover':
        currentTarget = findCover(nearestEnemyPos, stateObj.scene);
        moveSpeed = 3.5 * (0.8 + difficultyFactor * 0.2);
        break;
      case 'attack':
        const strafeDir = v1.subVectors(effectiveTargetPos, groupRef.current.position).normalize();
        
        // Coordination: If teammate is already attacking from one side, try to move to the other
        const attackingTeammates = Object.values(opponents).filter(o => o.id !== id && o.team === team && !o.isDisabled && tacticalData.activeManeuvers[o.id] === 'ATTACK');
        let strafeAngle = Math.PI / 2;
        if (attackingTeammates.length > 0) {
          strafeAngle = Math.PI / 1.5; // Wider angle for crossfire
        }

        strafeDir.applyAxisAngle(v2.set(0, 1, 0), strafeAngle);
        currentTarget = groupRef.current.position.clone().add(strafeDir.multiplyScalar(Math.sin(stateTimer.current * 2) * 3));
        moveSpeed = 1.5 * (0.8 + difficultyFactor * 0.2);
        break;
      case 'patrol':
        if (groupRef.current.position.distanceTo(targetPos) < 1.5) {
          if (patrolPath && patrolPath.length > 0) {
            currentWaypointIndex.current = (currentWaypointIndex.current + 1) % patrolPath.length;
            const nextWaypoint = patrolPath[currentWaypointIndex.current];
            setTargetPos(new THREE.Vector3(...nextWaypoint));
          } else {
            // Fallback to random patrol if no path provided
            setTargetPos(new THREE.Vector3(
              (Math.random() - 0.5) * 40,
              1,
              (Math.random() - 0.5) * 40
            ));
          }
        }
        currentTarget = targetPos;
        moveSpeed = 1.5 * (0.8 + difficultyFactor * 0.2);
        break;
    }

    // Update active maneuvers in store
    if (stateTimer.current % 10 === 0) { // Throttle updates
      updateTacticalData({
        activeManeuvers: {
          ...tacticalData.activeManeuvers,
          [id]: aiState.current.toUpperCase()
        }
      });
    }

    // Movement
    groupRef.current.lookAt(predictedPos.x, 1, predictedPos.z);
    meshRef.current.rotation.z = leanAngle.current;
    let moveDir = v1.subVectors(currentTarget, groupRef.current.position).normalize();
    
    // --- Obstacle Avoidance ---
    // Cast a ray in the movement direction to detect walls/obstacles
    raycaster.set(groupRef.current.position, moveDir);
    const obstacles = raycaster.intersectObjects(stateObj.scene.children, true)
      .filter(hit => hit.object.userData.isWall && hit.distance < 3);

    if (obstacles.length > 0) {
      // Calculate a steering force away from the obstacle
      const hitNormal = obstacles[0].face?.normal.clone().applyQuaternion(obstacles[0].object.quaternion) || new THREE.Vector3(0, 0, 1);
      // Steer parallel to the wall
      const steerDir = new THREE.Vector3().crossVectors(hitNormal, new THREE.Vector3(0, 1, 0)).normalize();
      // Choose the direction that is closer to our intended moveDir
      if (steerDir.dot(moveDir) < 0) steerDir.negate();
      moveDir.addScaledVector(steerDir, 2).normalize();
    }

    // --- Evasive Maneuvers ---
    // If recently hit, add some lateral "jitter" or strafing
    const timeSinceHit = Date.now() - lastHitTime.current;
    if (timeSinceHit < 2000) {
      const strafeAmount = Math.sin(stateObj.clock.elapsedTime * 10) * 0.8;
      const right = new THREE.Vector3(0, 1, 0).cross(moveDir).normalize();
      moveDir.addScaledVector(right, strafeAmount).normalize();
      moveSpeed *= 1.2; // Move faster when under fire
    }

    groupRef.current.position.add(moveDir.multiplyScalar(moveSpeed * delta));
    currentMoveTarget.current.copy(currentTarget);
    if (visualState !== aiState.current) setVisualState(aiState.current);

    // Footsteps
    if (moveSpeed > 0.5) {
      footstepTimer.current += delta;
      if (footstepTimer.current > 0.4) {
        // Volume based on distance to player
        const volume = Math.max(0, 0.3 * (1 - distToPlayer / 30));
        if (volume > 0.05) {
          soundManager.play('FOOTSTEPS', volume);
        }
        footstepTimer.current = 0;
      }
    }

    // Attack Patterns
    const now = Date.now();
    const hasLOSAttack = checkLOS(predictedPos, stateObj.scene);
    
    // Reaction Logic: Reset reaction timer if LOS is lost
    if (!hasLOSAttack) {
      reactionTimer.current = 0;
      hasLOSLastFrame.current = false;
    } else {
      if (!hasLOSLastFrame.current) {
        // Just gained LOS, start reaction timer
        reactionTimer.current = 0;
      }
      reactionTimer.current += delta;
      hasLOSLastFrame.current = true;
    }

    let cooldown = combatConfig.cooldown / difficultyFactor;
    
    // Teammates guarding player or coordinating shoot faster
    if (aiState.current === 'guardPlayer' || aiState.current === 'coordinateAttack') {
      cooldown *= 0.7;
    }
    
    // AI can shoot if it has LOS, is not in patrol, and has reacted
    const hasReacted = reactionTimer.current >= combatConfig.reactionTime;
    const canShootInState = aiState.current !== 'patrol' && (aiState.current !== 'peek' || isPeekingOut.current);

    if (now - lastShotTime.current > cooldown && distToTarget < combatConfig.maxDist && canShootInState && hasLOSAttack && hasReacted) {
      // Suppression Callout
      if (Math.random() > 0.8 && !showCallout) {
        calloutText.current = "Suppressing!";
        setShowCallout(true);
        setTimeout(() => setShowCallout(false), 1500);
      }

      // Play AI laser sound
      const volume = Math.max(0, 0.25 * (1 - distToPlayer / 30));
      soundManager.play('AI_LASER', volume);

      // Trigger visual laser
      setLaserActive(true);
      setTimeout(() => setLaserActive(false), 100);

      // Accuracy logic
      const playerSpeed = playerVelocity.current.length();
      let accuracy = (combatConfig.accuracy + (playerSpeed > 2 ? 0.05 : 0)) * difficultyFactor;
      
      // Teammates guarding player have better accuracy
      if (aiState.current === 'guardPlayer') {
        accuracy += 0.15;
      }

        const triggerHitEffect = () => {
          if (targetIsPlayer) {
            playerHit();
          } else {
            // Hit other AI
            raycaster.set(groupRef.current!.position.clone().add(v1.set(0, 0.5, 0)), v2.subVectors(predictedPos, groupRef.current!.position).normalize());
            const intersects = raycaster.intersectObjects(stateObj.scene.children, true);
            if (intersects.length > 0) {
              const hit = intersects[0];
              if (hit.object.userData.isOpponent && hit.object.userData.onHit) {
                hit.object.userData.onHit();
                incrementTeamScore(team); // AI unit's team gets score
              }
            }
          }
          setHitFlash(true);
          setTimeout(() => setHitFlash(false), 150);
        };

      // Burst logic
      if (combatConfig.burstSize > 1) {
        if (burstCount.current < combatConfig.burstSize) {
          if (Math.random() < accuracy) triggerHitEffect();
          burstCount.current++;
          // Short delay between burst shots
          lastShotTime.current = now - (cooldown - combatConfig.burstInterval);
        } else {
          burstCount.current = 0;
          lastShotTime.current = now;
        }
      } else {
        // Single shot (Sniper)
        if (Math.random() < accuracy) triggerHitEffect();
        lastShotTime.current = now;
      }
    }

    // Update userData for raycasting
    meshRef.current.userData = {
      isOpponent: true,
      isDisabled,
      onHit,
      team
    };

    // Update store for minimap
    updateOpponent(id, {
      id,
      pos: [groupRef.current.position.x, groupRef.current.position.y, groupRef.current.position.z],
      type,
      isDisabled,
      team
    });
  });

  const stateColors: Record<AIState, string> = {
    patrol: '#4ade80',
    chase: '#fb923c',
    flank: '#facc15',
    seekCover: '#60a5fa',
    attack: '#f87171',
    guardPlayer: '#22d3ee',
    coordinateAttack: '#e879f9',
    peek: '#a78bfa'
  };

  return (
    <>
      {/* Target Visualizers (World Space) */}
      {groupRef.current && (
        <group>
          <Line
            points={[
              [groupRef.current.position.x, 0.2, groupRef.current.position.z],
              [currentMoveTarget.current.x, 0.2, currentMoveTarget.current.z]
            ]}
            color={stateColors[visualState]}
            lineWidth={visualState === 'flank' ? 5 : 2}
            dashed={visualState === 'flank'}
            dashScale={5}
            dashSize={0.5}
            gapSize={0.2}
            transparent
            opacity={0.4}
            raycast={() => null}
          />
          {/* Flanking Intent Indicator (Arrow) */}
          {visualState === 'flank' && (
            <group 
              position={[groupRef.current.position.x, 0.05, groupRef.current.position.z]}
              rotation={[0, Math.atan2(currentMoveTarget.current.x - groupRef.current.position.x, currentMoveTarget.current.z - groupRef.current.position.z), 0]}
            >
              <mesh position={[0, 0, 2.5]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1.5, 5]} />
                <meshBasicMaterial 
                  color={stateColors.flank} 
                  transparent 
                  opacity={0.15} 
                  depthWrite={false}
                />
              </mesh>
            </group>
          )}
          {/* Guarding Intent Indicator (Shield) */}
          {visualState === 'guardPlayer' && (
            <mesh position={[groupRef.current.position.x, 1, groupRef.current.position.z]}>
              <sphereGeometry args={[1.5, 16, 16]} />
              <meshBasicMaterial color={stateColors.guardPlayer} transparent opacity={0.1} wireframe />
            </mesh>
          )}
          {/* Spectator Highlight */}
          {useGameStore.getState().spectatorTargetId === id && (
            <mesh position={[groupRef.current.position.x, 0.05, groupRef.current.position.z]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.2, 0.05, 16, 32]} />
              <meshBasicMaterial color="#22d3ee" transparent opacity={0.8} />
            </mesh>
          )}
          <mesh position={[currentMoveTarget.current.x, 0.1, currentMoveTarget.current.z]}>
            <sphereGeometry args={[0.2, 8, 8]} />
            <meshBasicMaterial color={stateColors[visualState]} transparent opacity={0.6} />
          </mesh>
        </group>
      )}

      <group ref={groupRef} position={initialPosition}>
        {/* State Visualizer */}
        <Billboard position={[0, 2, 0]}>
          <mesh position={[0, 0, -0.01]}>
            <planeGeometry args={[1.2, 0.3]} />
            <meshBasicMaterial color={stateColors[visualState]} transparent opacity={0.8} />
          </mesh>
          <Text
            fontSize={0.15}
            color="white"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.02}
            outlineColor="#000"
          >
            {visualState.toUpperCase()}
          </Text>
        </Billboard>

        {/* Health Bar */}
      <Billboard position={[0, 1.5, 0]}>
        {/* Background */}
        <mesh>
          <planeGeometry args={[1.2, 0.15]} />
          <meshBasicMaterial color="#000" transparent opacity={0.5} />
        </mesh>
        {/* Foreground (Health) */}
        <mesh position={[-(1 - health / 100) * 0.5, 0, 0.01]}>
          <planeGeometry args={[1 * (health / 100), 0.1]} />
          <meshBasicMaterial color={health > 50 ? "#00ff00" : health > 25 ? "#ffff00" : "#ff0000"} />
        </mesh>
      </Billboard>

      {/* AI Laser Beam */}
      {laserActive && (
        <mesh position={[0, 0.5, 10.5]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.03, 0.03, 20, 8]} />
          <meshBasicMaterial 
            color={type === 'aggressive' ? "#ff0000" : type === 'sniper' ? "#aa00ff" : "#00ff00"} 
            transparent 
            opacity={0.8} 
          />
        </mesh>
      )}

      {/* Hit Confirmation Flash */}
      {hitFlash && (
        <group position={[0, 0.5, 0.6]}>
          <pointLight distance={5} intensity={3} color="#ffffff" />
          <mesh>
            <sphereGeometry args={[0.2, 16, 16]} />
            <meshBasicMaterial color="#ffffff" transparent opacity={0.4} />
          </mesh>
        </group>
      )}

      {/* Callout Billboard */}
      {showCallout && (
        <Billboard position={[0, 2.5, 0]}>
          <Text
            fontSize={0.4}
            color={team === 'A' ? "#4488ff" : "#ff4444"}
            font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKbxmcZVE.woff"
            anchorX="center"
            anchorY="middle"
          >
            {calloutText.current}
          </Text>
        </Billboard>
      )}

      <mesh ref={meshRef} castShadow>
        <boxGeometry args={[1, 2, 1]} />
        <meshStandardMaterial 
          color={isFlashing ? (team === 'A' ? "#88ccff" : "#ffaa88") : isDisabled ? "#333" : team === 'A' ? "#0088ff" : "#ff4400"} 
          emissive={isFlashing ? "#ffffff" : isDisabled ? "#000" : team === 'A' ? "#0088ff" : "#ff4400"}
          emissiveIntensity={isFlashing ? 0.8 : isDisabled ? 0 : 0.2}
        />
        {/* Team Indicator Light */}
        <mesh position={[0, 0.8, 0.51]}>
          <planeGeometry args={[0.6, 0.1]} />
          <meshBasicMaterial color={team === 'A' ? "#00ffff" : "#ff8800"} />
        </mesh>
        {/* Vest Light */}
        <mesh position={[0, 0.5, 0.51]}>
          <planeGeometry args={[0.4, 0.4]} />
          <meshBasicMaterial color={isFlashing ? "#ffffff" : isDisabled ? "#111" : "#ffffff"} />
        </mesh>
      </mesh>
    </group>
  </>
);
}
