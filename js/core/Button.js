import { Rect } from "./Rect.js";

export class Button {
  constructor(x,y,w,h,label,onClick){
    this.rect = new Rect(x,y,w,h);
    this.label = label;
    this.onClick = onClick;
    this.enabled = true;
  }

  update(input){
    if (!this.enabled) return;
    if (input.mouse.justDown && this.rect.contains(input.mouse.x, input.mouse.y)){
      this.onClick?.();
    }
  }

  render(ctx){
    ctx.save();
    ctx.globalAlpha = this.enabled ? 1 : 0.45;
    ctx.fillStyle = "#e7e7e7";
    ctx.fillRect(this.rect.x, this.rect.y, this.rect.w, this.rect.h);
    ctx.fillStyle = "#111";
    ctx.font = "18px sans-serif";
    ctx.fillText(this.label, this.rect.x + 14, this.rect.y + 30);
    ctx.restore();
  }
}
