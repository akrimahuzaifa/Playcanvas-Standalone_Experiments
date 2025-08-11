import * as pc from 'playcanvas';
import { MeasurementPresenter } from './measurementpresenter';
import { importGltfModel } from "./ImportExportManager";

const canvas = document.getElementById('application-canvas') as HTMLCanvasElement;
const app = new pc.Application(canvas, { mouse: new pc.Mouse(canvas),graphicsDeviceOptions: { antialias: true } });
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.setCanvasResolution(pc.RESOLUTION_AUTO);

// Camera
const camera = new pc.Entity();
camera.addComponent('camera', { 
    clearColor: new pc.Color(0.4, 0.6, 0.8), 
    fov: 60, 
    nearClip: 0.1, 
    farClip: 500
});
camera.setPosition(0, 60, 150);
camera.lookAt(0, 0, 0);
app.root.addChild(camera);

// Light
const light = new pc.Entity();
light.addComponent('light', { type: 'directional', intensity: 1 });
light.setLocalEulerAngles(45, 30, 0);
app.root.addChild(light);

// Plane
const plane = new pc.Entity();
plane.addComponent('render', { type: 'plane' });
plane.setLocalScale(300, 1, 200);
app.root.addChild(plane);

// Store reference to imported model
let importedModel: pc.Entity | null = null;

// Track current measurement target (plane by default)
let currentTarget: pc.Entity = plane;

// Initialize Measurement Presenter (will update target later)
let measurementPresenter: MeasurementPresenter | null = null;

// Keyboard shortcuts
if (window) {
    window.addEventListener('keydown', (event) => {
        if ((event.key === 'c' || event.key === 'C') && measurementPresenter) {
            measurementPresenter.clearMeasurements();
        }
        // Toggle target with T
        if ((event.key === 't' || event.key === 'T') && measurementPresenter && importedModel) {
            currentTarget = (currentTarget === plane) ? importedModel : plane;
            measurementPresenter.setTarget(currentTarget);
            console.log(`Measurement target switched to: ${currentTarget === plane ? "plane" : "model"}`);
        }
    });
}

// Import model and set as measurement target
importGltfModel(app, "/models/policestation.glb", "policestation.glb", (entity: pc.Entity) => {
    importedModel = entity;
    // Initialize MeasurementPresenter with the plane as the initial target
    measurementPresenter = new MeasurementPresenter(app, camera, currentTarget);
    // Optionally, you can notify the user how to switch targets
    console.log('Press "T" to toggle measurement target between plane and model.');
});

app.start();
