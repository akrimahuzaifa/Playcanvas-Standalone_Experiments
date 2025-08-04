import * as pc from 'playcanvas';

const widthsPreset: number[] = [480, 720, 1280, 1920, 2560, 4096, 7680]; 
const heightsPreset: number[] = [270, 480, 720, 1080, 1440, 2160, 4320]; 
let currentResolutionIndex = 0;

// create an application
const canvas = document.getElementById('application') as HTMLCanvasElement;
const app = new pc.Application(canvas);

var width: number = widthsPreset[currentResolutionIndex];
var height: number = heightsPreset[currentResolutionIndex];

app.setCanvasResolution(pc.RESOLUTION_FIXED, width, height);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.start();

console.log('Current Resolution width:', app.graphicsDevice.width, 'Height: ', app.graphicsDevice.height);

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