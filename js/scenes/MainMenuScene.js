import { Button } from "../core/Button.js";
import { StudioScene } from "./StudioScene.js";

export class MainMenuScene {
  constructor(shared, sm){
    this.s = shared;
    this.sm = sm;

    const cx = 360, cy = 220, w = 240, h = 48, gap = 14;

    this.btnPlay = new Button(cx, cy, w, h, "Play", () => {
      this.sm.set(new StudioScene(this.s, this.sm));
    });

    this.btnOptions = new Button(cx, cy + (h+gap), w, h, "Options", () => {
      // minimal placeholder
      alert("Options not implemented (yet).");
    });

    this.btnExit = new Button(cx, cy + 2*(h+gap), w, h, "Exit", () => {
      
      alert("Close the tab/window to exit.");
    });

    this.buttons = [this.btnPlay, this.btnOptions, this.btnExit];
  }

  update(dt){
    for (const b of this.buttons) b.update(this.s.input);
  }

  render(ctx){
    ctx.save();
    ctx.fillStyle = "#f2f2f2";
    ctx.font = "42px sans-serif";
    ctx.fillText("Instrument Duel", 260, 140);

    ctx.font = "18px sans-serif";
    ctx.fillText("Mouse-based rhythm + clicker progression", 280, 175);

    // money
    ctx.fillText(`Money: ${this.s.profile.money}`, 20, 30);

    for (const b of this.buttons) b.render(ctx);
    ctx.restore();
  }
}
