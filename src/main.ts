import * as pc from 'playcanvas';
import { MeasurementPresenter } from './measurement_tool/MeasurementPresenter';
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
//plane.addComponent("collision", { type: "box", halfExtents: new pc.Vec3(200, 0.1, 200) });
//plane.addComponent('rigidbody', { type: 'static' });
plane.setLocalScale(200, 1, 200);
app.root.addChild(plane);

// Initialize MeasurementPresenter right away
const measurementPresenter = new MeasurementPresenter(app, camera, plane);

// Import model and set as measurement target
importGltfModel(app, "/models/policestation.glb", "policestation.glb", (entity: pc.Entity) => {
    measurementPresenter.addTarget(entity); // Add model first
    measurementPresenter.addTarget(plane);  // Add plane second
    console.log('Both plane and model are now measurement targets.');
});

// Keyboard shortcuts
if (window) {
    window.addEventListener('keydown', (event) => {
        if ((event.key === 'c' || event.key === 'C') && measurementPresenter) {
            measurementPresenter.clearMeasurements();
        }
        // Toggle target with T
        // if ((event.key === 't' || event.key === 'T') && measurementPresenter && importedModel) {
        //     currentTarget = (currentTarget === plane) ? importedModel : plane;
        //     measurementPresenter.setTarget(currentTarget);
        //     console.log(`Measurement target switched to: ${currentTarget === plane ? "plane" : "model"}`);
        // }
    });
}



app.start();
