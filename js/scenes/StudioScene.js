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
    this.marketRect = new Rect(0, 0, this.s.canvas.width * 0.30, this.s.canvas.height);
    this.infoRect = new Rect(this.marketRect.w, 0, this.s.canvas.width - this.marketRect.w, this.s.canvas.height);

    // Buttons (right side)
    this.btnPlayLevel = new Button(this.infoRect.x + 40, 310, 200, 100, "Play Level", () => {
      this.sm.set(new GameScene(this.s, this.sm, this.levelIndex));
    });

    this.btnBack = new Button(this.infoRect.x + 40, 420, 200, 100, "Back to Main Menu", () => {
      this.sm.set(new MainMenuScene(this.s, this.sm));
    });

    // Market buttons (left side)
    this.marketButtons = [];
    this.buildMarketButtons();

    // Load fonts
    this.fontsLoaded = false;
    this.loadFonts();

    // Load upgrade icons
    this.upgradeIcons = {};
    this.iconsLoaded = false;
    
    // UI icons (score, currency)
    this.uiIcons = {};
    this.uiIconsLoaded = false;
    
    // Button images
    this.buttonImages = {};
    this.buttonImagesLoaded = false;
    
    // Character images
    this.characterImages = {};
    this.characterImagesLoaded = false;
    
    // Background images
    this.backgroundImages = {};
    this.backgroundImagesLoaded = false;
    
    // Character animation
    this.animTimer = 0;
    this.animFrame = 0; // 0 = riff-kid, 1 = riff-kid-play
    this.animSpeed = 0.5; // Her 0.5 saniyede bir değişir (daha hızlı için 0.3 yap)
    
    this.loadIcons();
    this.loadUIIcons();
    this.loadButtonImages();
    this.loadCharacterImages();
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
    const buttonNames = ['play', 'back', 'duel', 'exit', 'options', 'buy', 'upgrade'];
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

  async loadCharacterImages() {
    const characterNames = ['riff-kid', 'riff-kid-play'];
    const promises = [];
    
    characterNames.forEach(name => {
      const img = new Image();
      promises.push(
        new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = `img/characters/${name}.png`;
        })
      );
      this.characterImages[name] = img;
    });
    
    await Promise.all(promises);
    this.characterImagesLoaded = true;
  }

  async loadBackgroundImages() {
    const backgroundNames = ['bgOffbeatGhost', 'bgSustainQueen', 'bgRiffKid'];
    const promises = [];
    
    backgroundNames.forEach(name => {
      const img = new Image();
      promises.push(
        new Promise((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = `img/backgrounds/${name}.png`;
        })
      );
      this.backgroundImages[name] = img;
    });
    
    await Promise.all(promises);
    this.backgroundImagesLoaded = true;
  }

  getBackgroundForLevel(levelIndex) {
    const backgrounds = ['bgOffbeatGhost', 'bgSustainQueen', 'bgRiffKid'];
    return backgrounds[levelIndex] || null;
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
      console.warn("Font loading failed, using fallback", e);
      this.fontsLoaded = false;
    }
  }

  async loadIcons() {
    const promises = [];
    
    UPGRADES.forEach(u => {
      for (let level = 0; level <= u.maxLevel; level++) {
        const iconName = u.getIcon ? u.getIcon(level) : u.icon;
        if (!this.upgradeIcons[iconName]) {
          const img = new Image();
          promises.push(
            new Promise((resolve) => {
              img.onload = () => resolve();
              img.onerror = () => resolve(); // Continue even if image fails
              img.src = `img/power-ups/${iconName}`;
            })
          );
          this.upgradeIcons[iconName] = img;
        }
      }
    });
    
    await Promise.all(promises);
    this.iconsLoaded = true;
  }

  buildMarketButtons(){
    this.marketButtons = [];
    const x = 18, y0 = 110, w = this.marketRect.w - 36;
    const itemHeight = 120;
    const gap = 16;

    UPGRADES.forEach((u, i) => {
      const currentLevel = this.s.profile.getUpgradeLevel(u.id);
      const nextLevel = currentLevel + 1;
      const maxed = currentLevel >= u.maxLevel;
      
      // Button her zaman oluştur ama yeterli para yoksa disabled hale getir
      const btnY = y0 + i * itemHeight + 65;
      const btnW = 52;   // Kare ve küçük
      const btnH = 36;   // Kare ve küçük
      
      const btn = new Button(x + 70, btnY, btnW, btnH, "", () => {
        this.tryBuyOrUpgrade(u.id);
      });
      this.marketButtons.push(btn);
    });
  }

  tryBuyOrUpgrade(upgradeId){
    const u = UPGRADES.find(z => z.id === upgradeId);
    if (!u) return;

    const currentLevel = this.s.profile.getUpgradeLevel(upgradeId);
    if (currentLevel >= u.maxLevel) return; // Already maxed

    const nextLevel = currentLevel + 1;
    const cost = u.getCost(nextLevel);

    if (this.s.profile.money < cost) return; // Not enough money

    this.s.profile.money -= cost;
    this.s.profile.setUpgradeLevel(upgradeId, nextLevel);
    this.s.profile.save();

    // Rebuild buttons to update labels
    this.buildMarketButtons();
  }

  update(dt){
    const input = this.s.input;

    // Character animation update
    this.animTimer += dt;
    if (this.animTimer >= this.animSpeed) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2; // 0 <-> 1 arası değişir
    }

    // Level selection with arrows (only if unlocked allows)
    if (input.wasJustPressed("ArrowLeft")){
      this.levelIndex = Math.max(0, this.levelIndex - 1);
    }
    if (input.wasJustPressed("ArrowRight")){
      const maxSelectable = this.s.profile.unlockedLevel;
      this.levelIndex = Math.min(maxSelectable, Math.min(LEVELS.length - 1, this.levelIndex + 1));
    }

    // disable play if locked
    this.btnPlayLevel.enabled = this.levelIndex <= this.s.profile.unlockedLevel;

    // Update buttons
    this.btnPlayLevel.update(input);
    this.btnBack.update(input);

    for (let i = 0; i < this.marketButtons.length; i++){
      const u = UPGRADES[i];
      const btn = this.marketButtons[i];

      const currentLevel = this.s.profile.getUpgradeLevel(u.id);
      const maxed = currentLevel >= u.maxLevel;
      const cost = u.getCost(currentLevel + 1);

      btn.enabled = !maxed && this.s.profile.money >= cost;
      btn.update(input);
    }
  }

  render(ctx){
    ctx.save();

    // Background split
    ctx.fillStyle = "#0a0a0a";
    ctx.fillRect(0,0,this.s.canvas.width,this.s.canvas.height);

    // Market column
    ctx.fillStyle = "#151515";
    ctx.fillRect(this.marketRect.x, this.marketRect.y, this.marketRect.w, this.marketRect.h);

    // Market title with currency icon
    ctx.fillStyle = "#FFD700";
    ctx.font = this.fontsLoaded ? "32px TitleFont" : "32px sans-serif";
    ctx.fillText("MARKET", 24, 50);

    // Money display with icon
    ctx.fillStyle = "#f2f2f2";
    ctx.font = this.fontsLoaded ? "20px DefaultFont" : "20px sans-serif";
    
    if (this.uiIconsLoaded && this.uiIcons['currency']) {
      ctx.drawImage(this.uiIcons['currency'], 24, 78, 28, 28);
      ctx.fillText(`${this.s.profile.money}`, 60, 100);
    } else {
      ctx.fillText(`Money: ${this.s.profile.money}`, 24, 85);
    }

    // Render upgrade items with icons
    const iconX = 24;
    const itemHeight = 120;
    const baseY = 130; // Aşağı taşındı
    const gap = 16;
    const boxPadding = 8;
    const boxWidth = this.marketRect.w - 36;

    for (let i = 0; i < UPGRADES.length; i++){
      const u = UPGRADES[i];
      const currentLevel = this.s.profile.getUpgradeLevel(u.id);
      const itemY = baseY + i * itemHeight;

      // Kutu çiz
      ctx.fillStyle = "#222";
      ctx.strokeStyle = "#444";
      ctx.lineWidth = 2;
      ctx.fillRect(18, itemY - boxPadding, boxWidth, itemHeight - gap);
      ctx.strokeRect(18, itemY - boxPadding, boxWidth, itemHeight - gap);

      // Spesifik ikon boyutu ayarı
      let iconSize = 56;
      if (u.id === "combo_boost") iconSize = 50; // combo boost icon slightly smaller

      // Icon (larger and centered)
      const iconName = u.getIcon ? u.getIcon(currentLevel) : u.icon;
      if (this.iconsLoaded && this.upgradeIcons[iconName]) {
        ctx.drawImage(this.upgradeIcons[iconName], iconX, itemY, iconSize, iconSize);
      } else {
        // Fallback colored box
        ctx.fillStyle = "#333";
        ctx.fillRect(iconX, itemY, iconSize, iconSize);
      }

      // Text area (to the right of icon)
      const textX = iconX + iconSize + 12;
      
      // Name and level - UPPERCASE
      ctx.fillStyle = currentLevel > 0 ? "#7CFC90" : "#f2f2f2";
      ctx.font = this.fontsLoaded ? "15px DefaultFont" : "15px DefaultFont, sans-serif";
      const levelText = currentLevel > 0 ? ` [Lv${currentLevel}]` : "";
      ctx.fillText(`${u.name.toUpperCase()}${levelText}`, textX, itemY + 18);

      // Description - küçük
      ctx.fillStyle = "#aaa";
      ctx.font = this.fontsLoaded ? "11px DefaultFont" : "11px DefaultFont, sans-serif";
      if (currentLevel > 0) {
        ctx.fillText(u.getLevelDesc(currentLevel), textX, itemY + 36);
      } else {
        ctx.fillText(u.baseDesc, textX, itemY + 36);
      }

      // Button - image or price
      const nextLevel = currentLevel + 1;
      const cost = u.getCost(nextLevel);
      const maxed = currentLevel >= u.maxLevel;
      const hasEnoughMoney = this.s.profile.money >= cost;
      
      if (!maxed) {
        const btn = this.marketButtons[i];
        const btnType = currentLevel === 0 ? "buy" : "upgrade";
        
        // Eğer yeterli parası varsa buton göster
        if (hasEnoughMoney) {
          if (this.buttonImagesLoaded && this.buttonImages[btnType]) {
            ctx.drawImage(this.buttonImages[btnType], btn.rect.x, btn.rect.y, btn.rect.w, btn.rect.h);
          } else {
            btn.render(ctx);
          }
        } else {
          // Yeterli parası yoksa sadece fiyat göster
          ctx.fillStyle = "#FF6B6B";
          ctx.font = this.fontsLoaded ? "12px DefaultFont" : "12px DefaultFont, sans-serif";
          ctx.fillText(`${cost}`, btn.rect.x + 5, btn.rect.y + 22);
        }
      } else {
        // MAX
        ctx.fillStyle = "#888";
        ctx.font = this.fontsLoaded ? "12px DefaultFont" : "12px DefaultFont, sans-serif";
        ctx.fillText("MAX", this.marketButtons[i].rect.x + 10, this.marketButtons[i].rect.y + 22);
      }
    }

    // Right info panel
    const level = LEVELS[this.levelIndex];

    ctx.fillStyle = "#FFD700";
    ctx.font = this.fontsLoaded ? "36px TitleFont" : "36px TitleFont, sans-serif";
    ctx.fillText("STUDIO", this.infoRect.x + 40, 60);

    // Level selector UI
    ctx.fillStyle = "#f2f2f2";
    ctx.font = this.fontsLoaded ? "18px DefaultFont" : "18px DefaultFont, sans-serif";
    ctx.fillText("Use LEFT/RIGHT arrows to change level", this.infoRect.x + 40, 110);

    ctx.font = this.fontsLoaded ? "28px DefaultFont" : "28px TitleFont, sans-serif";
    ctx.fillStyle = "#00CED1";
    ctx.fillText(`${level.name} - ${level.enemyName}`, this.infoRect.x + 40, 175);

    ctx.font = this.fontsLoaded ? "20px DefaultFont" : "20px DefaultFont, sans-serif";
    ctx.fillStyle = "#f2f2f2";
    ctx.fillText(`Expected score: ${level.expectedScore}`, this.infoRect.x + 40, 210);

    ctx.font = this.fontsLoaded ? "16px DefaultFont" : "16px DefaultFont, sans-serif";
    ctx.fillStyle = "#888";
    ctx.fillText(`Unlocked up to: Level ${this.s.profile.unlockedLevel + 1}`, this.infoRect.x + 40, 240);

    // ANIMATED RIFF KID CHARACTER
    if (this.characterImagesLoaded) {
      const charName = this.animFrame === 0 ? 'riff-kid' : 'riff-kid-play';
      const charImg = this.characterImages[charName];
      
      if (charImg && charImg.complete) {
        var scale = 0.2;
        const charWidth = scale * charImg.width;  // Karakter boyutu
        const charHeight = scale * charImg.height;
        const charX = this.infoRect.x + (this.infoRect.w - charWidth) / 2 + 50; // Ortalanmış
        const charY = 280; // Y pozisyonu
        
        ctx.drawImage(charImg, charX, charY, charWidth, charHeight);
      }
    }

    // Buttons with images
    if (this.buttonImagesLoaded) {
      // Play button
      if (this.buttonImages['duel']) {
        const playBtn = this.btnPlayLevel.rect;
        ctx.globalAlpha = this.btnPlayLevel.enabled ? 1 : 0.5;
        ctx.drawImage(this.buttonImages['duel'], playBtn.x, playBtn.y, playBtn.w, playBtn.h);
        ctx.globalAlpha = 1;
      } else {
        this.btnPlayLevel.render(ctx);
      }

      // Back button
      if (this.buttonImages['back']) {
        const backBtn = this.btnBack.rect;
        ctx.drawImage(this.buttonImages['back'], backBtn.x, backBtn.y, backBtn.w, backBtn.h);
      } else {
        this.btnBack.render(ctx);
      }
    } else {
      // Fallback rendering
      this.btnPlayLevel.render(ctx);
      this.btnBack.render(ctx);
    }

    ctx.restore();
  }
}