// src/audio/AudioEngine.js
export class AudioEngine {
  constructor(){
    this.ctx = null;
    this.master = null;

    // drum loop state
    this._on = false;
    this._bpm = 120;
    this._nextTick = 0;
    this._timer = null;

    this._lookaheadMs = 25;
    this._scheduleAhead = 0.12;
    this._tickCount = 0;
  }

  ensure(){
    if (this.ctx) return;
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.3;
    this.master.connect(this.ctx.destination);
  }

  now(){
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // --- REALISTIC PIANO SYNTHESIS ---
  playPianoNote(midiNote, duration = 0.3) {
    this.ensure();
    const t0 = this.ctx.currentTime;
    const freq = 440 * Math.pow(2, (midiNote - 69) / 12);

    // Piano harmonics - gerçek piyano gibi overtone'lar
    const harmonics = [
      { mult: 1.0, gain: 0.5 },   // fundamental
      { mult: 2.0, gain: 0.3 },   // 2nd harmonic
      { mult: 3.0, gain: 0.18 },  // 3rd harmonic
      { mult: 4.0, gain: 0.12 },  // 4th harmonic
      { mult: 5.0, gain: 0.08 },  // 5th harmonic
      { mult: 6.0, gain: 0.05 }   // 6th harmonic
    ];

    const masterGain = this.ctx.createGain();

    // Her harmonik için oscillator
    harmonics.forEach(h => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq * h.mult, t0);

      // ADSR envelope - piano benzeri
      const attack = 0.005;  // Çok hızlı attack
      const decay = 0.15;    // Orta decay
      const sustain = h.gain * 0.5;
      const release = Math.min(0.4, duration * 0.6);

      gain.gain.setValueAtTime(0.0001, t0);
      // Attack - ani yükseliş
      gain.gain.exponentialRampToValueAtTime(h.gain, t0 + attack);
      // Decay - hafif düşüş
      gain.gain.exponentialRampToValueAtTime(sustain, t0 + attack + decay);
      // Sustain - duration boyunca hafif azalma
      if (duration > attack + decay) {
        gain.gain.exponentialRampToValueAtTime(sustain * 0.7, t0 + duration - release);
      }
      // Release - yavaş söndürme
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

      osc.connect(gain);
      gain.connect(masterGain);

      osc.start(t0);
      osc.stop(t0 + duration + 0.1);
    });

    // Hafif reverb etkisi
    const delay = this.ctx.createDelay();
    delay.delayTime.setValueAtTime(0.025, t0);
    const delayGain = this.ctx.createGain();
    delayGain.gain.setValueAtTime(0.12, t0);

    masterGain.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(this.master);

    // Direct output
    masterGain.gain.setValueAtTime(0.7, t0);
    masterGain.connect(this.master);

    return masterGain;
  }

  // --- PLAYER TONE (eski, fallback için) ---
  playTone(freq, duration=0.12, type="triangle"){
    this.ensure();
    const t0 = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);

    // fast attack, medium decay
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.9, t0 + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);

    osc.connect(gain);
    gain.connect(this.master);

    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  // --- tiny drum synth ---
  _noiseBuffer(){
    const bufferSize = this.ctx.sampleRate * 0.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1);
    return buffer;
  }

  _hat(t){
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();

    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(7000, t);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.12, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);

    src.connect(hp);
    hp.connect(gain);
    gain.connect(this.master);

    src.start(t);
    src.stop(t + 0.05);
  }

  _kick(t){
    const osc = this.ctx.createOscillator();
    osc.type = "sine";

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.8, t);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);

    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.12);

    osc.connect(gain);
    gain.connect(this.master);

    osc.start(t);
    osc.stop(t + 0.13);
  }

  _snare(t){
    const src = this.ctx.createBufferSource();
    src.buffer = this._noiseBuffer();

    const bp = this.ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.setValueAtTime(1800, t);

    const gainN = this.ctx.createGain();
    gainN.gain.setValueAtTime(0.30, t);
    gainN.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);

    src.connect(bp);
    bp.connect(gainN);
    gainN.connect(this.master);

    src.start(t);
    src.stop(t + 0.12);
  }

  startDrumLoop(bpm=120){
    this.ensure();
    this.stopDrumLoop();

    this._bpm = bpm;
    this._on = true;
    this._tickCount = 0;

    const beatSec = 60 / this._bpm;
    this._nextTick = this.ctx.currentTime + 0.05;

    this._timer = setInterval(() => {
      if (!this._on || !this.ctx) return;

      const now = this.ctx.currentTime;
      while (this._nextTick < now + this._scheduleAhead){
        const step = this._tickCount % 4; // 4/4

        // kick on 1 and 3
        if (step === 0 || step === 2) this._kick(this._nextTick);

        // snare on 2 and 4
        if (step === 1 || step === 3) this._snare(this._nextTick);

        // hat every beat
        this._hat(this._nextTick);

        this._nextTick += beatSec;
        this._tickCount++;
      }
    }, this._lookaheadMs);
  }

  stopDrumLoop(){
    this._on = false;
    if (this._timer){
      clearInterval(this._timer);
      this._timer = null;
    }
  }
}