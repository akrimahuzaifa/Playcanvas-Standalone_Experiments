import * as pc from 'playcanvas';
import { FlyCamera } from './camera/FlyCamera';

// Point to your local ammo files
pc.WasmModule.setConfig('Ammo', {
  glueUrl: '/lib/ammo/ammo.wasm.js',
  wasmUrl: '/lib/ammo/ammo.wasm.wasm',
  fallbackUrl: '/lib/ammo/ammo.js'
});

// Wait for Ammo to load, then start the app
pc.WasmModule.getInstance('Ammo', (AmmoModule: any) => {
  (window as any).Ammo = AmmoModule;

  const canvas = document.getElementById('application') as HTMLCanvasElement;
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas)
  });

  app.start();
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  if (!app.mouse) {
    app.mouse = new pc.Mouse(app.graphicsDevice.canvas);
  }
  app.mouse.disableContextMenu();

  // Camera
  const camera = new pc.Entity('camera');
  camera.addComponent('camera', { clearColor: new pc.Color(0.2, 0.2, 0.2) });
  camera.setPosition(0, 5, 10);
  app.root.addChild(camera);

  // Light
  const light = new pc.Entity('light');
  light.addComponent('light');
  light.setEulerAngles(45, 0, 0);
  app.root.addChild(light);

  // Ground
  const ground = new pc.Entity('ground');
  ground.addComponent('model', { type: 'box' });
  ground.addComponent('collision', { type: 'box', halfExtents: new pc.Vec3(10, 0.5, 10) });
  ground.addComponent('rigidbody', { type: 'static' });
  ground.setLocalScale(10, 1, 10);
//   const grayMaterial = new pc.StandardMaterial();
//   grayMaterial.diffuse.set(0.5, 0.5, 0.5);
//   grayMaterial.update();
//   (ground.render as pc.RenderComponent).meshInstances.forEach(mi => mi.material = grayMaterial);
  app.root.addChild(ground);

  // Falling box
  const box = new pc.Entity('box');
  box.addComponent('model', { type: 'box' });
  box.addComponent('collision', { type: 'box', halfExtents: new pc.Vec3(0.5, 0.5, 0.5) });
  box.addComponent('rigidbody', { type: 'dynamic', mass: 1 });
  box.setPosition(0, 5, 0);

  // 🎨 Make the cube red
//   const redMaterial = new pc.StandardMaterial();
//   redMaterial.diffuse.set(1, 0, 0);  // RGB (Red)
//   redMaterial.update();
//   (box.render as pc.RenderComponent).meshInstances.forEach(mi => mi.material = redMaterial);

  app.root.addChild(box);

  // Adjust on resize
  window.addEventListener('resize', () => app.resizeCanvas());

  const flycam = new FlyCamera(app, camera);
});



// import * as pc from 'playcanvas';
// import { FlyCamera } from './camera/FlyCamera';
// import { WalkCamera } from './camera/WalkCamera';

// // create an application
// const canvas = document.getElementById('application') as HTMLCanvasElement;
// const app = new pc.Application(canvas);
// app.setCanvasResolution(pc.RESOLUTION_AUTO);
// app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
// app.start();

// if (!app.mouse) {
//     app.mouse = new pc.Mouse(app.graphicsDevice.canvas);
// }
// app.mouse.disableContextMenu();

// // Gravity (increase for more realistic jumping)
// app.systems.rigidbody?.gravity.set(0, -18, 0);

// // create a camera
// const camera = new pc.Entity();
// camera.addComponent('camera', {
//     clearColor: new pc.Color(0.3, 0.3, 0.7),
//     farClip: 100,
//     fov: 90
// });
// camera.setPosition(0, 1, 5);
// app.root.addChild(camera);

// // create a light
// const light = new pc.Entity();
// light.addComponent('light');
// light.setEulerAngles(45, 45, 0);
// app.root.addChild(light);

// // create a box
// const box = new pc.Entity();
// box.addComponent('model', {
//     type: 'box'
// });

// box.addComponent('collision', { type: 'box', halfExtents: new pc.Vec3(0.5, 0.5, 0.5) });
// box.addComponent('rigidbody', { type: 'dynamic', mass: 1 });
// box.setPosition(0, 1, 0);
// app.root.addChild(box);

// // rotate the box
// app.on('update', (dt: number) => box.rotate(10 * dt, 20 * dt, 30 * dt));

// // Plane
// const plane = new pc.Entity("floor");
// plane.addComponent('render', { type: 'plane' });
// plane.addComponent("collision", { type: "box", halfExtents: new pc.Vec3(200, 0.1, 200) });
// plane.addComponent('rigidbody', { type: 'static' });
// plane.setLocalScale(200, 1, 200);
// plane.setPosition(0, -1, 0);
// app.root.addChild(plane);

// const flycam = new FlyCamera(app, camera);
// //const walkCam = new WalkCamera(app, camera);