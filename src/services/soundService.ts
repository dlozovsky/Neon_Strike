const SOUNDS = {
  PLAYER_LASER: 'https://cdn.freesound.org/previews/151/151022_2511477-lq.mp3',
  AI_LASER: 'https://cdn.freesound.org/previews/151/151023_2511477-lq.mp3',
  HIT_AI: 'https://cdn.freesound.org/previews/442/442127_8366916-lq.mp3',
  HIT_PLAYER: 'https://cdn.freesound.org/previews/442/442128_8366916-lq.mp3',
  FOOTSTEPS: 'https://cdn.freesound.org/previews/209/209578_3850731-lq.mp3',
  GAME_OVER: 'https://cdn.freesound.org/previews/442/442129_8366916-lq.mp3',
  SHIELD_HIT: 'https://cdn.freesound.org/previews/442/442130_8366916-lq.mp3',
  POWERUP_COLLECT: 'https://cdn.freesound.org/previews/442/442131_8366916-lq.mp3',
  UI_CLICK: 'https://cdn.freesound.org/previews/442/442132_8366916-lq.mp3',
};

class SoundManager {
  private audios: Map<string, HTMLAudioElement> = new Map();

  constructor() {
    Object.entries(SOUNDS).forEach(([key, url]) => {
      const audio = new Audio(url);
      audio.preload = 'auto';
      this.audios.set(key, audio);
    });
  }

  play(name: keyof typeof SOUNDS, volume = 0.5, loop = false) {
    const audio = this.audios.get(name);
    if (audio) {
      const clone = audio.cloneNode() as HTMLAudioElement;
      clone.volume = volume;
      clone.loop = loop;
      clone.play().catch(() => {
        // Ignore errors if user hasn't interacted with the page yet
      });
      return clone;
    }
    return null;
  }
}

export const soundManager = new SoundManager();
