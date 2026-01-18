export class SceneManager {
  constructor(){ this.current = null; }
  set(scene){
    this.current?.onExit?.();
    this.current = scene;
    this.current?.onEnter?.();
  }
  update(dt){ this.current?.update?.(dt); }
  render(ctx){ this.current?.render?.(ctx); }
}
