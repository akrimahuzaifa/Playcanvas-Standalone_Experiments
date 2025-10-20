import * as pc from "playcanvas";
import { MeasurementPresenter } from "./measurement_tool/MeasurementPresenter";
import { MeasurementPresenterSphere } from "./measurementpresenterSphere";
import { importGltfModel } from "./ImportExportManager";
import { FlyCamera } from "./camera/FlyCamera";
import { WalkCamera } from "./camera/WalkCamera";

// Point to your local ammo files
pc.WasmModule.setConfig("Ammo", {
  glueUrl: "/lib/ammo/ammo.wasm.js",
  wasmUrl: "/lib/ammo/ammo.wasm.wasm",
  fallbackUrl: "/lib/ammo/ammo.js",
});

// Wait for Ammo to load, then start the app
pc.WasmModule.getInstance("Ammo", (AmmoModule: any) => {
  (window as any).Ammo = AmmoModule;

  const canvas = document.getElementById(
    "application-canvas"
  ) as HTMLCanvasElement;
  const app = new pc.Application(canvas, {
    mouse: new pc.Mouse(canvas),
    touch: new pc.TouchDevice(canvas),
  });

  app.start();
  app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
  app.setCanvasResolution(pc.RESOLUTION_AUTO);
  if (!app.mouse) {
    app.mouse = new pc.Mouse(app.graphicsDevice.canvas);
  }
  app.mouse.disableContextMenu();
  //app.systems.rigidbody?.gravity.set(0, -18, 0); // Increased gravity for better jumping feel

  // Camera
  const camera = new pc.Entity("camera");
  camera.addComponent("camera", {
    clearColor: new pc.Color(0.4, 0.6, 0.8),
    fov: 60,
    nearClip: 0.1,
    farClip: 500,
  });
  camera.setPosition(0, 20, 90);
  app.root.addChild(camera);

  //light
  const light = new pc.Entity();
  light.addComponent("light", { type: "directional", intensity: 1 });
  light.setLocalEulerAngles(45, 30, 0);
  app.root.addChild(light);

  // ground
  const groundMaterial = new pc.StandardMaterial();
  groundMaterial.diffuse = new pc.Color(0, 1, 0); // green
  groundMaterial.update();

  const ground = new pc.Entity("floor");
  ground.addComponent("render", { type: "plane", material: groundMaterial });
  ground.addComponent("collision", {
    type: "box",
    halfExtents: new pc.Vec3(100, 0.5, 100),
  });
  ground.addComponent("rigidbody", { type: "static" });
  ground.setLocalScale(200, 1, 200);
  app.root.addChild(ground);

  // Falling box
  const boxmaterial = new pc.StandardMaterial();
  boxmaterial.diffuse = new pc.Color(1, 0, 0); // Red
  boxmaterial.update();

  const box = new pc.Entity("box");
  box.addComponent("render", { type: "box", material: boxmaterial });
  box.addComponent("collision", {
    type: "box",
    halfExtents: new pc.Vec3(0.5, 0.5, 0.5),
  });
  box.addComponent("rigidbody", { type: "dynamic", mass: 1 });
  box.setPosition(0, 5, 0);
  //app.root.addChild(box);

  // Initialize MeasurementPresenter right away
  const measurementPresenter = new MeasurementPresenter(app, camera, ground);

  // Keyboard shortcuts
  if (window) {
    window.addEventListener("keydown", (event) => {
      if ((event.key === "c" || event.key === "C") && measurementPresenter) {
        measurementPresenter.clearMeasurements();
      }
    });
  }

  const measurementPresenterSphere = new MeasurementPresenterSphere(
    app,
    camera
  );

  // Import model and set as measurement target
  importGltfModel(
    app,
    "/models/policestation.glb",
    "policestation.glb",
    (entity: pc.Entity) => {
      measurementPresenter.addTarget(entity); // Add model first
      measurementPresenter.addTarget(ground); // Add plane second

      // entity.addComponent('render', {type: 'box'});
      // entity.addComponent('collision', {type: 'box'});
      // entity.addComponent('rigidbody', {type: 'dynamic', mass: 1});
      // entity.setLocalScale(0.01, 0.01, 0.01);
      entity.setPosition(0, 0.5, 0);
      //measurementPresenterSphere.addTarget(entity);
      //measurementPresenterSphere.addTarget(ground);
      console.log("Both plane and model are now measurement targets.");
    }
  );

  // Adjust on resize
  window.addEventListener("resize", () => app.resizeCanvas());

  const flycam = new FlyCamera(app, camera);
  //const walkCam = new WalkCamera(app, camera);
});
