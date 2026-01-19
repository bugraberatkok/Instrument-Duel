import { Rect } from "../core/Rect.js";
import { LEVELS } from "../data/levels.js";
import { ResultScene } from "./ResultScene.js";
import { loadMidiForPlayback } from "../meta/MidiPlayback.js";

export class GameScene {
  constructor(shared, sm, levelIndex){
    this.s = shared;
    this.sm = sm;
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];

    // States: LOADING | COUNTDOWN | PLAY
    this.state = "LOADING";

    // Countdown
    this.count = 3;
    this.countTimer = 0;

    // Timing (WebAudio-driven)
    this.t = 0;
    this._startAudioTime = 0;

    // Scoring
    this.score = 0;
    this.combo = 0;

    // Windows (seconds) - Daha forgiving yapıldı
    this.perfect = 0.08;
    this.good = 0.15;

    // Upgrades
    this.scoreMult = this.s.profile.owned["score_mult"] ? 1.15 : 1.0;
    this.holdToleranceMult = this.s.profile.owned["forgiving_hold"] ? 1.25 : 1.0;
    this.comboBoost = this.s.profile.owned["combo_boost"] ? 0.7 : 1.0;

    // Notes (for visuals + scoring)
    this.notes = [];

    // MIDI playback events
    this._events = [];
    this._nextEvent = 0;

    // Hold tracking
    this.activeHold = null;

    // UI layout
    this.keyCount = this.level.keyCount;
    this.keys = this.buildKeys();
    this.hitLineY = 360;
    this.noteSpeed = 220;
    this.lead = 1.6;

    // Simple RNG for lane assignment
    this._seed = (this.levelIndex + 1) * 9999;

    // Key sprites
    this.keyImages = {};
    this.imagesLoaded = false;
  }

  _rand(){
    this._seed = (this._seed * 1664525 + 1013904223) >>> 0;
    return this._seed / 4294967296;
  }

  async loadKeyImages(){
    const promises = [];
    for (let i = 1; i <= this.keyCount; i++){
      const normal = new Image();
      const pressed = new Image();
      
      promises.push(
        new Promise((resolve) => {
          normal.onload = () => resolve();
          normal.src = `img/keys/key${i}.png`;
        }),
        new Promise((resolve) => {
          pressed.onload = () => resolve();
          pressed.src = `img/keys/key${i}-pressed.png`;
        })
      );

      this.keyImages[i] = { normal, pressed };
    }
    
    await Promise.all(promises);
    this.imagesLoaded = true;
  }

  async onEnter(){
    this.s.audio.ensure();

    // Load key sprites
    await this.loadKeyImages();

    if (!this.level.midiSrc){
      this.level = { ...this.level, lengthSec: this.level.lengthSec ?? 30, bpm: this.level.bpm ?? 120 };
      this._events = [];
      this.notes = [];
      this.state = "COUNTDOWN";
      this.count = 3;
      this.countTimer = 0;
      return;
    }

    // 1) MIDI'yi playback için yükle (melodiyi çalmak için)
    const pb = await loadMidiForPlayback(this.level.midiSrc);

    // 2) Level bilgilerini güncelle
    this.level = {
      ...this.level,
      lengthSec: pb.lengthSec,
      bpm: pb.bpm
    };

    // 3) Playback eventleri
    this._events = pb.events;
    this._nextEvent = 0;

    // 4) Visual/scoring notes üret
    const minGap = this.level.midiOptions?.minGap ?? 0.25;
    let lastT = -999;

    this.notes = [];
    for (const ev of this._events){
      if (ev.time - lastT < minGap) continue;
      lastT = ev.time;

      const lane = Math.floor(this._rand() * this.keyCount);
      const hold = (ev.dur >= 0.50) ? ev.dur : 0;

      this.notes.push({
        lane,
        time: ev.time,
        hold,
        midi: ev.midi,
        hit: false,
        missed: false,
        holding: false,
        holdReleased: false  // Hold serbest bırakıldı mı
      });
    }

    // 5) Countdown
    this.state = "COUNTDOWN";
    this.count = 3;
    this.countTimer = 0;
  }

  onExit(){
    this.s.audio.stopDrumLoop?.();
  }

  buildKeys(){
    const keys = [];
    const x = 140, y = 390, w = 680, h = 120;
    const keyW = w / this.keyCount;

    for (let i=0;i<this.keyCount;i++){
      keys.push({
        id: i,
        rect: new Rect(x + i*keyW, y, keyW - 6, h),
        pressed: false
      });
    }
    return keys;
  }

  update(dt){
    const input = this.s.input;

    if (this.state === "LOADING"){
      return;
    }

    // COUNTDOWN
    if (this.state === "COUNTDOWN"){
      this.countTimer += dt;
      if (this.countTimer >= 1){
        this.countTimer = 0;
        this.count -= 1;
        if (this.count <= 0){
          this.state = "PLAY";
          this._startAudioTime = this.s.audio.now();
          this.t = 0;
        }
      }
      return;
    }

    // PLAY time from WebAudio
    this.t = Math.max(0, this.s.audio.now() - this._startAudioTime);

    // ❌ MIDI artık otomatik çalınmıyor - sadece oyuncu basınca çalacak

    // UI pressed reset
    for (const k of this.keys) k.pressed = false;

    // input handling
    const mx = input.mouse.x, my = input.mouse.y;
    const hoveredKey = this.keys.find(k => k.rect.contains(mx,my)) ?? null;

    if (input.mouse.down && hoveredKey){
      hoveredKey.pressed = true;
      this.tryHitOrStartHold(hoveredKey.id);
    }

    if (input.mouse.justUp){
      this.tryReleaseHold();
    }

    this.autoMiss();

    if (this.t > (this.level.lengthSec ?? 30)){
      this.finish();
    }
  }

  tryHitOrStartHold(laneId){
    const now = this.t;

    // En yakın, henüz vurulmamış notayı bul (lane match gerekli)
    const note = this.notes.find(n =>
      !n.hit && !n.missed &&
      n.lane === laneId &&
      Math.abs(now - n.time) <= this.good
    );
    if (!note) return;

    const diff = Math.abs(now - note.time);
    const quality = diff <= this.perfect ? "PERFECT" : "GOOD";

    // ✅ Notayı vurduğumuzda SESİ ÇAL - piano sample kullan
    if (note.hold <= 0){
      // Normal nota - kısa piano sesi
      this.s.audio.playPianoNote(note.midi, 0.25);
      note.hit = true;
      this.addScore(quality);
      return;
    }

    // Hold nota başlat
    if (!note.holding){
      note.holding = true;
      note.holdStart = now;
      this.activeHold = note;
      this.addScore(quality);
      
      // Hold için daha uzun piano sesi
      this.s.audio.playPianoNote(note.midi, Math.min(1.5, note.hold * 0.8));
    }
  }

  tryReleaseHold(){
    if (!this.activeHold) return;

    const now = this.t;
    const n = this.activeHold;
    const requiredEnd = n.time + n.hold;
    const tolerance = this.good * this.holdToleranceMult;

    if (now >= requiredEnd - tolerance){
      // Başarıyla tamamlandı
      n.hit = true;
      n.holdReleased = true;
      this.score += Math.floor(250 * this.scoreMult);
      this.combo += 1;
    } else {
      // Erken bıraktı
      n.missed = true;
      n.holdReleased = true;
      this.registerMiss();
    }

    this.activeHold = null;
  }

  addScore(quality){
    const base = (quality === "PERFECT") ? 320 : 260;
    this.score += Math.floor(base * this.scoreMult);
    this.combo += 1;
  }

  registerMiss(){
    this.combo = 0;
    this.score = Math.max(0, this.score - 50);
  }

  autoMiss(){
    const now = this.t;
    for (const n of this.notes){
      if (n.hit || n.missed) continue;
      
      // Hold notalar için özel mantık
      if (n.hold > 0){
        // Hold başladı ama tamamlanmadı ve süresi doldu
        if (n.holding && now > n.time + n.hold + this.good){
          n.missed = true;
          n.holdReleased = true;
          this.registerMiss();
          if (this.activeHold === n) this.activeHold = null;
        }
        // Hold hiç başlamadı ve başlama süresi doldu
        else if (!n.holding && now > n.time + this.good){
          n.missed = true;
          this.registerMiss();
        }
      } else {
        // Normal nota
        if (now > n.time + this.good){
          n.missed = true;
          this.registerMiss();
        }
      }
    }
  }

  getComboMultiplier(){
    if (this.combo >= Math.floor(10 * this.comboBoost)) return 5;
    if (this.combo >= Math.floor(6 * this.comboBoost)) return 3;
    if (this.combo >= Math.floor(3 * this.comboBoost)) return 2;
    return 1;
  }

  finish(){
    const mult = this.getComboMultiplier();
    const finalScore = this.score * mult;
    const enemyScore = this.level.expectedScore ?? 2000;
    const win = finalScore >= enemyScore;

    let earned = Math.floor(finalScore / 10);
    if (win) earned = Math.floor(earned * 1.2);

    this.s.profile.money += earned;

    if (win && this.levelIndex === this.s.profile.unlockedLevel){
      this.s.profile.unlockedLevel = Math.min(this.s.profile.unlockedLevel + 1, LEVELS.length - 1);
    }

    this.s.profile.save();

    this.sm.set(new ResultScene(this.s, this.sm, {
      levelIndex: this.levelIndex,
      win,
      earned,
      playerScore: finalScore,
      enemyScore
    }));
  }

  render(ctx){
    ctx.save();
    ctx.fillStyle = "#151515";
    ctx.fillRect(0,0,this.s.canvas.width,this.s.canvas.height);

    ctx.fillStyle = "#f2f2f2";
    ctx.font = "18px sans-serif";
    ctx.fillText(`${this.level.name} vs ${this.level.enemyName}`, 20, 30);
    ctx.fillText(`Score: ${this.score}  Combo: ${this.combo}x`, 20, 55);

    if (this.state === "LOADING"){
      ctx.font = "28px sans-serif";
      ctx.fillText("Loading...", 360, 260);
      ctx.restore();
      return;
    }

    if (this.state === "COUNTDOWN"){
      ctx.font = "96px sans-serif";
      ctx.fillText(String(this.count), 450, 280);
      ctx.restore();
      return;
    }

    this.renderNotes(ctx);
    this.renderKeys(ctx);
    ctx.restore();
  }

  renderKeys(ctx){
    for (const k of this.keys){
      const keyNum = k.id + 1;
      
      if (this.imagesLoaded && this.keyImages[keyNum]){
        // Sprite kullan
        const img = k.pressed ? this.keyImages[keyNum].pressed : this.keyImages[keyNum].normal;
        ctx.drawImage(img, k.rect.x, k.rect.y, k.rect.w, k.rect.h);
      } else {
        // Fallback: renkli dikdörtgen
        ctx.fillStyle = k.pressed ? "#e0e0e0" : "#b0b0b0";
        ctx.fillRect(k.rect.x, k.rect.y, k.rect.w, k.rect.h);
        ctx.fillStyle = "#111";
        ctx.fillText(`K${keyNum}`, k.rect.x + 10, k.rect.y + 28);
      }
    }
  }

  renderNotes(ctx){
    const now = this.t;
    
    for (const n of this.notes){
      // Hit veya tamamen missed olanları gösterme
      if (n.hit || (n.missed && n.holdReleased)) continue;

      const dtToTarget = n.time - now;
      
      // Görünürlük kontrolü
      if (dtToTarget < -0.3 || dtToTarget > this.lead) continue;

      const keyRect = this.keys[n.lane].rect;
      const x = keyRect.x + keyRect.w * 0.25;
      const w = keyRect.w * 0.5;

      // Hold notası
      if (n.hold > 0){
        const noteStartTime = n.time;
        const noteEndTime = n.time + n.hold;
        
        // Hold devam ediyorsa, geçen kısmı gösterme
        let visibleStartTime = n.holding ? now : noteStartTime;
        let visibleEndTime = noteEndTime;
        
        // Başlangıç ve bitiş Y pozisyonları
        let startY = this.hitLineY - ((visibleStartTime - now) * this.noteSpeed);
        let endY = this.hitLineY - ((visibleEndTime - now) * this.noteSpeed);

        // Ekrandan çıkmışları kesme
        const topY = Math.max(0, Math.min(startY, endY));
        const bottomY = Math.min(this.s.canvas.height, Math.max(startY, endY));
        const h = Math.abs(bottomY - topY);

        if (h > 2){
          // Hold çubuğu - aktif ise altın sarısı
          ctx.fillStyle = n.holding ? "#FFD700" : "#a6e22e";
          ctx.fillRect(x + w*0.35, topY, w*0.3, h);
          
          // Kenarlık
          ctx.strokeStyle = n.holding ? "#FFA500" : "#7CFC00";
          ctx.lineWidth = 2;
          ctx.strokeRect(x + w*0.35, topY, w*0.3, h);
        }

        // Başlangıç notası - head (sadece henüz vurulmadıysa)
        if (!n.holding && dtToTarget <= this.lead && dtToTarget >= -0.3){
          const y = this.hitLineY - (dtToTarget * this.noteSpeed);
          ctx.fillStyle = "#00CED1";
          ctx.fillRect(x, y - 10, w, 20);
          
          // Parlak kenarlık
          ctx.strokeStyle = "#40E0D0";
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y - 10, w, 20);
        }
      } else {
        // Normal nota
        const y = this.hitLineY - (dtToTarget * this.noteSpeed);
        ctx.fillStyle = "#66d9ef";
        ctx.fillRect(x, y - 9, w, 18);
        
        // Kenarlık ekle
        ctx.strokeStyle = "#40E0D0";
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y - 9, w, 18);
      }
    }

    // Hit line
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(120, this.hitLineY);
    ctx.lineTo(840, this.hitLineY);
    ctx.stroke();
  }
}