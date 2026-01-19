import { Button } from "../core/Button.js";
import { StudioScene } from "./StudioScene.js";
import { GameScene } from "./GameScene.js";
import { LEVELS } from "../data/levels.js";

export class ResultScene {
  constructor(shared, sm, result){
    this.s = shared;
    this.sm = sm;
    this.r = result;

    const cx = 500, w = 240, h = 100, gap = 16, y0 = 360;

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

    // Load icons and button images
    this.uiIcons = {};
    this.uiIconsLoaded = false;
    this.buttonImages = {};
    this.buttonImagesLoaded = false;
    this.fontsLoaded = false;
    
    this.loadUIIcons();
    this.loadButtonImages();
    this.loadFonts();
  }

  async loadFonts() {
    try {
      const titleFont = new FontFace('TitleFont', 'url(ttf/titles.ttf)');
      await titleFont.load();
      document.fonts.add(titleFont);
      this.fontsLoaded = true;
    } catch (e) {
      this.fontsLoaded = false;
    }
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

  async loadButtonImages() {
    const buttonNames = ['replay', 'back'];
    const promises = [];
    
    buttonNames.forEach(name => {
      const img = new Image();
      promises.push(
        new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = `img/buttons/${name}.png`;
        })
      );
      this.buttonImages[name] = img;
    });
    
    await Promise.all(promises);
    this.buttonImagesLoaded = true;
  }

  update(dt){
    const input = this.s.input;
    this.btnRetry?.update(input);
    this.btnNext?.update(input);
    this.btnBack.update(input);
  }

  render(ctx){
    ctx.save();
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0,0,this.s.canvas.width,this.s.canvas.height);

    // Title
    ctx.fillStyle = this.r.win ? "#7CFC90" : "#FF6B6B";
    ctx.font = this.fontsLoaded ? "56px TitleFont" : "56px TitleFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(this.r.win ? "YOU WIN!" : "YOU LOSE", 640, 100);

    // Money earned with icon
    ctx.textAlign = "left";
    if (this.uiIconsLoaded && this.uiIcons['currency']) {
      ctx.drawImage(this.uiIcons['currency'], 450, 150, 36, 36);
      ctx.fillStyle = "#FFD700";
      ctx.font = this.fontsLoaded ? "28px DefaultFont" : "28px DefaultFont, sans-serif";
      ctx.fillText(`+${this.r.earned}`, 500, 180);
    } else {
      ctx.fillStyle = "#FFD700";
      ctx.font = this.fontsLoaded ? "26px DefaultFont" : "26px DefaultFont, sans-serif";
      ctx.fillText(`Money earned: ${this.r.earned}`, 450, 180);
    }

    // Scores with icon
    ctx.fillStyle = "#f2f2f2";
    ctx.font = this.fontsLoaded ? "22px DefaultFont" : "22px DefaultFont, sans-serif";
    
    if (this.uiIconsLoaded && this.uiIcons['score']) {
      ctx.drawImage(this.uiIcons['score'], 420, 230, 32, 32);
      ctx.fillText(`Your score: ${this.r.playerScore}`, 470, 258);
      ctx.fillText(`Enemy score: ${this.r.enemyScore}`, 470, 300);
    } else {
      ctx.fillText(`Your score: ${this.r.playerScore}`, 420, 258);
      ctx.fillText(`Enemy score: ${this.r.enemyScore}`, 420, 300);
    }

    // Buttons with images
    if (this.buttonImagesLoaded) {
      // Next/Retry button (use play image)
      if (this.btnNext && this.buttonImages['replay']) {
        const rect = this.btnNext.rect;
        ctx.drawImage(this.buttonImages['replay'], rect.x, rect.y, rect.w, rect.h);
      } else if (this.btnRetry && this.buttonImages['replay']) {
        const rect = this.btnRetry.rect;
        ctx.drawImage(this.buttonImages['replay'], rect.x, rect.y, rect.w, rect.h);
      } else {
        this.btnRetry?.render(ctx);
        this.btnNext?.render(ctx);
      }

      // Back button
      if (this.buttonImages['back']) {
        const rect = this.btnBack.rect;
        ctx.drawImage(this.buttonImages['back'], rect.x, rect.y, rect.w, rect.h);
      } else {
        this.btnBack.render(ctx);
      }
    } else {
      this.btnRetry?.render(ctx);
      this.btnNext?.render(ctx);
      this.btnBack.render(ctx);
    }

    ctx.restore();
  }
}