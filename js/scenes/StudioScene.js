import { Button } from "../core/Button.js";
import { Rect } from "../core/Rect.js";
import { LEVELS } from "../data/levels.js";
import { UPGRADES } from "../meta/Upgrades.js";
import { GameScene } from "./GameScene.js";
import { MainMenuScene } from "./MainMenuScene.js";

export class StudioScene {
  constructor(shared, sm){
    this.s = shared;
    this.sm = sm;

    this.levelIndex = Math.min(this.s.profile.unlockedLevel, LEVELS.length - 1);

    // Layout
    this.marketRect = new Rect(0, 0, this.s.canvas.width * 0.25, this.s.canvas.height);
    this.infoRect = new Rect(this.marketRect.w, 0, this.s.canvas.width - this.marketRect.w, this.s.canvas.height);

    // Buttons (right side)
    this.btnPlayLevel = new Button(this.infoRect.x + 40, 380, 260, 52, "Play Level", () => {
      this.sm.set(new GameScene(this.s, this.sm, this.levelIndex));
    });

    this.btnBack = new Button(this.infoRect.x + 40, 450, 260, 44, "Back to Main Menu", () => {
      this.sm.set(new MainMenuScene(this.s, this.sm));
    });

    // Market buttons (left side)
    this.marketButtons = [];
    this.buildMarketButtons();
  }

  buildMarketButtons(){
    this.marketButtons = [];
    const x = 18, y0 = 90, w = this.marketRect.w - 36, h = 44, gap = 12;

    UPGRADES.forEach((u, i) => {
      const btn = new Button(x, y0 + i*(h+gap), w, h, `Buy: ${u.name} (${u.cost})`, () => {
        this.tryBuy(u.id);
      });
      this.marketButtons.push(btn);
    });
  }

  tryBuy(upgradeId){
    const u = UPGRADES.find(z => z.id === upgradeId);
    if (!u) return;

    if (this.s.profile.owned[upgradeId]) return; // already owned
    if (this.s.profile.money < u.cost) return;

    this.s.profile.money -= u.cost;
    this.s.profile.owned[upgradeId] = true;
    this.s.profile.save();
  }

  update(dt){
    const input = this.s.input;

    // Level selection with arrows (only if unlocked allows)
    if (input.wasJustPressed("ArrowLeft")){
      this.levelIndex = Math.max(0, this.levelIndex - 1);
    }
    if (input.wasJustPressed("ArrowRight")){
      const maxSelectable = this.s.profile.unlockedLevel;
      this.levelIndex = Math.min(maxSelectable, Math.min(LEVELS.length - 1, this.levelIndex + 1));
    }

    // disable play if locked? (shouldn't happen due to clamp, but safe)
    this.btnPlayLevel.enabled = this.levelIndex <= this.s.profile.unlockedLevel;

    // Update buttons
    this.btnPlayLevel.update(input);
    this.btnBack.update(input);

    for (let i = 0; i < this.marketButtons.length; i++){
      const u = UPGRADES[i];
      const btn = this.marketButtons[i];

      // disable if owned or not enough money
      const owned = !!this.s.profile.owned[u.id];
      btn.enabled = !owned && this.s.profile.money >= u.cost;
      btn.update(input);
    }
  }

  render(ctx){
    ctx.save();

    // Background split
    ctx.fillStyle = "#141414";
    ctx.fillRect(0,0,this.s.canvas.width,this.s.canvas.height);

    // Market column
    ctx.fillStyle = "#202020";
    ctx.fillRect(this.marketRect.x, this.marketRect.y, this.marketRect.w, this.marketRect.h);

    ctx.fillStyle = "#f2f2f2";
    ctx.font = "22px sans-serif";
    ctx.fillText("MARKET", 18, 40);

    ctx.font = "16px sans-serif";
    ctx.fillText(`Money: ${this.s.profile.money}`, 18, 65);

    // Market items
    ctx.font = "14px sans-serif";
    for (let i = 0; i < UPGRADES.length; i++){
      const u = UPGRADES[i];
      const owned = !!this.s.profile.owned[u.id];
      ctx.fillStyle = owned ? "#7CFC90" : "#f2f2f2";
      ctx.fillText(owned ? "Owned" : u.desc, 18, 155 + i*56);
    }
    for (const b of this.marketButtons) b.render(ctx);

    // Right info panel
    const level = LEVELS[this.levelIndex];

    ctx.fillStyle = "#f2f2f2";
    ctx.font = "26px sans-serif";
    ctx.fillText("STUDIO", this.infoRect.x + 40, 55);

    // Level selector UI
    ctx.font = "18px sans-serif";
    ctx.fillText("Use LEFT/RIGHT arrows to change level (unlocked only).", this.infoRect.x + 40, 90);

    ctx.font = "22px sans-serif";
    ctx.fillText(level.name, this.infoRect.x + 40, 140);

    ctx.font = "18px sans-serif";
    ctx.fillText(`Opponent: ${level.enemyName}`, this.infoRect.x + 40, 175);
    ctx.fillText(`Rhythm length: ${level.lengthSec}s`, this.infoRect.x + 40, 205);
    ctx.fillText(`Expected score: ${level.expectedScore}`, this.infoRect.x + 40, 235);

    ctx.font = "14px sans-serif";
    ctx.fillText(`Unlocked up to: Level ${this.s.profile.unlockedLevel + 1}`, this.infoRect.x + 40, 270);

    // Buttons
    this.btnPlayLevel.render(ctx);
    this.btnBack.render(ctx);

    ctx.restore();
  }
}
