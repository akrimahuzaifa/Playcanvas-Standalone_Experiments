import * as pc from "playcanvas";

export class WalkCamera {
    private app: pc.Application;
    private camera: pc.Entity;
    private eulers: pc.Vec3;
    private moveSpeed: number;
    private lookSensitivity: number;
    private jumpForce: number;
    private mouseDown: boolean = false;
    private lastMouseX: number = 0;
    private lastMouseY: number = 0;
    private keys: Record<string, boolean> = {};
    private grounded: boolean = false;
    private velocityY: number = 0;

    constructor(app: pc.Application, camera: pc.Entity, moveSpeed = 5, lookSensitivity = 0.2, jumpForce = 5) {
        this.app = app;
        this.camera = camera;
        this.eulers = camera.getEulerAngles().clone();
        this.moveSpeed = moveSpeed;
        this.lookSensitivity = lookSensitivity;
        this.jumpForce = jumpForce;

        // Add collision and rigidbody if not present
        if (!camera.collision) {
            camera.addComponent('collision', { type: 'capsule', radius: 0.5, height: 1.8 });
        }
        if (!camera.rigidbody) {
            camera.addComponent('rigidbody', { type: 'dynamic', mass: 1 });
        }

        if (camera.collision && camera.rigidbody) {
            // Listen for collision events to detect ground
            camera.collision.on('collisionstart', this.onCollisionStart, this);
            camera.collision.on('collisionend', this.onCollisionEnd, this);
        }
        // Keyboard events
        window.addEventListener("keydown", (e) => this.keys[e.code] = true);
        window.addEventListener("keyup", (e) => this.keys[e.code] = false);

        // Mouse events
        if (app.mouse) {
            app.mouse.on(pc.EVENT_MOUSEDOWN, this.onMouseDown, this);
            app.mouse.on(pc.EVENT_MOUSEUP, this.onMouseUp, this);
            app.mouse.on(pc.EVENT_MOUSEMOVE, this.onMouseMove, this);
        }

        // Prevent context menu on right click
        //app.graphicsDevice.canvas.addEventListener("contextmenu", (e) => e.preventDefault());

        app.on("update", this.update, this);
    }

    private onMouseDown = (e: pc.MouseEvent) => {
        if (e.button === 2) { // Right mouse button for look
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
            this.eulers.y -= dx * this.lookSensitivity;
            this.eulers.x -= dy * this.lookSensitivity;
            this.eulers.x = pc.math.clamp(this.eulers.x, -90, 90);
            this.lastMouseX = e.x;
            this.lastMouseY = e.y;
        }
    };

    private update = (dt: number) => {
        this.camera.setEulerAngles(this.eulers);

        // Movement
        let speed = this.moveSpeed;
        if (this.keys["ShiftLeft"] || this.keys["ShiftRight"]) speed *= 2;

        const forward = this.camera.forward.clone();
        forward.y = 0;
        forward.normalize();

        const right = this.camera.right.clone();
        right.y = 0;
        right.normalize();

        let move = new pc.Vec3();
        if (this.keys["KeyW"]) move.add(forward);
        if (this.keys["KeyS"]) move.sub(forward);
        if (this.keys["KeyA"]) move.sub(right);
        if (this.keys["KeyD"]) move.add(right);
        
        if (this.camera.collision && this.camera.rigidbody){
            if (move.lengthSq() > 0) {
                move.normalize().mulScalar(speed);
                // Set velocity, keep Y velocity for gravity/jump
                const vel = this.camera.rigidbody.linearVelocity;
                this.camera.rigidbody.linearVelocity = new pc.Vec3(move.x, vel.y, move.z);
            } else {
                // Only keep Y velocity if no input
                const vel = this.camera.rigidbody.linearVelocity;
                this.camera.rigidbody.linearVelocity = new pc.Vec3(0, vel.y, 0);
            }
    
            // Jump
            if (this.keys["Space"] && this.grounded) {
                this.camera.rigidbody.applyImpulse(0, this.jumpForce, 0);
                this.grounded = false;
            }
        }
    };

    public destroy() {
        this.app.off("update", this.update, this);
        // Remove event listeners if needed
    }

    private onCollisionStart = (result: any) => {
        if (result.other) {
            this.grounded = true;
        }
    };

    private onCollisionEnd = (result: any) => {
        if (result.other) {
            this.grounded = false;
        }
    };
}