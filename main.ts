import * as pc from 'playcanvas';

// create an application
const canvas = document.getElementById('application') as HTMLCanvasElement;
const app = new pc.Application(canvas);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.start();

// create a camera
const camera = new pc.Entity();
camera.addComponent('camera', {
    clearColor: new pc.Color(0.3, 0.3, 0.7)
});
camera.setPosition(0, 0, 3);
app.root.addChild(camera);

// create a light
const light = new pc.Entity();
light.addComponent('light');
light.setEulerAngles(45, 45, 0);
app.root.addChild(light);

// create a box
const box = new pc.Entity();
box.addComponent('model', {
    type: 'box'
});
app.root.addChild(box);

// rotate the box
app.on('update', (dt: number) => box.rotate(10 * dt, 20 * dt, 30 * dt));


// ------ Custom render passes set up ------
if (camera.camera) {
  const cameraFrame = new pc.CameraFrame(app, camera.camera);
  cameraFrame.rendering.sceneColorMap = true;
  cameraFrame.update();
  console.log("Camera Frame Render Target Scale Before:", cameraFrame.rendering.renderTargetScale);
  cameraFrame.rendering.renderTargetScale = 0.1;
  cameraFrame.rendering.samples = 1;

// want the following mapping:
// Samples	renderTargetScale
// 1	        0.1
// 2	        0.4
// 3	        0.7
// 4	        1.0
// renderTargetScale: one of them scales the size of the texture the scene gets rendered to (scale)
// Sameples: and one enables antialiasing using specified number of samples

  cameraFrame.update();
  console.log("Camera Frame Render Target Scale After:", cameraFrame.rendering.renderTargetScale);
}