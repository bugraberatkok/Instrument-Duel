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

    // Upgrades - now level-based
    const scoreMult = this.s.profile.getUpgradeLevel("score_mult");
    const holdTol = this.s.profile.getUpgradeLevel("forgiving_hold");
    const comboLvl = this.s.profile.getUpgradeLevel("combo_boost");
    const currencyLvl = this.s.profile.getUpgradeLevel("currency_mult");

    this.scoreMult = 1.0 + (scoreMult > 0 ? (0.15 + (scoreMult - 1) * 0.10) : 0);
    this.holdToleranceMult = 1.0 + (holdTol > 0 ? (0.25 + (holdTol - 1) * 0.15) : 0);
    
    // Combo boost: L1=70%, L2=50%, L3=30%
    const comboMultipliers = [1.0, 0.7, 0.5, 0.3];
    this.comboBoost = comboMultipliers[comboLvl];
    
    // Currency multiplier for finish()
    this.currencyMult = 1.0 + (currencyLvl > 0 ? (0.20 + (currencyLvl - 1) * 0.15) : 0);

    // Notes (for visuals + scoring)
    this.notes = [];

    // MIDI playback events
    this._events = [];
    this._nextEvent = 0;

    // Hold tracking
    this.activeHold = null;
    this.lastHitTime = {}; // Herbir lane'in son hit zamanını takip et

    // UI layout
    this.keyCount = this.level.keyCount;
    this.keys = this.buildKeys();
    this.hitLineY = 520; // Daha aşağıya taşıdı (canvas yüksekliği arttı)
    this.noteSpeed = 220;
    this.lead = 2.8; // Artırıldı - notalar ekranın üstünden başlasın

    // Simple RNG for lane assignment
    this._seed = (this.levelIndex + 1) * 9999;

    // Key sprites
    this.keyImages = {};
    this.imagesLoaded = false;

    // Note images
    this.noteImages = {};
    this.noteImagesLoaded = false;

    // Lane colors (for key backgrounds)
    this.laneColors = [
      { base: "#5f208e", light: "#8b2ec4" },  // 1: Purple
      { base: "#ffa800", light: "#ffbd33" },  // 2: Orange
      { base: "#4bbb0d", light: "#6ed93d" },  // 3: Green
      { base: "#a40e0e", light: "#d41a1a" },  // 4: Red
      { base: "#dd00c0", light: "#ff33dd" }   // 5: Pink
    ];

    // UI icons
    this.uiIcons = {};
    this.uiIconsLoaded = false;

    // Hit feedback system for "PERFECT!" text
    this.hitFeedbacks = []; // { text, x, y, alpha, createdAt }
  }

  _rand(){
    this._seed = (this._seed * 1664525 + 1013904223) >>> 0;
    return this._seed / 4294967296;
  }

  async loadUIIcons() {
    const iconNames = ['score', 'currency'];
    const promises = [];
    
    iconNames.forEach(name => {
      const img = new Image();
      promises.push(
        new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = `img/icons/${name}.png`;
        })
      );
      this.uiIcons[name] = img;
    });
    
    await Promise.all(promises);
    this.uiIconsLoaded = true;
  }

  async loadNoteImages(){
    const promises = [];
    for (let i = 1; i <= this.keyCount; i++){
      const img = new Image();
      
      promises.push(
        new Promise((resolve) => {
          img.onload = () => {
            console.log(`Loaded note-${i}.png`);
            resolve();
          };
          img.onerror = (e) => {
            console.warn(`Failed to load note-${i}.png`, e);
            resolve();
          };
          img.src = `img/notes/note-${i}.png`;
        })
      );

      this.noteImages[i] = img;
    }
    
    await Promise.all(promises);
    this.noteImagesLoaded = true;
    console.log("All note images loaded:", this.noteImages);
  }

  async loadKeyImages(){
    const promises = [];
    for (let i = 1; i <= this.keyCount; i++){
      const normal = new Image();
      const pressed = new Image();
      
      promises.push(
        new Promise((resolve) => {
          normal.onload = () => {
            console.log(`Loaded key${i}.png`);
            resolve();
          };
          normal.onerror = (e) => {
            console.warn(`Failed to load key${i}.png`, e);
            resolve();
          };
          normal.src = `img/keys/key${i}.png`;
        }),
        new Promise((resolve) => {
          pressed.onload = () => {
            console.log(`Loaded key${i}-pressed.png`);
            resolve();
          };
          pressed.onerror = (e) => {
            console.warn(`Failed to load key${i}-pressed.png`, e);
            resolve();
          };
          pressed.src = `img/keys/key${i}-pressed.png`;
        })
      );

      this.keyImages[i] = { normal, pressed };
    }
    
    await Promise.all(promises);
    this.imagesLoaded = true;
    console.log("All key images loaded:", this.keyImages);
  }

  async onEnter(){
    this.s.audio.ensure();

    // Load key sprites
    await this.loadKeyImages();
    
    // Load UI icons
    await this.loadUIIcons();

    // Load note images
    await this.loadNoteImages();

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

    // 2) Level bilgilerini güncelle (lengthSec korunmalı - eğer level'da tanımlıysa)
    this.level = {
      ...this.level,
      lengthSec: this.level.lengthSec || pb.lengthSec, // Level'daki süreyi tercih et
      bpm: pb.bpm
    };

    // 3) Playback eventleri
    this._events = pb.events;
    this._nextEvent = 0;

    // Tempo multiplier uygula (yavaşlatma için)
    const tempoMult = this.level.tempoMultiplier ?? 1.0;
    if (tempoMult !== 1.0) {
      this._events = this._events.map(ev => ({
        ...ev,
        time: ev.time / tempoMult,
        dur: ev.dur / tempoMult
      }));
    }

    // 4) Visual/scoring notes üret
    const minGap = this.level.midiOptions?.minGap ?? 0.25;
    let lastT = -999;

    this.notes = [];
    for (let i = 0; i < this._events.length; i++){
      const ev = this._events[i];
      if (ev.time - lastT < minGap) continue;
      lastT = ev.time;

      const lane = Math.floor(this._rand() * this.keyCount);
      
      // Hold duration hesapla - sonraki nota ile çakışmasın
      let hold = (ev.dur >= 0.50) ? ev.dur : 0;
      
      if (hold > 0) {
        // Sonraki notaya bak (minGap'i geçen ilk nota)
        let nextNoteTime = null;
        for (let j = i + 1; j < this._events.length; j++) {
          const nextEv = this._events[j];
          if (nextEv.time - lastT >= minGap) {
            nextNoteTime = nextEv.time;
            break;
          }
        }
        
        if (nextNoteTime) {
          const maxHoldDuration = (nextNoteTime - ev.time) - 0.15; // 150ms gap
          hold = Math.min(hold, Math.max(0.3, maxHoldDuration)); // Min 0.3s hold
        } else {
          // Sonraki nota yoksa max 2 saniye
          hold = Math.min(hold, 2.0);
        }
      }

      this.notes.push({
        lane,
        time: ev.time,
        hold,
        midi: ev.midi,
        hit: false,
        missed: false,
        holding: false,
        holdReleased: false,
        holdCompleted: false  // Hold başarıyla tamamlandı mı
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
    const x = 100, y = 560, w = 1080, h = 140;
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

    // MIDI artık otomatik çalınmıyor - sadece oyuncu basınca çalacak

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

    // Update hit feedbacks
    const now = this.t; // Define now for hit feedback updates
    this.hitFeedbacks = this.hitFeedbacks.filter(f => {
      const age = now - f.createdAt;
      return age < 0.8; // Remove after 0.8 seconds
    });

    // Update alpha for fade out
    this.hitFeedbacks.forEach(f => {
      const age = now - f.createdAt;
      f.alpha = Math.max(0, 1.0 - (age / 0.8));
      f.y -= 0.5; // Float upwards
    });

    if (this.t > (this.level.lengthSec ?? 30)){
      this.finish();
    }
  }

  tryHitOrStartHold(laneId){
    const now = this.t;

    // Duplikat hit engelle - aynı nota'yı iki kez basılamaz
    // lastHitTime ile bu frame'de bu lane'e zaten basılmış mı kontrol et
    if (this.lastHitTime[laneId] === now) return;

    // En yakın, henüz vurulmamış notayı bul (lane match gerekli)
    const note = this.notes.find(n =>
      !n.hit && !n.missed &&
      n.lane === laneId &&
      Math.abs(now - n.time) <= this.good
    );
    if (!note) return;

    this.lastHitTime[laneId] = now; // Bu lane için hit zamanını kaydet

    const diff = Math.abs(now - note.time);
    const quality = diff <= this.perfect ? "PERFECT" : "GOOD";

    // Hit feedback ekle (hold notalarında yalnız bir kez)
    if (!note.feedbackShown) {
      const keyRect = this.keys[laneId].rect;
      if (quality === "PERFECT") {
        this.hitFeedbacks.push({
          text: "PERFECT!",
          x: keyRect.x + keyRect.w / 2,
          y: this.hitLineY - 40,
          alpha: 1.0,
          color: "#00FFFF",
          createdAt: now
        });
      } else if (quality === "GOOD") {
        this.hitFeedbacks.push({
          text: "OK...",
          x: keyRect.x + keyRect.w / 2,
          y: this.hitLineY - 40,
          alpha: 1.0,
          color: "#FFFF00",
          createdAt: now
        });
      }
      note.feedbackShown = true;
    }

    // Notayı vurduğumuzda SESİ ÇAL - piano sample kullan
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
      note.startQuality = quality; // Başlangıç kalitesini kaydet
      this.addScore(quality);
      
      // Hold için uzun piano sesi - NOTA SÜRESİNE eşit
      // Ses, hold'un tamamı boyunca çalmalı
      this.s.audio.playPianoNote(note.midi, note.hold);
    }
  }

  tryReleaseHold(){
    if (!this.activeHold) return;

    const now = this.t;
    const n = this.activeHold;
    const requiredEnd = n.time + n.hold;
    const tolerance = this.good * this.holdToleranceMult;

    if (now >= requiredEnd - tolerance){
      // Başarıyla tamamlandı - ama görsel hala gösterilsin
      n.holdCompleted = true;
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
    
    // Miss feedback
    for (const n of this.notes) {
      if (n.missed && !n.hasMissFeedback) {
        const keyRect = this.keys[n.lane].rect;
        this.hitFeedbacks.push({
          text: "MISSED",
          x: keyRect.x + keyRect.w / 2,
          y: this.hitLineY - 40,
          alpha: 1.0,
          color: "#FF0000",
          createdAt: this.t
        });
        n.hasMissFeedback = true;
        break;
      }
    }
  }

  autoMiss(){
    const now = this.t;
    for (const n of this.notes){
      if (n.hit || n.missed) continue;
      
      // Hold notalar için özel mantık
      if (n.hold > 0){
        // Hold tamamlandı ve süresi doldu - artık hit olarak işaretle
        if (n.holdCompleted && now > n.time + n.hold){
          n.hit = true;
        }
        // Hold başladı ama tamamlanmadı ve süresi doldu
        else if (n.holding && !n.holdCompleted && now > n.time + n.hold + this.good){
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
    const level = this.level;
    const minScore = Math.floor(level.expectedScore * 0.95); // Minimum skor = %95'i
    const win = this.score >= level.expectedScore;
    
    let earned = 0;
    if (win) {
      // Kazandı: skor/10
      earned = Math.floor(this.score / 10);
    } else if (this.score >= minScore) {
      // Kaybetti ama yeterli skora ulaştı: skor/20
      earned = Math.floor(this.score / 20);
    }
    // Eğer minScore'un altındaysa para almazsin
    
    // Apply currency multiplier upgrade
    earned = Math.floor(earned * this.currencyMult);
    
    this.s.profile.money += earned;

    if (win){
      const nextLevel = this.levelIndex + 1;
      if (nextLevel > this.s.profile.unlockedLevel){
        this.s.profile.unlockedLevel = nextLevel;
      }
    }

    this.s.profile.save();

    this.sm.set(new ResultScene(this.s, this.sm, {
      win,
      levelIndex: this.levelIndex,
      playerScore: this.score,
      enemyScore: level.expectedScore,
      earned
    }));
  }

  render(ctx){
    ctx.save();
    ctx.fillStyle = "#151515";
    ctx.fillRect(0,0,this.s.canvas.width,this.s.canvas.height);

    ctx.fillStyle = "#f2f2f2";
    ctx.font = this.fontsLoaded ? "18px DefaultFont" : "18px DefaultFont, sans-serif";
    ctx.fillText(`${this.level.name} vs ${this.level.enemyName}`, 20, 30);
    
    // Score with icon
    if (this.uiIconsLoaded && this.uiIcons['score']) {
      ctx.drawImage(this.uiIcons['score'], 20, 70, 28, 28);
      ctx.fillText(`${this.score}`, 54, 92);
      ctx.fillText(`Combo: ${this.combo}x`, 20, 60);
    } else {
      ctx.fillText(`Score: ${this.score}  Combo: ${this.combo}x`, 20, 55);
    }

    if (this.state === "LOADING"){
      ctx.font = this.fontsLoaded ? "28px DefaultFont" : "28px DefaultFont, sans-serif";
      ctx.fillText("Loading...", 360, 260);
      ctx.restore();
      return;
    }

    if (this.state === "COUNTDOWN"){
      ctx.font = this.fontsLoaded ? "96px TitleFont" : "96px TitleFont, sans-serif";
      ctx.fillStyle = "#FFD700";
      ctx.textAlign = "center";
      ctx.fillText(String(this.count), this.s.canvas.width / 2, this.s.canvas.height / 2);
      ctx.restore();
      return;
    }

    this.renderNotes(ctx);
    this.renderKeys(ctx);
    
    // Render hit feedbacks
    ctx.save();
    ctx.font = "24px DefaultFont, sans-serif";
    ctx.textAlign = "center";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 4;
    for (const f of this.hitFeedbacks) {
      ctx.globalAlpha = f.alpha;
      ctx.fillStyle = f.color || "#FFD700";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
    
    ctx.restore();
  }

  renderKeys(ctx){
    // Hit line çiz
    ctx.strokeStyle = "#FFD700";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(100, this.hitLineY);
    ctx.lineTo(this.s.canvas.width - 100, this.hitLineY);
    ctx.stroke();

    for (const k of this.keys){
      const keyNum = k.id + 1;
      const colorScheme = this.laneColors[k.id];
      
      // Draw colored column background (extends from top to bottom)
      ctx.fillStyle = colorScheme.base;
      ctx.globalAlpha = 0.15; // Semi-transparent background
      ctx.fillRect(k.rect.x, 0, k.rect.w, this.s.canvas.height);
      ctx.globalAlpha = 1.0;
      
      // Draw key sprite
      if (this.imagesLoaded && this.keyImages[keyNum]){
        const img = k.pressed ? this.keyImages[keyNum].pressed : this.keyImages[keyNum].normal;
        ctx.drawImage(
          img, 
          k.rect.x, 
          k.rect.y, 
          k.rect.w, 
          k.rect.h
        );
      } else {
        // Fallback: colored rectangle based on lane
        ctx.fillStyle = k.pressed ? colorScheme.light : colorScheme.base;
        ctx.fillRect(k.rect.x, k.rect.y, k.rect.w, k.rect.h);
        ctx.fillStyle = "#fff";
        ctx.font = this.fontsLoaded ? "16px DefaultFont" : "16px DefaultFont, sans-serif";
        ctx.fillText(`K${keyNum}`, k.rect.x + 10, k.rect.y + 28);
      }
    }
  }

  renderNotes(ctx){
    const now = this.t;
    
    for (const n of this.notes){
      // Normal notalar: hit olunca hemen kaybolur
      if (!n.hold && n.hit) continue;
      
      // Hold notalar: tamamlandıktan SONRA bile end time'a kadar göster
      if (n.hold > 0 && n.hit) {
        if (now > n.time + n.hold + 0.1) continue;
      }
      
      // Missed ve released olanları gösterme
      if (n.missed && n.holdReleased) continue;

      const dtToTarget = n.time - now;
      
      // Görünürlük kontrolü
      const maxLookback = n.hold > 0 ? -n.hold - 0.3 : -0.3;
      if (dtToTarget < maxLookback || dtToTarget > this.lead) continue;

      const keyRect = this.keys[n.lane].rect;
      const x = keyRect.x + keyRect.w * 0.25;
      const w = keyRect.w * 0.5;
      const colorScheme = this.laneColors[n.lane];

      // Hold notası
      if (n.hold > 0){
        const noteStartTime = n.time;
        const noteEndTime = n.time + n.hold;
        
        let visibleStartTime = (n.holding || n.holdCompleted || n.hit) ? now : noteStartTime;
        let visibleEndTime = noteEndTime;
        
        let startY = this.hitLineY - ((visibleStartTime - now) * this.noteSpeed);
        let endY = this.hitLineY - ((visibleEndTime - now) * this.noteSpeed);

        const topY = Math.max(0, Math.min(startY, endY));
        const bottomY = Math.min(this.s.canvas.height, Math.max(startY, endY));
        const h = Math.abs(bottomY - topY);

        if (h > 2){
          // Hold çubuğu - semi-transparent lane color
          ctx.fillStyle = colorScheme.base;
          ctx.globalAlpha = 0.6; // Semi-transparent
          ctx.fillRect(x + w*0.35, topY, w*0.3, h);
          
          // Kenarlık - solid color
          ctx.globalAlpha = 1.0;
          if (n.hit || n.holdCompleted) {
            ctx.strokeStyle = "#7CFC90"; // Yeşil - tamamlandı
          } else if (n.holding) {
            ctx.strokeStyle = "#FFD700"; // Altın - aktif
          } else {
            ctx.strokeStyle = colorScheme.light;
          }
          ctx.lineWidth = 2;
          ctx.strokeRect(x + w*0.35, topY, w*0.3, h);
        }

        // Başlangıç notası - head (note image)
        if (!n.holding && !n.holdCompleted && !n.hit && dtToTarget <= this.lead && dtToTarget >= maxLookback){
          const y = this.hitLineY - (dtToTarget * this.noteSpeed);
          const noteSize = 56;
          
          if (this.noteImagesLoaded && this.noteImages[n.lane + 1]) {
            ctx.drawImage(
              this.noteImages[n.lane + 1],
              x + (w - noteSize) / 2,
              y - noteSize / 2,
              noteSize,
              noteSize
            );
          } else {
            // Fallback
            ctx.fillStyle = colorScheme.base;
            ctx.fillRect(x, y - 10, w, 20);
            ctx.strokeStyle = colorScheme.light;
            ctx.lineWidth = 2;
            ctx.strokeRect(x, y - 10, w, 20);
          }
        }
      } else {
        // Normal nota - use note image
        const y = this.hitLineY - (dtToTarget * this.noteSpeed);
        const noteSize = 56;
        
        if (this.noteImagesLoaded && this.noteImages[n.lane + 1]) {
          ctx.drawImage(
            this.noteImages[n.lane + 1],
            x + (w - noteSize) / 2,
            y - noteSize / 2,
            noteSize,
            noteSize
          );
        } else {
          // Fallback
          ctx.fillStyle = colorScheme.base;
          ctx.fillRect(x, y - 9, w, 18);
          ctx.strokeStyle = colorScheme.light;
          ctx.lineWidth = 2;
          ctx.strokeRect(x, y - 9, w, 18);
        }
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