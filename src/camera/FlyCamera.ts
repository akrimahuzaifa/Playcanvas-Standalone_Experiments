import * as pc from "playcanvas";

export class FlyCamera {
    private app: pc.Application;
    private camera: pc.Entity;
    private eulers: pc.Vec3;
    private moveSpeed: number;
    private lookSpeed: number;
    private zoomSpeed: number;
    private mouseDown: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private keys: Record<string, boolean> = {};

    constructor(app: pc.Application, camera: pc.Entity, moveSpeed = 20, lookSpeed = 0.2, zoomSpeed = 10) {
        this.app = app;
        this.camera = camera;
        this.eulers = camera.getEulerAngles().clone();
        this.moveSpeed = moveSpeed;
        this.lookSpeed = lookSpeed;
        this.zoomSpeed = zoomSpeed;

        // Keyboard events
        window.addEventListener("keydown", (e) => this.keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.keys[e.code] = false);

        // Mouse events
        if (app.mouse) {
            app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
            app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
            app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
            app.mouse.on(pc.EVENT_MOUSEWHEEL, this.onMouseWheel, this);
        }

        app.on("update", this.update, this);
    }

    private onMouseDown = (e: pc.MouseEvent) => {
        if (e.button === 2) {
            this.mouseDown = true;
            this.lastMouseX = e.x;
            this.lastMouseY = e.y;
        }
    };

    private onMouseUp = (e: pc.MouseEvent) => {
        if (e.button === 2) {
            this.mouseDown = false;
        }
    };

    private onMouseMove = (e: pc.MouseEvent) => {
        if (this.mouseDown) {
            const dx = e.x - this.lastMouseX;
            const dy = e.y - this.lastMouseY;
            this.eulers.y -= dx * this.lookSpeed;
            this.eulers.x -= dy * this.lookSpeed;
            this.eulers.x = pc.math.clamp(this.eulers.x, -90, 90);
            this.lastMouseX = e.x;
            this.lastMouseY = e.y;
        }
    };

    private onMouseWheel = (e: pc.MouseEvent) => {
        const forward = this.camera.forward.clone().mulScalar(-e.wheelDelta * this.zoomSpeed * 0.1);
        this.camera.translate(forward);
    };

    private update = (dt: number) => {
        this.camera.setEulerAngles(this.eulers);

        let speed = this.moveSpeed;
        if (this.keys["ShiftLeft"] || this.keys["ShiftRight"]) speed *= 2;

        const forward = this.camera.forward.clone().mulScalar(speed * dt);
        const right = this.camera.right.clone().mulScalar(speed * dt);
        const up = this.camera.up.clone().mulScalar(speed * dt);

        if (this.keys["KeyW"]) this.camera.translate(forward);
        if (this.keys["KeyS"]) this.camera.translate(forward.clone().mulScalar(-1));
        if (this.keys["KeyA"]) this.camera.translate(right.clone().mulScalar(-1));
        if (this.keys["KeyD"]) this.camera.translate(right);
        if (this.keys["KeyQ"]) this.camera.translate(up.clone().mulScalar(-1));
        if (this.keys["KeyE"]) this.camera.translate(up);
    };

    public destroy() {
        this.app.off("update", this.update, this);
        // Remove event listeners if needed
    }
}