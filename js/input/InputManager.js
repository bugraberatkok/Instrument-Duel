export class InputManager {
  constructor(canvas){
    this.canvas = canvas;
    this.mouse = { x:0, y:0, down:false, justDown:false, justUp:false };
    this.keys = new Set();
    this.justPressed = new Set();

    canvas.addEventListener("mousemove",(e)=>{
      const r = canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - r.left) * (canvas.width / r.width);
      this.mouse.y = (e.clientY - r.top) * (canvas.height / r.height);
    });

    canvas.addEventListener("mousedown",()=>{
      this.mouse.down = true;
      this.mouse.justDown = true;
    });

    window.addEventListener("mouseup",()=>{
      this.mouse.down = false;
      this.mouse.justUp = true;
    });

    window.addEventListener("keydown",(e)=>{
      if (!this.keys.has(e.key)) this.justPressed.add(e.key);
      this.keys.add(e.key);
    });

    window.addEventListener("keyup",(e)=>{
      this.keys.delete(e.key);
    });
  }

  wasJustPressed(key){
    return this.justPressed.has(key);
  }

  endFrame(){
    this.mouse.justDown = false;
    this.mouse.justUp = false;
    this.justPressed.clear();
  }
}
