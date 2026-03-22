import { create } from 'zustand';
import { soundManager } from '../services/soundService';

export type PowerUpType = 'SPEED' | 'RAPID_FIRE' | 'SHIELD';

interface PowerUpData {
  id: string;
  type: PowerUpType;
  pos: [number, number, number];
}

interface OpponentData {
  id: string;
  pos: [number, number, number];
  type: string;
  isDisabled: boolean;
  team: 'A' | 'B';
}

interface GameState {
  score: number;
  hitsReceived: number;
  isPlayerDisabled: boolean;
  gameStarted: boolean;
  timeLeft: number;
  respawnRequested: number;
  hitMarkerActive: boolean;
  playerPos: [number, number, number];
  playerYaw: number;
  playerTeam: 'A' | 'B';
  teamAScore: number;
  teamBScore: number;
  opponents: Record<string, OpponentData>;
  spawnedPowerUps: PowerUpData[];
  activePowerUps: Partial<Record<PowerUpType, number>>;
  isSpectating: boolean;
  spectatorTargetId: string | 'player';
  tacticalData: {
    lastSpottedPlayerPos: [number, number, number] | null;
    lastSpottedTime: number;
    activeManeuvers: Record<string, string>; // unitId -> maneuverType
  };
  incrementScore: () => void;
  incrementTeamScore: (team: 'A' | 'B') => void;
  playerHit: () => void;
  setPlayerDisabled: (disabled: boolean) => void;
  startGame: () => void;
  resetGame: () => void;
  setSpectating: (spectating: boolean) => void;
  setSpectatorTarget: (id: string | 'player') => void;
  cycleSpectatorTarget: (direction: 1 | -1) => void;
  tick: () => void;
  triggerHitMarker: () => void;
  updatePlayerTransform: (pos: [number, number, number], yaw: number) => void;
  updateOpponent: (id: string, data: OpponentData) => void;
  updateTacticalData: (data: Partial<GameState['tacticalData']>) => void;
  spawnPowerUp: (type: PowerUpType, pos: [number, number, number]) => void;
  collectPowerUp: (id: string) => void;
}

export const useGameStore = create<GameState>((set) => ({
  score: 0,
  hitsReceived: 0,
  isPlayerDisabled: false,
  gameStarted: false,
  timeLeft: 120, // 2 minutes
  respawnRequested: 0,
  hitMarkerActive: false,
  playerPos: [0, 0, 0],
  playerYaw: 0,
  playerTeam: 'A',
  teamAScore: 0,
  teamBScore: 0,
  opponents: {},
  spawnedPowerUps: [],
  activePowerUps: {},
  isSpectating: false,
  spectatorTargetId: 'player',
  tacticalData: {
    lastSpottedPlayerPos: null,
    lastSpottedTime: 0,
    activeManeuvers: {},
  },
  incrementScore: () => set((state) => ({ 
    score: state.score + 100,
    teamAScore: state.teamAScore + 100
  })),
  incrementTeamScore: (team) => set((state) => ({
    teamAScore: team === 'A' ? state.teamAScore + 100 : state.teamAScore,
    teamBScore: team === 'B' ? state.teamBScore + 100 : state.teamBScore
  })),
  playerHit: () => {
    const state = useGameStore.getState();
    if (state.isPlayerDisabled) return;

    if (state.activePowerUps.SHIELD && state.activePowerUps.SHIELD > 0) {
      soundManager.play('SHIELD_HIT', 0.6);
      return;
    }

    set((state) => ({ 
      hitsReceived: state.hitsReceived + 1,
      isPlayerDisabled: true,
      teamBScore: state.teamBScore + 100 // Enemy team gets score for hitting player
    }));
    
    soundManager.play('HIT_PLAYER', 0.8);

    // Automatically re-enable after 3 seconds
    setTimeout(() => {
      set((state) => ({ 
        isPlayerDisabled: false,
        respawnRequested: state.respawnRequested + 1
      }));
    }, 3000);
  },
  setPlayerDisabled: (disabled: boolean) => set({ isPlayerDisabled: disabled }),
  startGame: () => set({ 
    gameStarted: true, 
    score: 0, 
    hitsReceived: 0, 
    teamAScore: 0,
    teamBScore: 0,
    timeLeft: 120, 
    isPlayerDisabled: false, 
    respawnRequested: 0, 
    hitMarkerActive: false, 
    opponents: {},
    spawnedPowerUps: [],
    activePowerUps: {},
    isSpectating: false
  }),
  resetGame: () => set({ 
    gameStarted: false, 
    score: 0, 
    hitsReceived: 0, 
    teamAScore: 0,
    teamBScore: 0,
    timeLeft: 120, 
    isPlayerDisabled: false, 
    respawnRequested: 0, 
    hitMarkerActive: false, 
    opponents: {},
    spawnedPowerUps: [],
    activePowerUps: {},
    isSpectating: false
  }),
  setSpectating: (spectating) => set({ isSpectating: spectating, gameStarted: spectating ? true : false }),
  setSpectatorTarget: (id) => set({ spectatorTargetId: id }),
  cycleSpectatorTarget: (direction) => set((state) => {
    soundManager.play('UI_CLICK', 0.4);
    const ids = ['player', ...Object.keys(state.opponents)];
    const currentIndex = ids.indexOf(state.spectatorTargetId);
    let nextIndex = (currentIndex + direction) % ids.length;
    if (nextIndex < 0) nextIndex = ids.length - 1;
    return { spectatorTargetId: ids[nextIndex] };
  }),
  tick: () => set((state) => {
    const newActivePowerUps = { ...state.activePowerUps };
    let changed = false;
    (Object.keys(newActivePowerUps) as PowerUpType[]).forEach((type) => {
      if (newActivePowerUps[type]! > 0) {
        newActivePowerUps[type]! -= 1;
        changed = true;
      }
    });

    return { 
      timeLeft: Math.max(0, state.timeLeft - 1),
      activePowerUps: changed ? newActivePowerUps : state.activePowerUps
    };
  }),
  triggerHitMarker: () => {
    set({ hitMarkerActive: true });
    setTimeout(() => set({ hitMarkerActive: false }), 150);
  },
  updatePlayerTransform: (pos, yaw) => set({ playerPos: pos, playerYaw: yaw }),
  updateOpponent: (id, data) => set((state) => ({
    opponents: { ...state.opponents, [id]: data }
  })),
  updateTacticalData: (data: Partial<GameState['tacticalData']>) => set((state) => ({
    tacticalData: { ...state.tacticalData, ...data }
  })),
  spawnPowerUp: (type, pos) => set((state) => ({
    spawnedPowerUps: [...state.spawnedPowerUps, { id: Math.random().toString(36).substr(2, 9), type, pos }]
  })),
  collectPowerUp: (id) => set((state) => {
    const powerUp = state.spawnedPowerUps.find(p => p.id === id);
    if (!powerUp) return state;

    soundManager.play('POWERUP_COLLECT', 0.8);

    const newActivePowerUps = { ...state.activePowerUps };
    newActivePowerUps[powerUp.type] = 15; // 15 seconds duration

    return {
      spawnedPowerUps: state.spawnedPowerUps.filter(p => p.id !== id),
      activePowerUps: newActivePowerUps
    };
  }),
}));
