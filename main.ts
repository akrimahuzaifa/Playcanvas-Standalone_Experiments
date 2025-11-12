import * as pc from "playcanvas";

// Simple PlayCanvas demo that loads GLBs (with box fallback), moves them on an interval,
// and makes the camera follow the first drone.

const canvas = document.getElementById("application") as HTMLCanvasElement;
const app = new pc.Application(canvas, {
  mouse: new pc.Mouse(canvas),
  touch: new pc.TouchDevice(canvas),
});
app.mouse?.disableContextMenu();
app.setCanvasResolution(pc.RESOLUTION_AUTO);
app.setCanvasFillMode(pc.FILLMODE_FILL_WINDOW);
app.start();

// camera
const camera = new pc.Entity("mainCamera");
camera.addComponent("camera", { clearColor: new pc.Color(0.3, 0.3, 0.7) });
camera.setPosition(0, 10, 20);
app.root.addChild(camera);

// light
const light = new pc.Entity("light");
light.addComponent("light");
light.setEulerAngles(45, 45, 0);
app.root.addChild(light);

// ground
const ground = new pc.Entity("ground");
ground.addComponent("render", { type: "plane" });
const groundMat = createMaterial(pc.Color.BLACK);
ground.setLocalScale(50, 1, 50);
ground.setPosition(0, -1.2, 0);
setMaterial(ground, groundMat);
app.root.addChild(ground);

// Helper to load a GLB; returns null if loading fails or file looks invalid
function loadGLB(url: string): Promise<pc.Entity | null> {
  return new Promise(async (resolve) => {
    // Quick HEAD check to avoid attempting to parse empty/invalid files which
    // cause the PlayCanvas GLB parser to throw DataView range errors.
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (!head.ok) {
        // file missing or not accessible
        resolve(null);
        return;
      }
      const len = head.headers.get("content-length");
      if (!len || Number(len) < 100) {
        // very small file - probably not a valid GLB
        resolve(null);
        return;
      }
    } catch (e) {
      // network error or HEAD not allowed; fall back to attempting load
      // but keep guarded by PlayCanvas callback
      // (we'll continue to load below)
    }

    app.assets.loadFromUrl(url, "container", (err, asset) => {
      if (err) {
        console.warn("GLB load failed for", url, err);
        resolve(null);
        return;
      }
      if (!asset || !asset.resource) {
        resolve(null);
        return;
      }
      const container = asset.resource as pc.ContainerResource;
      if (!container) {
        resolve(null);
        return;
      }
      const ent = container.instantiateRenderEntity();
      ent.setLocalScale(1, 1, 1);
      resolve(ent);
    });
  });
}

function createMaterial(color: pc.Color): pc.StandardMaterial {
  const material = new pc.StandardMaterial();
  material.diffuse = color;
  material.name = `Material-${color.toString(false)}`;
  material.update();
  return material;
}

function setMaterial(entity: pc.Entity, material: pc.StandardMaterial): void {
  if (entity.render) {
    entity.render.material = material;
  } else {
    console.warn("Entity does not have a render component:", entity.name);
  }
}

// Drone management
const drones: pc.Entity[] = [];
const targets: pc.Vec3[] = [];

async function spawnDrones() {
  const urls = ["/models/Arrow.glb", "/models/ArrowBiscuitCutter.glb"];

  for (let i = 0; i < 2; i++) {
    const url = urls[i % urls.length];
    let ent = await loadGLB(url);
    // fallback: create a box if GLB missing
    if (!ent) {
      ent = new pc.Entity(`drone-box-${i}`);
      ent.addComponent("model", { type: "box" });
      const boxMat = createMaterial(pc.Color.YELLOW);
      ent.addComponent("render", {
        type: "box",
        material: boxMat,
      });

      //setMaterial(ent, boxMat);
    }

    const pos = new pc.Vec3(
      (Math.random() - 0.5) * 20,
      1,
      (Math.random() - 0.5) * 20
    );
    ent.setPosition(pos);
    app.root.addChild(ent);
    drones.push(ent);
    targets.push(pos.clone());
  }

  // Immediately position camera to look at the first drone
  if (drones[0]) {
    const p = drones[0].getPosition();
    camera.setPosition(p.x, p.y + 10, p.z + 10);
    camera.lookAt(p);
  }
}

// Move drones to new nearby positions every 2 seconds
function randomizeTargets() {
  for (let i = 0; i < drones.length; i++) {
    const current = drones[i].getPosition();
    const nx = current.x + (Math.random() - 0.5) * 6;
    const nz = current.z + (Math.random() - 0.5) * 6;
    targets[i] = new pc.Vec3(nx, 1, nz);
  }
}

// Lerp speed
const LERP_SPEED = 2.5;

app.on("update", (dt: number) => {
  for (let i = 0; i < drones.length; i++) {
    const ent = drones[i];
    const tgt = targets[i];
    if (!ent || !tgt) continue;
    const cur = ent.getPosition();
    // simple lerp toward target
    cur.lerp(cur, tgt, Math.min(dt * LERP_SPEED, 1));
    ent.setPosition(cur);
  }

  // Camera follows the first drone with offset
  if (drones[0]) {
    const dp = drones[0].getPosition();
    const camPos = new pc.Vec3(dp.x, dp.y + 10, dp.z + 10);
    camera.setPosition(camPos);
    camera.lookAt(dp);
  }
});

// Start
spawnDrones().then(() => {
  setInterval(randomizeTargets, 2000);
});

// Load and apply a textured material to the ground (falls back to green color)
async function applyGroundTexture(url: string) {
  // quick HEAD check
  try {
    const head = await fetch(url, { method: "HEAD" });
    if (!head.ok) {
      // fallback
      const mat = new pc.StandardMaterial();
      mat.diffuse = new pc.Color(0.2, 0.7, 0.2);
      mat.update();
      if (ground.render) ground.render.material = mat;
      console.warn("Ground texture HEAD check failed:", head.status);
      return;
    }
    const len = head.headers.get("content-length");
    if (!len || Number(len) < 100) {
      const mat = new pc.StandardMaterial();
      mat.diffuse = pc.Color.GREEN;
      mat.update();
      if (ground.render) ground.render.material = mat;
      console.warn("Ground texture HEAD check failed: file too small");
      return;
    }
  } catch (e) {
    // ignore and try loading texture
    console.warn("Ground texture HEAD check error:", e);
  }

  app.assets.loadFromUrl(url, "texture", (err, asset) => {
    if (err || !asset || !asset.resource) {
      const mat = new pc.StandardMaterial();
      mat.diffuse = new pc.Color(0.2, 0.7, 0.2);
      mat.update();
      if (ground.render) ground.render.material = mat;
      return;
    }
    const tex = asset.resource as pc.Texture;
    const mat = new pc.StandardMaterial();
    mat.diffuseMap = tex;
    // scale UVs by setting tiling on the material (diffuseMapTiling property)
    // PlayCanvas uses setParameters on material for some properties; diffuseMapTiling exists on the material instance
    (mat as any).diffuseMapTiling = new pc.Vec2(10, 10);
    mat.update();
    if (ground.render) ground.render.material = mat;
    console.log("Applied ground texture:", url);
  });
}

// attempt to apply provided texture
applyGroundTexture("/texture/ui_background.jpg");
