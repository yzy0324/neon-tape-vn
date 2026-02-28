export class BgmSynth {
  constructor() {
    this.ctx = null;
    this.timer = null;
    this.on = false;
  }

  tone(freq, time, len, type='sawtooth', gain=0.02) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    g.gain.value = gain;
    o.connect(g).connect(this.ctx.destination);
    o.start(time);
    o.stop(time + len);
  }

  playLoop() {
    const now = this.ctx.currentTime;
    const bass = [110, 98, 82, 73];
    const lead = [220, 247, 196, 165, 220, 247, 277, 247];
    bass.forEach((f, i) => this.tone(f, now + i * 0.5, 0.45, 'square', 0.018));
    lead.forEach((f, i) => this.tone(f, now + i * 0.25, 0.18, 'triangle', 0.012));
  }

  async start() {
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    this.playLoop();
    this.timer = setInterval(() => this.playLoop(), 2000);
    this.on = true;
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.on = false;
  }
}
