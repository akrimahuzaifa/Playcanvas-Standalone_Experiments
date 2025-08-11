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

// Initialize Measurement Presenter
const measurementPresenter = new MeasurementPresenter(app, camera, plane);

// Optional: Add keyboard shortcut to clear measurements
if (window) {
    window.addEventListener('keydown', (event) => {
        if (event.key === 'c' || event.key === 'C') {
            measurementPresenter.clearMeasurements();
        }
    });
}

importGltfModel(app, "/models/policestation.glb", "policestation.glb");

app.start();
