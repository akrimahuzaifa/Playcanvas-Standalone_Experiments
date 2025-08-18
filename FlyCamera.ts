import * as pc from "playcanvas";

// Minimal input system for demo purposes
export class InputPresenter {
  private keyState: Record<string, boolean> = {};
  private mouseDelta = { dx: 0, dy: 0 };
  private lastMouse = { x: 0, y: 0 };
  private mouseDown = false;

  constructor(canvas: HTMLCanvasElement) {
    window.addEventListener("keydown", (e) => (this.keyState[e.code] = true));
    window.addEventListener("keyup", (e) => (this.keyState[e.code] = false));
    canvas.addEventListener("mousedown", () => (this.mouseDown = true));
    canvas.addEventListener("mouseup", () => (this.mouseDown = false));
    canvas.addEventListener("mousemove", (e) => {
      if (this.mouseDown) {
        this.mouseDelta.dx = e.movementX;
        this.mouseDelta.dy = e.movementY;
      } else {
        this.mouseDelta.dx = 0;
        this.mouseDelta.dy = 0;
      }
    });
  }

  isKeyPressed(code: string) {
    return !!this.keyState[code];
  }
  isMouseButtonDown(btn: number) {
    return this.mouseDown && btn === 0;
  }
  getMouseDelta() {
    const delta = { ...this.mouseDelta };
    this.mouseDelta.dx = 0;
    this.mouseDelta.dy = 0;
    return delta;
  }
  getKeyBindings() {
    return {
      forward: "KeyW",
      backward: "KeyS",
      left: "KeyA",
      right: "KeyD",
      up: "KeyQ",
      down: "KeyE",
      speedFast: "ShiftLeft",
    };
  }
  getTouchDelta() {
    return { pinch: 0 };
  }
}

export class FlyCamera {
  private app: pc.Application;
  public cameraEntity: pc.Entity;
  private eulers: pc.Vec3;
  private moveSpeed: number;
  private lookSpeed: number;
  private zoomSpeed: number;
  private isRunning: boolean = false;
  private input: InputPresenter;

  constructor(
    app: pc.Application,
    entity: pc.Entity,
    input: InputPresenter,
    moveSpeed = 20,
    lookSpeed = 0.2,
    zoomSpeed = 10
  ) {
    this.app = app;
    this.cameraEntity = entity;
    this.eulers = entity.getEulerAngles().clone();
    this.moveSpeed = moveSpeed;
    this.lookSpeed = lookSpeed;
    this.zoomSpeed = zoomSpeed;
    this.input = input;
    this.app.on("update", this.update, this);
  }

  public update(dt: number): void {
    this.cameraEntity.setEulerAngles(this.eulers);

    const bindings = this.input.getKeyBindings();
    this.isRunning =
      this.input.isKeyPressed("ShiftLeft") ||
      this.input.isKeyPressed("ShiftRight") ||
      this.input.isKeyPressed(bindings.speedFast);

    const currentSpeed = this.isRunning ? this.moveSpeed * 2 : this.moveSpeed;
    const forward = this.cameraEntity.forward.clone().mulScalar(currentSpeed * dt);
    const right = this.cameraEntity.right.clone().mulScalar(currentSpeed * dt);
    const up = this.cameraEntity.up.clone().mulScalar(currentSpeed * dt);

    if (this.input.isKeyPressed(bindings.forward)) this.cameraEntity.translate(forward);
    if (this.input.isKeyPressed(bindings.backward)) this.cameraEntity.translate(forward.clone().mulScalar(-1));
    if (this.input.isKeyPressed(bindings.left)) this.cameraEntity.translate(right.clone().mulScalar(-1));
    if (this.input.isKeyPressed(bindings.right)) this.cameraEntity.translate(right);
    if (this.input.isKeyPressed(bindings.up)) this.cameraEntity.translate(up);
    if (this.input.isKeyPressed(bindings.down)) this.cameraEntity.translate(up.clone().mulScalar(-1));

    const { dx, dy } = this.input.getMouseDelta();
    if (this.input.isMouseButtonDown(0)) {
      this.eulers.y -= dx * this.lookSpeed;
      this.eulers.x -= dy * this.lookSpeed;
      this.eulers.x = pc.math.clamp(this.eulers.x, -90, 90);
    }

    const { pinch } = this.input.getTouchDelta();
    if (pinch !== 0) {
      const zoomAmount = -pinch * this.zoomSpeed;
      const forwardZoom = this.cameraEntity.forward.clone().mulScalar(zoomAmount);
      this.cameraEntity.translate(forwardZoom);
    }
  }
}