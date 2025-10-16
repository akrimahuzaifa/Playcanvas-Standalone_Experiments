import * as pc from 'playcanvas';

// create an application
const canvas = document.getElementById('application') as HTMLCanvasElement;
const app = new pc.Application(canvas);
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.start();
// Gravity (increase for more realistic jumping)
app.systems.rigidbody?.gravity.set(0, -18, 0);
// create a camera
const camera = new pc.Entity();
camera.addComponent('camera', {
    clearColor: new pc.Color(0.3, 0.3, 0.7)
});
camera.setPosition(0, 0, 3);
camera.addComponent('collision', { type: 'capsule', radius: 0.5, height: 1.8 });
camera.addComponent('rigidbody', { type: 'dynamic', mass: 1 });

app.root.addChild(camera);
if (app.systems.rigidbody) {
    app.systems.rigidbody.gravity = new pc.Vec3(0, -9.8, 0);
}
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

box.addComponent('collision', { type: 'box', halfExtents: new pc.Vec3(0.5, 0.5, 0.5) });
box.addComponent('rigidbody', { type: 'dynamic', mass: 1 });
app.root.addChild(box);

// rotate the box
app.on('update', (dt: number) => box.rotate(10 * dt, 20 * dt, 30 * dt));