import * as pc from 'playcanvas';

// create an application
const canvas = document.getElementById('application') as HTMLCanvasElement;

const deviceSelect = document.getElementById("device-select") as HTMLSelectElement;

// Device type mapping
const deviceTypeMap: Record<string, string> = {
  webgl2: pc.DEVICETYPE_WEBGL2,
  webgpu: pc.DEVICETYPE_WEBGPU,
};

// Load preference from localStorage or default to WebGL2
const storedType = localStorage.getItem("deviceType") || "webgl2";
deviceSelect.value = storedType;

// Listen for changes and reload page with new preference
deviceSelect.addEventListener("change", () => {
  localStorage.setItem("deviceType", deviceSelect.value);
  window.location.reload();
});

// Use selected device type for initialization
const gfxOptions = {
  deviceTypes: [deviceTypeMap[deviceSelect.value]],
  antialias: true,
};


const device = await pc.createGraphicsDevice(canvas, gfxOptions);
console.log("Graphics Device:", device);

console.log("Creating PlayCanvas application...");
const app = new pc.Application(canvas, {
  graphicsDevice: device,
});

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


// log the graphics device type and WebGPU support
console.log("Graphics Device Type:", app.graphicsDevice.deviceType);
if ("gpu" in navigator) {
  console.log("WebGPU is supported in this browser.");
} else {
  console.log("WebGPU is NOT supported in this browser.");
}