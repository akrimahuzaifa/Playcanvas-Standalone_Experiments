import * as pc from "playcanvas";

export interface EnvironmentEntities {
  camera: pc.Entity;
  mainLight?: pc.Entity;
  fillLight?: pc.Entity;
  ground: pc.Entity;
}

export class Environment {
  private app: pc.Application;
  public envEntities: EnvironmentEntities | null = null;

  constructor(app: pc.Application) {
    this.app = app;
    //console.log('Environment initializing...');
  }

  public async Initialize(): Promise<EnvironmentEntities> {
    return await this.LoadEnvironment(this.app);
  }

  public async LoadEnvironment(
    app: pc.Application
  ): Promise<EnvironmentEntities> {
    // create a camera
    const camera = new pc.Entity("mainCamera");
    camera.addComponent("camera", {
      clearColor: new pc.Color(0.3, 0.3, 0.7),
    });
    camera.setPosition(0, 0, 3);
    app.root.addChild(camera);

    // create a light
    const light = new pc.Entity();
    light.addComponent("light");
    light.setEulerAngles(45, 45, 0);
    app.root.addChild(light);

    // create a box
    const box = new pc.Entity();
    box.addComponent("model", {
      type: "box",
    });
    app.root.addChild(box);

    // rotate the box
    app.on("update", (dt: number) => box.rotate(10 * dt, 20 * dt, 30 * dt));

    // Create a ground plane
    const ground = new pc.Entity("floor");
    ground.addComponent("render", {
      type: "plane",
      material: undefined,
    });

    ground.setLocalScale(new pc.Vec3(200, 1, 200));

    ground.addComponent("collision", {
      type: "box",
      halfExtents: new pc.Vec3(200, 0.1, 200),
    });

    ground.addComponent("rigidbody", {
      type: "static",
    });
    app.root.addChild(ground);

    // Create a green material for ground
    const groundMaterial = this.createMaterial(pc.Color.GREEN);

    this.setMaterial(ground, groundMaterial);
    ground.setPosition(new pc.Vec3(0, -1.2, 0));
    // attempt to apply a textured material for the ground (best-effort)
    this.applyGroundTexture(app, "/texture/ui_background.jpg").catch((e) => {
      // ignore errors, keep fallback material
      console.warn("applyGroundTexture failed", e);
    });
    this.envEntities = { camera, mainLight: light, ground };

    return { camera, ground };
  }

  private async applyGroundTexture(
    app: pc.Application,
    url: string
  ): Promise<void> {
    try {
      // quick HEAD check
      try {
        const head = await fetch(url, { method: "HEAD" });
        if (!head.ok) {
          return;
        }
        const len = head.headers.get("content-length");
        if (!len || Number(len) < 100) {
          return;
        }
      } catch (e) {
        // server may not support HEAD - continue to try loading
      }

      app.assets.loadFromUrl(url, "texture", (err, asset) => {
        if (err || !asset || !asset.resource) {
          return;
        }
        const tex = asset.resource as pc.Texture;
        const mat = new pc.StandardMaterial();
        mat.diffuseMap = tex;
        // tiling
        (mat as any).diffuseMapTiling = new pc.Vec2(10, 10);
        mat.update();
        if (
          this.envEntities &&
          this.envEntities.ground &&
          this.envEntities.ground.render
        ) {
          this.envEntities.ground.render.material = mat;
        }
      });
    } catch (e) {
      console.warn("Ground texture load failed", e);
    }
  }

  createMaterial(color: pc.Color): pc.StandardMaterial {
    const material = new pc.StandardMaterial();
    material.diffuse = color;
    material.name = `Material-${color.toString(false)}`;
    material.update();
    return material;
  }

  setMaterial(entity: pc.Entity, material: pc.StandardMaterial): void {
    if (entity.render) {
      entity.render.material = material;
    } else {
      console.warn("Entity does not have a render component:", entity.name);
    }
  }

  public loadGLBModel(
    app: pc.Application,
    url: string,
    position: pc.Vec3 = new pc.Vec3(0, 0, 0)
  ): Promise<pc.Entity | null> {
    return new Promise(async (resolve) => {
      // Quick HEAD/content-length check to avoid PlayCanvas parsing an invalid/truncated GLB
      try {
        try {
          const head = await fetch(url, { method: "HEAD" });
          if (!head.ok) {
            resolve(null);
            return;
          }
          const len = head.headers.get("content-length");
          if (!len || Number(len) < 100) {
            resolve(null);
            return;
          }
        } catch (e) {
          // if HEAD fails, proceed to attempt full load below
        }
      } catch (e) {
        // ignore
      }

      app.assets.loadFromUrl(url, "container", (err, asset) => {
        if (err) {
          console.error("Error loading model:", err);
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
        const entity = container.instantiateRenderEntity();
        // Set entity name to file name
        const fileName = url.split("/").pop() || url;
        entity.name = fileName;
        entity.setPosition(position);
        // Reset scale in case import changed it
        entity.setLocalScale(1, 1, 1);
        app.root.addChild(entity);
        resolve(entity);
      });
    });
  }

  // public loadGLBModel(app: pc.Application, url: string, position: pc.Vec3 = new pc.Vec3(0,0,0)) {
  //     app.assets.loadFromUrl(url, "container", (err, asset) => {
  //         if (err) {
  //             console.error("Error loading model:", err);
  //             return;
  //         }
  //         const container = asset?.resource as pc.ContainerResource;
  //         if (!container) return;
  //         const entity = container.instantiateRenderEntity();
  //         entity.setPosition(position);
  //         app.root.addChild(entity);
  //         console.log("Model loaded and added to scene:", entity.getLocalScale());
  //         entity.setLocalScale(1, 1, 1); // Try a larger scale
  //         entity.setEulerAngles(0, 0, 90);
  //         //console.log("Loaded asset:", asset);
  //         entity;
  //     });
  // }
}
