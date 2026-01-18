export class Rect {
  constructor(x,y,w,h){ this.x=x; this.y=y; this.w=w; this.h=h; }
  contains(px,py){
    return px>=this.x && px<=this.x+this.w && py>=this.y && py<=this.y+this.h;
  }
}
