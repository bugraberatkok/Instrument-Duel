import { Button } from "../core/Button.js";
import { StudioScene } from "./StudioScene.js";
import { GameScene } from "./GameScene.js";
import { LEVELS } from "../data/levels.js";

export class ResultScene {
  constructor(shared, sm, result){
    this.s = shared;
    this.sm = sm;
    this.r = result;

    const cx = 360, w = 240, h = 48, gap = 12, y0 = 270;

    if (this.r.win){
      this.btnNext = new Button(cx, y0, w, h, "Next", () => {
        const next = Math.min(this.r.levelIndex + 1, LEVELS.length - 1);
        this.sm.set(new GameScene(this.s, this.sm, next));
      });
      this.btnRetry = null;
    } else {
      this.btnRetry = new Button(cx, y0, w, h, "Retry", () => {
        this.sm.set(new GameScene(this.s, this.sm, this.r.levelIndex));
      });
      this.btnNext = null;
    }

    this.btnBack = new Button(cx, y0 + (h+gap), w, h, "Back to Studio", () => {
      this.sm.set(new StudioScene(this.s, this.sm));
    });
  }

  update(dt){
    const input = this.s.input;
    this.btnRetry?.update(input);
    this.btnNext?.update(input);
    this.btnBack.update(input);
  }

  render(ctx){
    ctx.save();
    ctx.fillStyle = "#121212";
    ctx.fillRect(0,0,this.s.canvas.width,this.s.canvas.height);

    ctx.fillStyle = "#f2f2f2";
    ctx.font = "30px sans-serif";
    ctx.fillText(this.r.win ? "YOU WIN!" : "YOU LOSE", 390, 170);

    ctx.font = "18px sans-serif";
    ctx.fillText(`Money earned: ${this.r.earned}`, 20, 30);
    ctx.fillText(`Your score: ${this.r.playerScore}`, 390, 210);
    ctx.fillText(`Enemy score: ${this.r.enemyScore}`, 390, 235);

    this.btnRetry?.render(ctx);
    this.btnNext?.render(ctx);
    this.btnBack.render(ctx);

    ctx.restore();
  }
}
