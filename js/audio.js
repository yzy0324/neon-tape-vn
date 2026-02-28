const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

const AMBIENCE_PRESETS = {
  bar: { rain: 0.24, rumble: 0.2, neon: 0.28 },
  corp: { rain: 0.08, rumble: 0.3, neon: 0.26 },
  alley: { rain: 0.36, rumble: 0.16, neon: 0.2 },
  street: { rain: 0.32, rumble: 0.22, neon: 0.16 },
  backroom: { rain: 0.06, rumble: 0.28, neon: 0.34 },
  dawn: { rain: 0.14, rumble: 0.1, neon: 0.12 },
  default: { rain: 0.2, rumble: 0.2, neon: 0.2 }
};

export class BgmSynth {
  constructor() {
    this.ctx = null;
    this.main = null;
    this.master = null;
    this.trackGains = {};
    this.musicTimer = null;
    this.on = false;
    this.unlocked = false;

    this.settings = {
      master: 0.72,
      music: { enabled: true, volume: 0.55 },
      ambience: { enabled: true, volume: 0.48 },
      sfx: { enabled: true, volume: 0.65 }
    };

    this.ambienceNodes = null;
    this.activeAmbience = null;
  }

  ensureCtx() {
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (this.main) return;

    this.main = this.ctx.createGain();
    this.main.gain.value = 0.001;
    this.master = this.ctx.createGain();

    this.trackGains.music = this.ctx.createGain();
    this.trackGains.ambience = this.ctx.createGain();
    this.trackGains.sfx = this.ctx.createGain();

    this.trackGains.music.connect(this.main);
    this.trackGains.ambience.connect(this.main);
    this.trackGains.sfx.connect(this.main);

    this.main.connect(this.master);
    this.master.connect(this.ctx.destination);
    this.applyVolumes();
  }

  async unlock() {
    this.ensureCtx();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.unlocked = this.ctx.state === 'running';
    if (this.unlocked && this.on) this.main.gain.setTargetAtTime(1, this.ctx.currentTime, 0.2);
    return this.unlocked;
  }

  applySettings(next = {}) {
    this.settings = {
      master: clamp(next.master ?? this.settings.master),
      music: {
        enabled: typeof next.music?.enabled === 'boolean' ? next.music.enabled : this.settings.music.enabled,
        volume: clamp(next.music?.volume ?? this.settings.music.volume)
      },
      ambience: {
        enabled: typeof next.ambience?.enabled === 'boolean' ? next.ambience.enabled : this.settings.ambience.enabled,
        volume: clamp(next.ambience?.volume ?? this.settings.ambience.volume)
      },
      sfx: {
        enabled: typeof next.sfx?.enabled === 'boolean' ? next.sfx.enabled : this.settings.sfx.enabled,
        volume: clamp(next.sfx?.volume ?? this.settings.sfx.volume)
      }
    };
    this.applyVolumes();
  }

  getSettings() {
    return JSON.parse(JSON.stringify(this.settings));
  }

  applyVolumes() {
    if (!this.master) return;
    const now = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.settings.master, now, 0.02);
    this.trackGains.music.gain.setTargetAtTime(this.settings.music.enabled ? 1 : 0.0001, now, 0.03);
    this.trackGains.ambience.gain.setTargetAtTime(this.settings.ambience.enabled ? 1 : 0.0001, now, 0.03);
    this.trackGains.sfx.gain.setTargetAtTime(this.settings.sfx.enabled ? 1 : 0.0001, now, 0.01);
  }

  tone(freq, time, len, type = 'sawtooth', gain = 0.02, track = 'music') {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.0001, time);
    g.gain.linearRampToValueAtTime(gain, time + 0.02);
    g.gain.linearRampToValueAtTime(0.0001, time + len);
    o.connect(g).connect(this.trackGains[track]);
    o.start(time);
    o.stop(time + len + 0.02);
  }

  playMusicLoop() {
    if (!this.on || !this.unlocked || !this.settings.music.enabled) return;
    const now = this.ctx.currentTime;
    const bass = [110, 98, 82, 73];
    const lead = [220, 247, 196, 165, 220, 247, 277, 247];
    bass.forEach((f, i) => this.tone(f, now + i * 0.5, 0.45, 'square', 0.012 * this.settings.music.volume, 'music'));
    lead.forEach((f, i) => this.tone(f, now + i * 0.25, 0.18, 'triangle', 0.009 * this.settings.music.volume, 'music'));
  }

  ensureAmbienceNodes() {
    if (this.ambienceNodes) return;
    const rainSource = this.ctx.createBufferSource();
    const rainBuffer = this.ctx.createBuffer(1, this.ctx.sampleRate * 2, this.ctx.sampleRate);
    const channel = rainBuffer.getChannelData(0);
    for (let i = 0; i < channel.length; i += 1) channel[i] = (Math.random() * 2 - 1) * 0.35;
    rainSource.buffer = rainBuffer;
    rainSource.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1800;
    rainFilter.Q.value = 0.6;
    const rainGain = this.ctx.createGain();
    rainGain.gain.value = 0.0001;
    rainSource.connect(rainFilter).connect(rainGain).connect(this.trackGains.ambience);

    const rumbleOsc = this.ctx.createOscillator();
    rumbleOsc.type = 'triangle';
    rumbleOsc.frequency.value = 44;
    const rumbleFilter = this.ctx.createBiquadFilter();
    rumbleFilter.type = 'lowpass';
    rumbleFilter.frequency.value = 140;
    const rumbleGain = this.ctx.createGain();
    rumbleGain.gain.value = 0.0001;
    rumbleOsc.connect(rumbleFilter).connect(rumbleGain).connect(this.trackGains.ambience);

    const neonOsc = this.ctx.createOscillator();
    neonOsc.type = 'sawtooth';
    const neonGain = this.ctx.createGain();
    neonGain.gain.value = 0.0001;
    const neonLfo = this.ctx.createOscillator();
    const neonLfoGain = this.ctx.createGain();
    neonOsc.frequency.value = 132;
    neonLfo.frequency.value = 0.25;
    neonLfoGain.gain.value = 16;
    neonLfo.connect(neonLfoGain).connect(neonOsc.frequency);
    neonOsc.connect(neonGain).connect(this.trackGains.ambience);

    rainSource.start();
    rumbleOsc.start();
    neonOsc.start();
    neonLfo.start();

    this.ambienceNodes = { rainGain, rumbleGain, neonGain };
  }

  setAmbienceForScene(scene = {}) {
    if (!this.ctx || !this.ambienceNodes) return;
    const key = scene.location || scene.bg || 'default';
    const preset = AMBIENCE_PRESETS[key] || AMBIENCE_PRESETS.default;
    this.activeAmbience = key;
    const t = this.ctx.currentTime;
    const fade = 0.85;
    this.ambienceNodes.rainGain.gain.cancelScheduledValues(t);
    this.ambienceNodes.rainGain.gain.setTargetAtTime(preset.rain * this.settings.ambience.volume, t, fade / 3);
    this.ambienceNodes.rumbleGain.gain.cancelScheduledValues(t);
    this.ambienceNodes.rumbleGain.gain.setTargetAtTime(preset.rumble * this.settings.ambience.volume, t, fade / 3);
    this.ambienceNodes.neonGain.gain.cancelScheduledValues(t);
    this.ambienceNodes.neonGain.gain.setTargetAtTime(preset.neon * this.settings.ambience.volume, t, fade / 3);
  }

  playSfx(type = 'click') {
    if (!this.ctx || !this.on || !this.unlocked || !this.settings.sfx.enabled) return;
    const now = this.ctx.currentTime;
    if (type === 'click') {
      this.tone(620, now, 0.06, 'square', 0.02 * this.settings.sfx.volume, 'sfx');
      this.tone(380, now + 0.03, 0.05, 'triangle', 0.015 * this.settings.sfx.volume, 'sfx');
      return;
    }
    if (type === 'confirm') {
      this.tone(420, now, 0.07, 'triangle', 0.018 * this.settings.sfx.volume, 'sfx');
      this.tone(690, now + 0.05, 0.12, 'sine', 0.016 * this.settings.sfx.volume, 'sfx');
      return;
    }
    if (type === 'save') {
      this.tone(780, now, 0.05, 'square', 0.02 * this.settings.sfx.volume, 'sfx');
      this.tone(980, now + 0.04, 0.08, 'triangle', 0.018 * this.settings.sfx.volume, 'sfx');
      return;
    }
    if (type === 'clue') {
      this.tone(260, now, 0.08, 'sawtooth', 0.018 * this.settings.sfx.volume, 'sfx');
      this.tone(520, now + 0.04, 0.1, 'triangle', 0.018 * this.settings.sfx.volume, 'sfx');
      this.tone(860, now + 0.08, 0.12, 'sine', 0.014 * this.settings.sfx.volume, 'sfx');
    }
  }

  async start() {
    this.ensureCtx();
    await this.unlock();
    if (!this.unlocked) return false;
    if (this.on) return true;
    this.on = true;
    this.ensureAmbienceNodes();
    this.main.gain.setTargetAtTime(1, this.ctx.currentTime, 0.2);
    this.playMusicLoop();
    this.musicTimer = setInterval(() => this.playMusicLoop(), 2000);
    return true;
  }

  stop() {
    if (!this.on || !this.ctx) return;
    clearInterval(this.musicTimer);
    this.musicTimer = null;
    this.main.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.2);
    this.on = false;
  }
}
