import * as pc from "playcanvas";
import { EventBus } from "./EventBus";

export class CamFly {
  private app: pc.Application;
  private camera: pc.Entity;
  private eulers: pc.Vec3;
  private moveSpeed: number = 10;
  private lookSpeed: number = 0.2;
  private isRunning: boolean = false;
  private mouseDown: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private uiFocused = false;

  constructor(app: pc.Application, camera: pc.Entity) {
    this.app = app;
    this.camera = camera;
    this.eulers = camera.getEulerAngles().clone();

    // Mouse events
    if (this.app.mouse) {
      this.app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
      this.app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
      this.app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    }

    // Keyboard events
    window.addEventListener("keydown", this.onKeyDown.bind(this));
    window.addEventListener("keyup", this.onKeyUp.bind(this));

    this.app.on("update", this.update, this);

    // Listen for UI focus events
    EventBus.on("ui:focus", (focused: boolean) => {
            this.uiFocused = focused;
    });
  }

  private keys: Record<string, boolean> = {};

  private onKeyDown(e: KeyboardEvent) {
    this.keys[e.code] = true;
  }
  private onKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  private onMouseDown(e: pc.MouseEvent) {
    if (e.button === 0) this.mouseDown = true;
    this.lastMouseX = e.x;
    this.lastMouseY = e.y;
  }
  private onMouseUp(e: pc.MouseEvent) {
    if (e.button === 0) this.mouseDown = false;
  }
  private onMouseMove(e: pc.MouseEvent) {
    if (this.mouseDown) {
      const dx = e.x - this.lastMouseX;
      const dy = e.y - this.lastMouseY;
      this.eulers.y -= dx * this.lookSpeed;
      this.eulers.x -= dy * this.lookSpeed;
      this.eulers.x = pc.math.clamp(this.eulers.x, -90, 90);
      this.lastMouseX = e.x;
      this.lastMouseY = e.y;
    }
  }

  private update(dt: number) {
    if (this.uiFocused) return; // Skip movement if UI is focused

    // Apply rotation
    this.camera.setEulerAngles(this.eulers);

    // Speed boost
    this.isRunning = this.keys["ShiftLeft"] || this.keys["ShiftRight"];
    const speed = this.isRunning ? this.moveSpeed * 2 : this.moveSpeed;

    // Movement
    if (this.keys["KeyW"]) this.camera.translate(this.camera.forward.clone().mulScalar(speed * dt));
    if (this.keys["KeyS"]) this.camera.translate(this.camera.forward.clone().mulScalar(-speed * dt));
    if (this.keys["KeyA"]) this.camera.translate(this.camera.right.clone().mulScalar(-speed * dt));
    if (this.keys["KeyD"]) this.camera.translate(this.camera.right.clone().mulScalar(speed * dt));
    if (this.keys["KeyE"]) this.camera.translate(this.camera.up.clone().mulScalar(speed * dt));
    if (this.keys["KeyQ"]) this.camera.translate(this.camera.up.clone().mulScalar(-speed * dt));
  }

  public destroy() {
    this.app.off("update", this.update, this);
    if (this.app.mouse) {
      this.app.mouse.off(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
      this.app.mouse.off(pc.EVENT_MOUSEUP, this.onMouseUp, this);
      this.app.mouse.off(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
    }
    window.removeEventListener("keydown", this.onKeyDown.bind(this));
    window.removeEventListener("keyup", this.onKeyUp.bind(this));
  }
}