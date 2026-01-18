import { Rect } from "../core/Rect.js";
import { LEVELS } from "../data/levels.js";
import { ResultScene } from "./ResultScene.js";

export class GameScene {
  constructor(shared, sm, levelIndex){
    this.s = shared;
    this.sm = sm;
    this.levelIndex = levelIndex;
    this.level = LEVELS[levelIndex];

    // Countdown
    this.state = "COUNTDOWN"; // COUNTDOWN | PLAY
    this.count = 3;
    this.countTimer = 0;

    // Timing
    this.t = 0;

    // Scoring base
    this.score = 0;
    this.combo = 0;

    // Windows (seconds)
    this.perfect = 0.06;
    this.good = 0.12;

    // Apply upgrades
    this.scoreMult = this.s.profile.owned["score_mult"] ? 1.15 : 1.0;
    this.holdToleranceMult = this.s.profile.owned["forgiving_hold"] ? 1.25 : 1.0;
    this.comboBoost = this.s.profile.owned["combo_boost"] ? 0.7 : 1.0; // reach 5x earlier

    // For hold tracking
    this.activeHold = null; // note object currently holding
    this.notes = this.level.notes.map(n => ({
      lane: n.lane,
      time: n.time,
      hold: n.hold ?? 0,
      hit: false,
      missed: false,
      holding: false,
      released: false
    }));

    // UI layout: instrument keys at bottom
    this.keyCount = this.level.keyCount;
    this.keys = this.buildKeys();
    this.hitLineY = 360;
    this.noteSpeed = 220;
    this.lead = 1.6;
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

    if (this.state === "COUNTDOWN"){
      this.countTimer += dt;
      if (this.countTimer >= 1){
        this.countTimer = 0;
        this.count -= 1;
        if (this.count <= 0){
          this.state = "PLAY";
          this.t = 0;
        }
      }
      return;
    }

    // PLAY
    this.t += dt;

    // key press visuals
    for (const k of this.keys) k.pressed = false;

    // detect which key is under mouse
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

    // End condition: after last note + buffer or level length
    const endTime = this.level.lengthSec;
    if (this.t > endTime){
      this.finish();
    }
  }

  tryHitOrStartHold(laneId){
    const now = this.t;

    // find a hittable note in window
    const note = this.notes.find(n => !n.hit && !n.missed && Math.abs(now - n.time) <= this.good);
    if (!note) return;
    if (note.lane !== laneId) return;

    const diff = Math.abs(now - note.time);
    const quality = diff <= this.perfect ? "PERFECT" : "GOOD";

    // Tap note
    if (note.hold <= 0){
      note.hit = true;
      this.addScore(quality, false);
      return;
    }

    // Start hold
    if (!note.holding && !note.hit){
      note.holding = true;
      note.holdStart = now;
      note.qualityOnStart = quality;
      this.activeHold = note;
      this.addScore(quality, true); // small reward for starting
    }
  }

  tryReleaseHold(){
    if (!this.activeHold) return;

    const now = this.t;
    const n = this.activeHold;
    n.released = true;

    const requiredEnd = n.time + n.hold;
    const tolerance = this.good * this.holdToleranceMult;

    const ok = now >= requiredEnd - tolerance;
    if (ok){
      n.hit = true;
      // completion reward
      this.score += Math.floor(250 * this.scoreMult);
      this.combo += 1;
    } else {
      n.missed = true;
      this.registerMiss();
    }

    this.activeHold = null;
  }

  addScore(quality, isHoldStart){
    const base = quality === "PERFECT" ? 300 : 150;
    const amount = Math.floor(base * this.scoreMult);
    this.score += amount;

    // combo
    this.combo += 1;

    // optional: if hold start, slightly less combo? keep simple
    if (isHoldStart){
      // no special handling
    }
  }

  registerMiss(){
    this.combo = 0;
    this.score = Math.max(0, this.score - 50);
  }

  autoMiss(){
    const now = this.t;
    for (const n of this.notes){
      if (n.hit || n.missed) continue;

      // tap miss
      if (n.hold <= 0 && now > n.time + this.good){
        n.missed = true;
        this.registerMiss();
      }

      // hold miss (never started)
      if (n.hold > 0 && !n.holding && now > n.time + this.good){
        n.missed = true;
        this.registerMiss();
      }
    }
  }

  getComboMultiplier(){
    // comboBoost makes threshold smaller
    // default: 5x at 10 combo
    const thresholdFor5x = Math.floor(10 * this.comboBoost);

    if (this.combo >= thresholdFor5x) return 5;
    if (this.combo >= Math.floor(6 * this.comboBoost)) return 3;
    if (this.combo >= Math.floor(3 * this.comboBoost)) return 2;
    return 1;
  }

  finish(){
    // apply combo multiplier at end as a simple meta reward
    const mult = this.getComboMultiplier();
    const finalScore = this.score * mult;

    // enemy expected score is the benchmark to beat
    const enemyScore = this.level.expectedScore;
    const win = finalScore >= enemyScore;

    // money earned even on loss
    // (simple rule): money = floor(finalScore / 10); win bonus +20%
    let earned = Math.floor(finalScore / 10);
    if (win) earned = Math.floor(earned * 1.2);

    this.s.profile.money += earned;

    // unlock next level if win
    if (win){
      const nextUnlock = Math.min(this.s.profile.unlockedLevel + 1, LEVELS.length - 1);
      if (this.levelIndex === this.s.profile.unlockedLevel && this.levelIndex < LEVELS.length - 1){
        this.s.profile.unlockedLevel = nextUnlock;
      }
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

    // Header info
    ctx.fillStyle = "#f2f2f2";
    ctx.font = "18px sans-serif";
    ctx.fillText(`${this.level.name}  vs  ${this.level.enemyName}`, 20, 30);
    ctx.fillText(`Score: ${this.score}  Combo: ${this.combo}  (End Mult: x${this.getComboMultiplier()})`, 20, 55);

    // Countdown overlay
    if (this.state === "COUNTDOWN"){
      ctx.font = "96px sans-serif";
      ctx.fillText(String(this.count), 450, 280);
      ctx.restore();
      return;
    }

    // Notes
    this.renderNotes(ctx);

    // Instrument keys
    this.renderKeys(ctx);

    ctx.restore();
  }

  renderKeys(ctx){
    for (const k of this.keys){
      ctx.fillStyle = k.pressed ? "#e0e0e0" : "#b0b0b0";
      ctx.fillRect(k.rect.x, k.rect.y, k.rect.w, k.rect.h);
      ctx.fillStyle = "#111";
      ctx.font = "18px sans-serif";
      ctx.fillText(`K${k.id+1}`, k.rect.x + 10, k.rect.y + 28);
    }
  }

  renderNotes(ctx){
    const now = this.t;
    for (const n of this.notes){
      if (n.hit || n.missed) continue;

      const dtToTarget = n.time - now;
      if (dtToTarget < -0.3 || dtToTarget > this.lead) continue;

      const keyRect = this.keys[n.lane].rect;
      const y = this.hitLineY - (dtToTarget * this.noteSpeed);
      const x = keyRect.x + keyRect.w * 0.25;
      const w = keyRect.w * 0.5;
      const h = 18;

      ctx.fillStyle = "#66d9ef";
      ctx.fillRect(x, y, w, h);

      if (n.hold > 0){
        const tailH = n.hold * this.noteSpeed;
        ctx.fillStyle = "#a6e22e";
        ctx.fillRect(x + w*0.4, y, w*0.2, tailH);
      }
    }

    // hit line
    ctx.strokeStyle = "#444";
    ctx.beginPath();
    ctx.moveTo(120, this.hitLineY);
    ctx.lineTo(840, this.hitLineY);
    ctx.stroke();
  }
}
