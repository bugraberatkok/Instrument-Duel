import { SceneManager } from "./SceneManager.js";
import { InputManager } from "../input/InputManager.js";
import { PlayerProfile } from "../meta/PlayerProfile.js";
import { MainMenuScene } from "../scenes/MainMenuScene.js";
import { AudioEngine } from "../audio/AudioEngine.js";

export class Game {
  constructor(canvas){
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.input = new InputManager(canvas);
    this.scenes = new SceneManager();

    this.profile = PlayerProfile.load();

    this.audio = new AudioEngine();

    this.shared = {
      canvas,
      ctx: this.ctx,
      input: this.input,
      profile: this.profile,
      audio: this.audio
    };
  }

  start(){
    this.scenes.set(new MainMenuScene(this.shared, this.scenes));
  }

  update(dt){
    // WebAudio autoplay policy unlock
    if (this.input.mouse.justDown){
      this.audio.ensure();
    }

    this.scenes.update(dt);
    this.input.endFrame();
  }

  render(){
    const ctx = this.ctx;
    ctx.clearRect(0,0,this.canvas.width,this.canvas.height);
    this.scenes.render(ctx);
  }
}
