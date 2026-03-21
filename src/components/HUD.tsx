import { useGameStore, PowerUpType } from '../hooks/useGameStore';
import { Target, Timer, Trophy, ShieldAlert, Map as MapIcon, Zap, Flame, Shield, Eye, ChevronLeft, ChevronRight, LogOut } from 'lucide-react';
import { ARENA_SIZE, OBSTACLES } from './Arena';

function Minimap() {
  const { playerPos, playerYaw, opponents, spawnedPowerUps } = useGameStore();
  const scale = 3; // pixels per unit
  const size = ARENA_SIZE * scale;

  const getPowerUpColor = (type: PowerUpType) => {
    switch (type) {
      case 'SPEED': return 'bg-cyan-400';
      case 'RAPID_FIRE': return 'bg-purple-400';
      case 'SHIELD': return 'bg-yellow-400';
      default: return 'bg-white';
    }
  };

  return (
    <div className="relative bg-black/40 border border-cyan-500/30 rounded-lg overflow-hidden backdrop-blur-sm" style={{ width: size, height: size }}>
      {/* Obstacles */}
      {OBSTACLES.map((obs, i) => (
        <div
          key={i}
          className="absolute bg-cyan-900/40 border border-cyan-500/20"
          style={{
            left: (obs.pos[0] + ARENA_SIZE / 2 - obs.size[0] / 2) * scale,
            top: (obs.pos[2] + ARENA_SIZE / 2 - obs.size[2] / 2) * scale,
            width: obs.size[0] * scale,
            height: obs.size[2] * scale,
          }}
        />
      ))}

      {/* Opponents */}
      {Object.values(opponents).map((opp) => (
        <div
          key={opp.id}
          className={`absolute w-2 h-2 rounded-full transition-all duration-100 ${
            opp.isDisabled ? 'bg-gray-500' : 
            opp.team === 'A' ? 'bg-blue-500 shadow-[0_0_5px_rgba(59,130,246,0.8)]' : 
            'bg-red-500 shadow-[0_0_5px_rgba(239,68,68,0.8)]'
          } ${useGameStore.getState().spectatorTargetId === opp.id ? 'ring-2 ring-white ring-offset-1 ring-offset-black animate-pulse scale-125 z-20' : ''}`}
          style={{
            left: (opp.pos[0] + ARENA_SIZE / 2) * scale - 4,
            top: (opp.pos[2] + ARENA_SIZE / 2) * scale - 4,
          }}
        />
      ))}

      {/* Power-ups */}
      {spawnedPowerUps.map((p) => (
        <div
          key={p.id}
          className={`absolute w-1.5 h-1.5 rounded-full animate-pulse ${getPowerUpColor(p.type)}`}
          style={{
            left: (p.pos[0] + ARENA_SIZE / 2) * scale - 3,
            top: (p.pos[2] + ARENA_SIZE / 2) * scale - 3,
          }}
        />
      ))}

      {/* Player */}
      <div
        className={`absolute w-3 h-3 bg-white rounded-full shadow-[0_0_10px_white] z-10 flex items-center justify-center ${
          useGameStore.getState().spectatorTargetId === 'player' ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-black animate-pulse' : ''
        }`}
        style={{
          left: (playerPos[0] + ARENA_SIZE / 2) * scale - 6,
          top: (playerPos[2] + ARENA_SIZE / 2) * scale - 6,
          transform: `rotate(${playerYaw}rad)`
        }}
      >
        <div className="w-1 h-3 bg-cyan-400 rounded-full -translate-y-1" />
      </div>
    </div>
  );
}

export function HUD() {
  const { 
    score, 
    timeLeft, 
    isPlayerDisabled, 
    gameStarted, 
    startGame, 
    resetGame, 
    hitMarkerActive, 
    activePowerUps,
    isSpectating,
    spectatorTargetId,
    setSpectating,
    cycleSpectatorTarget,
    opponents,
    teamAScore,
    teamBScore
  } = useGameStore();

  if (!gameStarted) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-50">
        <div className="text-center p-8 border-2 border-cyan-500 rounded-2xl bg-black/50 backdrop-blur-md">
          <h1 className="text-6xl font-black text-cyan-400 mb-4 tracking-tighter uppercase">Neon Strike</h1>
          <p className="text-cyan-200/60 mb-8 font-mono">LASER TAG ARENA v1.0</p>
          <div className="space-y-4 mb-8 text-left max-w-md mx-auto">
            <div className="flex items-center gap-3 text-cyan-100">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">W</div>
              <span>Move Forward</span>
            </div>
            <div className="flex items-center gap-3 text-cyan-100">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">S</div>
              <span>Move Backward</span>
            </div>
            <div className="flex items-center gap-3 text-cyan-100">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">A/D</div>
              <span>Strafe Left/Right</span>
            </div>
            <div className="flex items-center gap-3 text-cyan-100">
              <div className="w-8 h-8 rounded-full bg-cyan-500/20 flex items-center justify-center border border-cyan-500/50">Click</div>
              <span>Fire Laser</span>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <button 
              onClick={startGame}
              className="px-12 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 uppercase tracking-widest"
            >
              Enter Arena
            </button>
            <button 
              onClick={() => setSpectating(true)}
              className="px-12 py-4 border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 uppercase tracking-widest flex items-center justify-center gap-2"
            >
              <Eye size={20} />
              Spectate Arena
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (timeLeft === 0) {
    const winningTeam = teamAScore > teamBScore ? 'TEAM A' : teamBScore > teamAScore ? 'TEAM B' : 'DRAW';
    const winColor = winningTeam === 'TEAM A' ? 'text-blue-400' : winningTeam === 'TEAM B' ? 'text-red-400' : 'text-cyan-400';

    return (
      <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-50">
        <div className="text-center p-12 border-2 border-cyan-500 rounded-3xl bg-black/50 backdrop-blur-xl">
          <h2 className="text-5xl font-black text-cyan-400 mb-2 uppercase tracking-tighter">Match Over</h2>
          <p className="text-cyan-500/60 font-mono mb-4">FINAL SCORE REPORT</p>
          
          <div className={`text-6xl font-black mb-8 uppercase italic tracking-widest ${winColor}`}>
            {winningTeam === 'DRAW' ? 'MATCH DRAW' : `${winningTeam} WINS`}
          </div>

          <div className="grid grid-cols-2 gap-8 mb-12">
            <div className="p-6 border border-blue-500/30 bg-blue-500/5 rounded-2xl">
              <div className="text-xs text-blue-400 font-bold uppercase tracking-widest mb-1">Team A</div>
              <div className="text-4xl font-black text-white font-mono">{teamAScore.toLocaleString()}</div>
            </div>
            <div className="p-6 border border-red-500/30 bg-red-500/5 rounded-2xl">
              <div className="text-xs text-red-400 font-bold uppercase tracking-widest mb-1">Team B</div>
              <div className="text-4xl font-black text-white font-mono">{teamBScore.toLocaleString()}</div>
            </div>
          </div>

          <div className="text-sm text-cyan-500/40 uppercase tracking-widest mb-2 font-bold">Your Individual Contribution</div>
          <div className="text-4xl font-black text-white mb-12 font-mono tabular-nums tracking-tighter">
            {score.toLocaleString()}
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button 
              onClick={startGame}
              className="px-12 py-4 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 uppercase tracking-widest"
            >
              Play Again
            </button>
            <button 
              onClick={resetGame}
              className="px-12 py-4 border-2 border-cyan-500 text-cyan-500 hover:bg-cyan-500/10 font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 uppercase tracking-widest"
            >
              Main Menu
            </button>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="absolute inset-0 pointer-events-none select-none">
      {/* Spectator UI */}
      {isSpectating && (
        <>
          {/* Scanning Line Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden animate-[flicker_0.1s_infinite]">
            <div className="absolute inset-0 bg-cyan-500/5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, rgba(6, 182, 212, 0.1) 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none" />
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'url("https://grainy-gradients.vercel.app/noise.svg")' }} />
            <div className="absolute inset-0 pointer-events-none opacity-[0.05]" style={{ backgroundImage: 'linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 255, 0, 0.06))', backgroundSize: '100% 2px, 3px 100%' }} />
            <div className="w-full h-[2px] bg-cyan-500/10 absolute top-0 left-0 animate-[scan_4s_linear_infinite]" />
            
            {/* Corner Brackets */}
            <div className="absolute top-8 left-8 w-12 h-12 border-t-2 border-l-2 border-cyan-500/30" />
            <div className="absolute top-8 right-8 w-12 h-12 border-t-2 border-r-2 border-cyan-500/30" />
            <div className="absolute bottom-8 left-8 w-12 h-12 border-b-2 border-l-2 border-cyan-500/30" />
            <div className="absolute bottom-8 right-8 w-12 h-12 border-b-2 border-r-2 border-cyan-500/30" />
            
            {/* Center Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 pointer-events-none opacity-20">
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-cyan-500" />
              <div className="absolute top-0 left-1/2 w-[1px] h-full bg-cyan-500" />
            </div>

            {/* Compass */}
            <div className="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-8 text-[10px] font-mono text-cyan-500/40 tracking-[0.5em]">
              <span>W</span>
              <span className="text-cyan-500/80 font-bold">N</span>
              <span>E</span>
            </div>

            {/* Status Indicator */}
            <div className="absolute top-8 left-12 flex flex-col gap-1">
              <div className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-widest">Systems: Online</div>
              <div className="text-[8px] font-mono text-cyan-500/60 uppercase tracking-widest">Link: Stable</div>
            </div>

            {/* Signal Strength */}
            <div className="absolute top-8 right-12 flex items-end gap-1">
              <div className="w-1 h-2 bg-cyan-500/80" />
              <div className="w-1 h-3 bg-cyan-500/80" />
              <div className="w-1 h-4 bg-cyan-500/80" />
              <div className="w-1 h-5 bg-cyan-500/30" />
              <span className="text-[8px] font-mono text-cyan-500/60 ml-2 uppercase">Signal</span>
            </div>

            {/* Telemetry */}
            <div className="absolute bottom-8 left-12 flex flex-col gap-1 text-[8px] font-mono text-cyan-500/40 uppercase">
              <div>LAT: 34.0522 N</div>
              <div>LNG: 118.2437 W</div>
              <div>ALT: 452m</div>
            </div>

            {/* System Log */}
            <div className="absolute bottom-8 right-12 flex flex-col gap-1 text-[8px] font-mono text-cyan-500/40 uppercase text-right">
              <div>Initializing...</div>
              <div>Link Established</div>
              <div>Data Stream Active</div>
            </div>
          </div>
          
          {/* Transition Overlay */}
          <div key={`transition-${spectatorTargetId}`} className="absolute inset-0 bg-white/10 pointer-events-none animate-out fade-out duration-300 backdrop-invert-[0.1]" />
          
          <div className="absolute bottom-32 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 pointer-events-auto">
          <div className="bg-black/80 backdrop-blur-xl border border-cyan-500/50 p-6 rounded-2xl flex items-center gap-8 shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <button 
              onClick={() => cycleSpectatorTarget(-1)}
              className="p-3 hover:bg-white/10 rounded-full transition-colors text-cyan-400"
            >
              <ChevronLeft size={32} />
            </button>
            
            <div key={spectatorTargetId} className="text-center min-w-[200px] animate-in fade-in zoom-in duration-300">
              <div className="flex items-center justify-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                <div className="text-[10px] uppercase tracking-[0.3em] text-cyan-500/60 font-bold">Live Feed: CAM-{spectatorTargetId === 'player' ? '00' : (spectatorTargetId.split('-')[1] || '01').padStart(2, '0')}</div>
                <div className="ml-4 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <div className="text-[8px] font-bold text-red-500">REC</div>
                </div>
                <div className="ml-4 text-[8px] font-mono text-cyan-500/40">{new Date().toLocaleTimeString()}</div>
              </div>
              <div className="text-2xl font-black text-white uppercase tracking-tight">
                {spectatorTargetId === 'player' ? 'Human Player' : `Unit ${spectatorTargetId.split('-')[1] || spectatorTargetId}`}
              </div>
              <div className="flex items-center justify-center gap-4 mt-1">
                <div className="flex items-center gap-1">
                  <div className={`w-[2px] h-2 ${Math.random() > 0.1 ? 'bg-cyan-500' : 'bg-cyan-500/30'}`} />
                  <div className={`w-[2px] h-3 ${Math.random() > 0.2 ? 'bg-cyan-500' : 'bg-cyan-500/30'}`} />
                  <div className={`w-[2px] h-4 ${Math.random() > 0.3 ? 'bg-cyan-500' : 'bg-cyan-500/30'}`} />
                  <div className={`w-[2px] h-5 ${Math.random() > 0.4 ? 'bg-cyan-500' : 'bg-cyan-500/30'}`} />
                </div>
                <div className={`text-[10px] font-mono ${
                  (spectatorTargetId === 'player' || (opponents[spectatorTargetId] && opponents[spectatorTargetId].team === 'A')) 
                  ? 'text-blue-400' : 'text-red-400'
                }`}>
                  TEAM {(spectatorTargetId === 'player' || (opponents[spectatorTargetId] && opponents[spectatorTargetId].team === 'A')) ? 'A' : 'B'}
                </div>
                {spectatorTargetId !== 'player' && opponents[spectatorTargetId] && (
                  <>
                    <div className="w-1 h-1 rounded-full bg-white/20" />
                    <div className="text-[10px] font-mono text-cyan-200/60 uppercase tracking-widest">
                      {opponents[spectatorTargetId].type}
                    </div>
                  </>
                )}
              </div>
            </div>

            <button 
              onClick={() => cycleSpectatorTarget(1)}
              className="p-3 hover:bg-white/10 rounded-full transition-colors text-cyan-400"
            >
              <ChevronRight size={32} />
            </button>
          </div>

            <button 
              onClick={() => setSpectating(false)}
              className="flex items-center gap-2 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-500 rounded-full text-xs font-bold uppercase tracking-widest transition-all"
            >
              <LogOut size={14} />
              Exit Spectator Mode
            </button>
          </div>
        </>
      )}

      {/* Power-ups Display */}
      <div className="absolute top-32 left-8 flex flex-col gap-2">
        {Object.entries(activePowerUps).map(([type, time]) => {
          if (!time || time <= 0) return null;
          const config = {
            SPEED: { icon: Zap, color: 'text-cyan-400', label: 'Speed Boost' },
            RAPID_FIRE: { icon: Flame, color: 'text-purple-400', label: 'Rapid Fire' },
            SHIELD: { icon: Shield, color: 'text-yellow-400', label: 'Shield' },
          }[type as PowerUpType];

          return (
            <div key={type} className="flex items-center gap-3 bg-black/50 backdrop-blur-md border border-white/10 p-2 pr-4 rounded-lg animate-in slide-in-from-left duration-300">
              <div className={`p-2 rounded-md bg-white/5 ${config.color}`}>
                <config.icon size={16} />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest font-bold text-white/80">{config.label}</div>
                <div className="h-1 w-24 bg-white/10 rounded-full mt-1 overflow-hidden">
                  <div 
                    className={`h-full bg-current transition-all duration-1000 ${config.color}`}
                    style={{ width: `${(time / 15) * 100}%` }}
                  />
                </div>
              </div>
              <div className="ml-2 text-xs font-mono font-bold text-white/60">{time}s</div>
            </div>
          );
        })}
      </div>

      {/* Crosshair */}
      {!isSpectating && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 border-2 border-cyan-400/50 rounded-full flex items-center justify-center">
          <div className="w-1 h-1 bg-cyan-400 rounded-full" />
          
          {/* Hit Marker */}
          {hitMarkerActive && (
            <div className="absolute inset-0 flex items-center justify-center scale-150">
              <div className="absolute w-6 h-[2px] bg-white rotate-45 rounded-full shadow-[0_0_10px_#fff]" />
              <div className="absolute w-6 h-[2px] bg-white -rotate-45 rounded-full shadow-[0_0_10px_#fff]" />
            </div>
          )}
        </div>
      )}

      {/* Top Stats */}
      {!isSpectating && (
        <div className="absolute top-8 left-8 right-8 flex justify-between items-start">
          <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl">
            <Trophy className="text-cyan-400 w-6 h-6" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-500/60 font-bold">Your Score</div>
              <div className="text-2xl font-black text-white font-mono">{score.toLocaleString()}</div>
            </div>
          </div>

          {/* Team Scoreboard */}
          <div className="flex items-center gap-2 bg-black/60 backdrop-blur-xl border border-white/10 p-2 px-6 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div className="text-center px-4">
              <div className={`text-[8px] uppercase tracking-[0.2em] font-bold mb-1 ${teamAScore >= teamBScore ? 'text-blue-400' : 'text-blue-400/40'}`}>Team A</div>
              <div className={`text-2xl font-black font-mono ${teamAScore >= teamBScore ? 'text-white' : 'text-white/40'}`}>{teamAScore}</div>
            </div>
            <div className="w-[1px] h-8 bg-white/10" />
            <div className="text-center px-4">
              <div className={`text-[8px] uppercase tracking-[0.2em] font-bold mb-1 ${teamBScore >= teamAScore ? 'text-red-400' : 'text-red-400/40'}`}>Team B</div>
              <div className={`text-2xl font-black font-mono ${teamBScore >= teamAScore ? 'text-white' : 'text-white/40'}`}>{teamBScore}</div>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-black/50 backdrop-blur-md border border-cyan-500/30 p-4 rounded-xl">
            <Timer className="text-cyan-400 w-6 h-6" />
            <div>
              <div className="text-[10px] uppercase tracking-widest text-cyan-500/60 font-bold">Time</div>
              <div className="text-2xl font-black text-white font-mono">{formatTime(timeLeft)}</div>
            </div>
          </div>
        </div>
      )}

      {/* Disabled Overlay */}
      {isPlayerDisabled && (
        <div className="absolute inset-0 bg-red-500/20 backdrop-blur-[2px] flex items-center justify-center animate-pulse">
          <div className="text-center">
            <ShieldAlert className="w-24 h-24 text-red-500 mx-auto mb-4" />
            <h2 className="text-4xl font-black text-red-500 uppercase tracking-tighter italic">VEST DISABLED</h2>
            <p className="text-red-200 font-mono mt-2">REBOOTING SYSTEMS...</p>
          </div>
        </div>
      )}

      {/* Bottom Info */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center opacity-50">
        <p className="text-cyan-400/60 text-[10px] uppercase tracking-[0.3em] font-bold">
          Press ESC to release mouse
        </p>
      </div>

      {/* Minimap */}
      <div className="absolute bottom-8 right-8">
        <div className="flex items-center gap-2 mb-2 text-cyan-500/60">
          <MapIcon size={12} />
          <span className="text-[10px] uppercase tracking-widest font-bold">Tactical Map</span>
        </div>
        <Minimap />
      </div>
    </div>
  );
}
