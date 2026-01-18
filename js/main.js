import { Game } from "./game/Game.js";

let game;

function main(){
  const canvas = document.getElementById("game");
  game = new Game(canvas);
  game.start();
  requestAnimationFrame(loop);
}

let last = performance.now();
function loop(now){
  const dt = (now - last) / 1000;
  last = now;

  game.update(dt);
  game.render();

  requestAnimationFrame(loop);
}

main();
