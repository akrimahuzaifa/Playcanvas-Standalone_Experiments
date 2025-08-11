import * as pc from 'playcanvas';
import { ColorBufferPicker } from './ColorBufferPicker';

export class MeasurementPresenter {
    private app: pc.Application;
    private camera: pc.Entity;
    private plane: pc.Entity;
    private picker: ColorBufferPicker;

    constructor(app: pc.Application, camera: pc.Entity, plane: pc.Entity) {
        this.app = app;
        this.camera = camera;
        this.plane = plane;
        this.picker = new ColorBufferPicker(app, app.graphicsDevice.canvas, 400);
        
        this.setupMouseHandler();
    }


    private setupMouseHandler() {
        if (this.app.mouse) {
            this.app.mouse.on(pc.EVENT_MOUSEDOWN, (event: pc.MouseEvent) => {
                this.handleMouseClick(event);
            });
        }
    }

    private handleMouseClick(event: pc.MouseEvent) {
        const worldPos = this.picker.getWorldPos(event, this.camera, this.plane, 400);
        
        if (!worldPos) {
            console.log("🚫 You clicked outside the plane!");
            return;
        }

        // Create sphere at clicked position and save in const point
        const point = worldPos.clone();
        this.createSphere(point);
        console.log(`✅ Sphere created at: (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`);
    }

    private createSphere(position: pc.Vec3) {
        const sphere = new pc.Entity("ClickSphere");
        sphere.addComponent("render", { type: "sphere" });
        sphere.setLocalScale(2, 2, 2); // Increased size to be more visible
        sphere.setPosition(position.x, 0, position.z); // Y = 0 (plane level) so sphere is half above/half below
        
        const material = new pc.StandardMaterial();
        material.diffuse = new pc.Color(1, 0, 0); // Red sphere
        material.update();
        
        if (sphere.render) {
            sphere.render.material = material;
        }
        
        this.app.root.addChild(sphere);
    }

    public clearMeasurements() {
        // Remove all spheres
        const spheres = this.app.root.find((entity) => {
            return entity.name === "ClickSphere";
        }) as pc.Entity[];

        spheres.forEach(entity => {
            entity.destroy();
        });
        
        console.log("🧹 Spheres cleared");
    }

    public destroy() {
        this.clearMeasurements();
    }
}