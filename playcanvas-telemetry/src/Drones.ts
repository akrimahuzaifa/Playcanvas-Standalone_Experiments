import * as pc from "playcanvas";
import { Environment } from "./Environment";
import { fetchActiveDrones } from "./TelemetryService";

export class Drones {
  //private droneEntities: Record<number, pc.Entity> = {};
  private droneEntities: Record<number, pc.Entity | null> = {};
  private app: pc.Application;
  private environment: Environment;
  private isCameraSet: boolean = false;

  private targetPositions: Record<number, pc.Vec3> = {};

  constructor(app: pc.Application, environment: Environment) {
    this.app = app;
    this.environment = environment;
    setInterval(() => this.updateDrones(), 5000); // Update every 5 seconds
    this.updateDrones();
    this.app.on("update", this.update, this);
  }

  async updateDrones() {
    //const drones = await this.fetchDrones();
    const drones = await fetchActiveDrones();
    for (const { sys_id, data } of drones) {
      // Use actual position (no random jitter for production)
      const randomLat =
        data.global_position.lat + (Math.random() - 0.5) * 0.001;
      const randomLon =
        data.global_position.lon + (Math.random() - 0.5) * 0.001;

      // Set position (convert lat/lon to x/z, simple mapping for demo)
      const x = (randomLon - 8.64361) * 10000;
      const z = (randomLat - 49.87165) * 10000;
      this.targetPositions[sys_id] = new pc.Vec3(x, 1, z);

      let entity = this.droneEntities[sys_id];
      //use different models based on sys_id
      if (!entity) {
        if (sys_id === 1) {
          entity = await this.environment.loadGLBModel(
            this.app,
            "/models/Arrow.glb"
          );
        } else {
          entity = await this.environment.loadGLBModel(
            this.app,
            "/models/ArrowBiscuitCutter.glb"
          );
        }
        if (!entity) continue;

        // Move camera to follow the first drone (set only on first run)
        if (!this.isCameraSet) {
          entity.setPosition(x, 1, z);
          this.environment.envEntities?.camera.setPosition(x, 10, z + 10);
          this.environment.envEntities?.camera.lookAt(entity.getPosition());

          // Reset scale in case model import changed it
          entity.setLocalScale(1, 1, 1);
        }
        this.droneEntities[sys_id] = entity;
      }

      // Set heading
      const heading =
        (Math.atan2(data.global_direction.y, data.global_direction.x) * 180) /
        Math.PI;
      entity.setEulerAngles(0, heading, 0);
      this.app.root.addChild(entity);
      //console.log(`Updated drone ${sys_id} to position (${x.toFixed(2)}, 1, ${z.toFixed(2)}) with heading ${heading.toFixed(2)}`);
    }

    // set flag to avoid resetting camera on subsequent updates
    this.isCameraSet = true;
    //console.log("Updated drones:", Object.keys(this.droneEntities).length);
  }

  private update(dt: number) {
    for (const sys_id in this.droneEntities) {
      const entity = this.droneEntities[sys_id];
      const target = this.targetPositions[sys_id];
      if (entity && target) {
        const current = entity.getPosition();
        // Lerp towards target position (do not mutate original position object unexpectedly)
        const lerped = new pc.Vec3();
        lerped.lerp(current, target, Math.min(dt * 2, 1)); // Adjust speed as needed
        entity.setPosition(lerped);
      }
    }

    // Camera follow first available drone
    const firstIdStr = Object.keys(this.droneEntities)[0];
    if (firstIdStr) {
      const firstId = Number(firstIdStr);
      const ent = this.droneEntities[firstId];
      const cam = this.environment.envEntities?.camera;
      if (ent && cam) {
        const p = ent.getPosition();
        cam.setPosition(p.x, p.y + 10, p.z + 10);
        cam.lookAt(p);
      }
    }
  }
}
