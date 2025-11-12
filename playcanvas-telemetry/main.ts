import * as pc from "playcanvas";
import { Environment } from "./src/Environment";
import { CamFly } from "./src/camfly";
import { Drones } from "./src/Drones";
import { MiniMap } from "./src/MiniMap";

// create an application
const canvas = document.getElementById("application") as HTMLCanvasElement;
const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas), // (optional, for touch support)
});
app.mouse?.disableContextMenu();
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.start();

const environment = new Environment(app);
const { camera } = await environment.Initialize();

// Initialize camera fly
//const camFly = new CamFly(app, camera);

// Initialize 3D Drones
const drones3D = new Drones(app, environment);

// Initialize 2D MiniMap
const miniMap = new MiniMap("mini-map");
