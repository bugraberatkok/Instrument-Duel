import { Button } from "../core/Button.js";
import { StudioScene } from "./StudioScene.js";

export class MainMenuScene {
  constructor(shared, sm){
    this.s = shared;
    this.sm = sm;

    const cx = 540, cy = 280, w = 220, h = 80, gap = 20;

    this.btnPlay = new Button(cx, cy, w, h, "Play", () => {
      this.sm.set(new StudioScene(this.s, this.sm));
    });

    this.btnOptions = new Button(cx, cy + (h+gap), w, h, "Options", () => {
      alert("Options not implemented (yet).");
    });

    this.btnExit = new Button(cx, cy + 2*(h+gap), w, h, "Exit", () => {
      alert("Close the tab/window to exit.");
    });

    this.buttons = [this.btnPlay, this.btnOptions, this.btnExit];

    // Load button images
    this.buttonImages = {};
    this.buttonImagesLoaded = false;
    this.loadButtonImages();

    // Load UI icons
    this.uiIcons = {};
    this.uiIconsLoaded = false;
    this.loadUIIcons();

    // Load fonts
    this.fontsLoaded = false;
    this.loadFonts();
  }

  async loadFonts() {
    try {
      const titleFont = new FontFace('TitleFont', 'url(ttf/titles.ttf)');
      const defaultFont = new FontFace('DefaultFont', 'url(ttf/default.ttf)');
      
      await titleFont.load();
      await defaultFont.load();
      
      document.fonts.add(titleFont);
      document.fonts.add(defaultFont);
      
      this.fontsLoaded = true;
    } catch (e) {
      console.warn("Font loading failed", e);
      this.fontsLoaded = false;
    }
  }

  async loadButtonImages() {
    const buttonNames = ['play', 'options', 'exit'];
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

  async loadUIIcons() {
    const img = new Image();
    await new Promise((resolve) => {
      img.onload = () => resolve();
      img.onerror = () => resolve();
      img.src = 'img/icons/currency.png';
    });
    this.uiIcons['currency'] = img;
    this.uiIconsLoaded = true;
  }

  update(dt){
    for (const b of this.buttons) b.update(this.s.input);
  }

  render(ctx){
    ctx.save();
    
    // Background
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0, 0, this.s.canvas.width, this.s.canvas.height);

    // Title
    ctx.fillStyle = "#FFD700";
    ctx.font = this.fontsLoaded ? "48px TitleFont" : "48px TitleFont, sans-serif";
    ctx.fillText("INSTRUMENT DUEL", 240, 140);

    ctx.fillStyle = "#f2f2f2";
    ctx.font = this.fontsLoaded ? "18px DefaultFont" : "18px DefaultFont, sans-serif";
    ctx.fillText("mouse-based rhythm and clicker progression", 470, 205);

    // Money with icon
    if (this.uiIconsLoaded && this.uiIcons['currency']) {
      ctx.drawImage(this.uiIcons['currency'], 20, 8, 32, 32);
      ctx.fillStyle = "#f2f2f2";
      ctx.font = this.fontsLoaded ? "22px DefaultFont" : "22px DefaultFont, sans-serif";
      ctx.fillText(`${this.s.profile.money}`, 58, 32);
    } else {
      ctx.fillStyle = "#f2f2f2";
      ctx.font = this.fontsLoaded ? "22px DefaultFont" : "22px DefaultFont, sans-serif";
      ctx.fillText(`Money: ${this.s.profile.money}`, 20, 30);
    }

    // Buttons with images
    if (this.buttonImagesLoaded) {
      const buttonData = [
        { btn: this.btnPlay, img: 'play' },
        { btn: this.btnOptions, img: 'options' },
        { btn: this.btnExit, img: 'exit' }
      ];

      buttonData.forEach(data => {
        if (this.buttonImages[data.img]) {
          const rect = data.btn.rect;
          ctx.drawImage(this.buttonImages[data.img], rect.x, rect.y, rect.w, rect.h);
        } else {
          data.btn.render(ctx);
        }
      });
    } else {
      for (const b of this.buttons) b.render(ctx);
    }

    ctx.restore();
  }
}