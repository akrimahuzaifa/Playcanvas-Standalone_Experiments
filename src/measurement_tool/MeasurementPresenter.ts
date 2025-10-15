import * as pc from "playcanvas";
import { MeasurementManager } from "./MeasurementManager";
import { MeasurementView } from "./MeasurementView";
//import { cameraManager, inputPresenter } from "../main";
import { ColorBufferPicker } from "../utils/ColorBufferPicker";

export class MeasurementPresenter {
  private model: MeasurementManager;
  private view: MeasurementView;
  private app: pc.Application;
  private enabled = false;
  private camera: pc.Entity;
  private plane: pc.Entity;
  private colorBufferPicker: ColorBufferPicker;
  private lastMouseMoveTime = 0;
  private mouseThrottleDelay = 8;
  private targets: pc.Entity[] = [];
  private cachedPreviewPoint: pc.Vec3 | null = null;
  private currentMode: "two-point" | "multi-point" | "angle" | "area" =
    "two-point";

  constructor(app: pc.Application, camera: pc.Entity, plane: pc.Entity) {
    this.model = new MeasurementManager();
    this.view = new MeasurementView(app, "measurementUI");
    this.app = app;
    this.camera = camera;
    this.plane = plane;

    this.colorBufferPicker = new ColorBufferPicker(
      app,
      app.graphicsDevice.canvas
    );

    this.view.addEventListener("toggle", (e: Event) => {
      const enabled = (e as CustomEvent).detail.enabled;
      if (enabled) {
        const modeRadio = document.querySelector(
          'input[name="measurement-mode"]:checked'
        ) as HTMLInputElement;
        const mode = modeRadio ? modeRadio.value : "two";
        this.switchMode(mode);
        this.enable();
      } else {
        this.disable();
      }
    });

    // Listen for mode changes
    this.view.addEventListener("mode-change", (e: Event) => {
      const mode = (e as CustomEvent).detail.mode;
      this.switchMode(mode);
    });

    // Remove complete measurement button listener

    this.view.onDeleteMeasurement = (lineEntity: pc.Entity) =>
      this.deleteMeasurement(lineEntity);
  }

  private switchMode(mode: string): void {
    let newMode: "two-point" | "multi-point" | "angle" | "area";
    switch (mode) {
      case "multi":
        newMode = "multi-point";
        break;
      case "angle":
        newMode = "angle";
        break;
      case "area":
        newMode = "area";
        break;
      default:
        newMode = "two-point";
        break;
    }

    if (this.currentMode !== newMode) {
      this.currentMode = newMode;
      this.model.setMeasurementMode(newMode);
      this.view.clearPreviewLine();
      this.view.clearCurrentMultiPointLines();
      this.view.clearCurrentAngleLines();
      this.view.clearCurrentAreaLines();
      this.cachedPreviewPoint = null;
      console.log(`Switched to ${newMode} mode`);
    }
  }

  public addTarget(entity: pc.Entity) {
    if (this.targets.indexOf(entity) === -1) {
      this.targets.push(entity);
      console.log("targeted array: >>>" + this.targets.length);
    }
  }

  public enable(): void {
    if (this.enabled) return;
    this.enabled = true;

    // Listen to DOM events directly
    window.addEventListener("mousedown", this.onMouseDown as EventListener);
    window.addEventListener("mousemove", this.onMouseMove as EventListener);
    window.addEventListener("mousedown", this.onRightClick as EventListener);

    // Load measurements from storage
    const panel = this.view.getMeasurementPanel();
    if (panel && panel.children.length === 0) {
      this.view.count = 0;
      this.draw3DMeasurementsFromLocalStorage();
    }
    console.log("Measurement tool enabled");
  }

  public disable(): void {
    if (!this.enabled) return;
    this.enabled = false;

    // Remove DOM event listeners
    window.removeEventListener("mousedown", this.onMouseDown as EventListener);
    window.removeEventListener("mousemove", this.onMouseMove as EventListener);
    window.removeEventListener("mousedown", this.onRightClick as EventListener);

    this.model.clear();
    this.view.clearAll3DLines();
    this.view.clearPreviewLine();
    this.cachedPreviewPoint = null;

    const panel = this.view.getMeasurementPanel();
    if (panel) {
      this.view.clearMeasurementLines(panel);
    }
    console.log("Measurement tool disabled");
  }

  private validatePointOnTargets(point: pc.Vec3): boolean {
    for (const target of this.targets) {
      const targetPos = target.getPosition();
      const targetScale = target.getLocalScale();
      const maxDimension = Math.max(
        targetScale.x,
        targetScale.y,
        targetScale.z
      );
      const distance = point.distance(targetPos);
      if (distance <= maxDimension * 2) {
        return true;
      }
    }
    return false;
  }

  // Add new right-click handler
  private onRightClick = (e: MouseEvent): void => {
    // Only handle right-click (button 2)
    if (e.button !== 2) return;
    if (!this.enabled) return;

    const panel = this.view.getMeasurementPanel();
    if (panel?.contains(e.target as Node)) return;

    // Prevent default context menu
    e.preventDefault();

    // Complete multi-point or area measurements on right-click
    if (
      this.currentMode === "multi-point" &&
      this.model.currentPoints.length >= 2
    ) {
      this.completeMultiPointMeasurement();
      console.log("Multi-point measurement completed via right-click");
    } else if (
      this.currentMode === "area" &&
      this.model.currentPoints.length >= 3
    ) {
      this.completeAreaMeasurement();
      console.log("Area measurement completed via right-click");
    }
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return; // Only handle left-click for adding points
    if (!this.enabled) return;

    const panel = this.view.getMeasurementPanel();
    if (panel?.contains(e.target as Node)) return;

    const activeCamera = this.camera as any;
    if (activeCamera) {
      activeCamera.temporarilyDisabled = true;
    }

    let point: pc.Vec3 | null = null;

    if (this.cachedPreviewPoint && this.model.currentPoints.length >= 1) {
      point = this.cachedPreviewPoint.clone();
    } else {
      const pcMouseEvent = { x: e.clientX, y: e.clientY } as pc.MouseEvent;
      const range = this.calculatePreciseRange();
      point = this.colorBufferPicker.getWorldPos(
        pcMouseEvent,
        this.camera,
        this.targets,
        range
      );
    }

    if (point && !this.validatePointOnTargets(point)) {
      point = null;
    }

    if (point) {
      console.log("Picked Y position:", point.y);

      if (this.currentMode === "two-point") {
        const measurementCompleted = this.model.addPoint(point);
        if (measurementCompleted) {
          const newMeasurement =
            this.model.measurements[this.model.measurements.length - 1];
          if (newMeasurement.points && newMeasurement.points.length === 2) {
            this.view.drawMeasurement(
              newMeasurement.points[0],
              newMeasurement.points[1],
              newMeasurement.distance
            );
            this.saveMeasurementToStorage(newMeasurement);
          }
          this.cachedPreviewPoint = null;
        }
      } else if (this.currentMode === "multi-point") {
        this.model.addPoint(point);

        // Update current multi-point lines display
        const currentLines = this.model.getCurrentLines();
        this.view.drawCurrentMultiPointLines(currentLines);

        this.cachedPreviewPoint = null;
      } else if (this.currentMode === "angle") {
        const measurementCompleted = this.model.addPoint(point);

        // Update current angle lines display
        const currentLines = this.model.getCurrentLines();
        this.view.drawCurrentAngleLines(currentLines);

        if (measurementCompleted) {
          const newMeasurement =
            this.model.measurements[this.model.measurements.length - 1];
          if (
            newMeasurement.points &&
            newMeasurement.points.length === 3 &&
            newMeasurement.type === "angle"
          ) {
            this.view.drawAngleMeasurement(
              newMeasurement.points,
              newMeasurement.angle!
            );
            this.saveMeasurementToStorage(newMeasurement);

            // Clear current angle lines
            this.view.clearCurrentAngleLines();
          }
        }

        this.cachedPreviewPoint = null;
      } else if (this.currentMode === "area") {
        this.model.addPoint(point);

        // Update current area lines display
        const currentLines = this.model.getCurrentLines();
        this.view.drawCurrentAreaLines(currentLines);

        this.cachedPreviewPoint = null;
      }
    } else {
      console.log("No valid point found on target objects");
    }

    // Re-enable camera
    setTimeout(() => {
      if (activeCamera) {
        activeCamera.temporarilyDisabled = false;
      }
    }, 50);
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (!this.enabled) return;

    const panel = this.view.getMeasurementPanel();
    if (panel?.contains(e.target as Node)) return;

    const now = Date.now();
    if (now - this.lastMouseMoveTime < this.mouseThrottleDelay) return;
    this.lastMouseMoveTime = now;

    // Show preview if we have at least one point waiting
    if (this.model.currentPoints.length >= 1) {
      requestAnimationFrame(() => {
        const pcMouseEvent = { x: e.clientX, y: e.clientY } as pc.MouseEvent;
        const range = this.calculatePreciseRange();

        const point = this.colorBufferPicker.getWorldPos(
          pcMouseEvent,
          this.camera,
          this.targets,
          range
        );

        if (point) {
          this.cachedPreviewPoint = point.clone();

          // Draw preview line from last point to current mouse position
          const previewLine = this.model.getPreviewLine(point);
          if (previewLine) {
            this.view.updatePreviewLine(previewLine[0], previewLine[1]);
          }
        }
      });
    } else {
      this.view.clearPreviewLine();
      this.cachedPreviewPoint = null;
    }
  };

  private completeMultiPointMeasurement(): void {
    if (
      this.currentMode === "multi-point" &&
      this.model.currentPoints.length >= 2
    ) {
      const completed = this.model.completeMeasurement();
      if (completed) {
        const newMeasurement =
          this.model.measurements[this.model.measurements.length - 1];
        if (newMeasurement.points && newMeasurement.type === "multi-point") {
          this.view.drawMultiPointMeasurement(
            newMeasurement.points,
            newMeasurement.distance
          );
          this.saveMeasurementToStorage(newMeasurement);
        }

        // Clear current lines and preview
        this.view.clearCurrentMultiPointLines();
        this.view.clearPreviewLine();
        this.cachedPreviewPoint = null;

        console.log("Multi-point measurement completed");
      }
    }
  }

  private completeAreaMeasurement(): void {
    if (this.currentMode === "area" && this.model.currentPoints.length >= 3) {
      const completed = this.model.completeMeasurement();
      if (completed) {
        const newMeasurement =
          this.model.measurements[this.model.measurements.length - 1];
        if (newMeasurement.points && newMeasurement.type === "area") {
          this.view.drawAreaMeasurement(
            newMeasurement.points,
            newMeasurement.area!
          );
          this.saveMeasurementToStorage(newMeasurement);
        }

        // Clear current lines and preview
        this.view.clearCurrentAreaLines();
        this.view.clearPreviewLine();
        this.cachedPreviewPoint = null;

        console.log("Area measurement completed");
      }
    }
  }

  private calculatePreciseRange(): number {
    const activeCamera = this.camera as any;

    if (activeCamera?.distance) {
      const range = Math.max(200, activeCamera.distance * 10);
      return Math.min(2000, range);
    }

    if (activeCamera?.getDistance) {
      const distance = activeCamera.getDistance();
      const range = Math.max(200, distance * 10);
      return Math.min(2000, range);
    }

    const cameraPos = this.camera.getPosition();
    const groundPos = this.plane.getPosition();
    const distance = cameraPos.distance(groundPos);

    let range = Math.max(200, distance * 8);

    const groundScale = this.plane.getLocalScale();
    const maxGroundDimension = Math.max(groundScale.x, groundScale.z);
    range = Math.max(range, maxGroundDimension * 1.5);

    return Math.min(2000, range);
  }

  private saveMeasurementToStorage(measurement: any): void {
    const saved = localStorage.getItem("measurements");
    const measurements = saved ? JSON.parse(saved) : [];
    measurements.push(measurement);
    localStorage.setItem("measurements", JSON.stringify(measurements));
  }

  private pointsEqual(a: any, b: any, epsilon = 1e-6): boolean {
    if (!a || !b) return false;
    return (
      Math.abs(a.x - b.x) < epsilon &&
      Math.abs(a.y - b.y) < epsilon &&
      Math.abs(a.z - b.z) < epsilon
    );
  }

  public deleteMeasurement(lineEntity: pc.Entity): void {
    const saved = localStorage.getItem("measurements");
    if (!saved) return;

    const measurements = JSON.parse(saved);

    if ((lineEntity as any).type === "multi-point") {
      // Delete multi-point measurement
      const measurementPoints = (lineEntity as any).points;
      const filteredMeasurements = measurements.filter((m: any) => {
        if (m.type === "multi-point") {
          return !this.compareMultiPointMeasurements(
            m.points,
            measurementPoints
          );
        }
        return true;
      });
      localStorage.setItem(
        "measurements",
        JSON.stringify(filteredMeasurements)
      );

      // Remove all segments of this multi-point measurement
      const groupName = (lineEntity as any).measurementGroup;
      this.view.lineEntities = this.view.lineEntities.filter((entity) => {
        if ((entity as any).measurementGroup === groupName) {
          // Destroy associated text entity if it exists
          if ((entity as any).textEntity) {
            (entity as any).textEntity.destroy();
          }
          if (entity.parent) entity.parent.removeChild(entity);
          entity.destroy();
          return false;
        }
        return true;
      });

      // Remove UI element
      const uiElement = document.getElementById(groupName);
      if (uiElement) {
        uiElement.remove();
      }
    } else if ((lineEntity as any).type === "angle") {
      // Delete angle measurement
      const measurementPoints = (lineEntity as any).points;
      const angle = (lineEntity as any).angle;

      const filteredMeasurements = measurements.filter((m: any) => {
        if (m.type === "angle" && m.points && m.points.length === 3) {
          return !this.compareAngleMeasurements(
            m.points,
            m.angle,
            measurementPoints,
            angle
          );
        }
        return true;
      });
      localStorage.setItem(
        "measurements",
        JSON.stringify(filteredMeasurements)
      );

      // Remove all segments of this angle measurement
      const groupName = (lineEntity as any).measurementGroup;
      this.view.lineEntities = this.view.lineEntities.filter((entity) => {
        if ((entity as any).measurementGroup === groupName) {
          // Destroy associated text entity if it exists (store on first segment)
          if ((entity as any).textEntity) {
            (entity as any).textEntity.destroy();
          }
          if (entity.parent) entity.parent.removeChild(entity);
          entity.destroy();
          return false;
        }
        return true;
      });

      // Remove UI element
      const uiElement = document.getElementById(groupName);
      if (uiElement) {
        uiElement.remove();
      }
    } else if ((lineEntity as any).type === "area") {
      // Delete area measurement
      const measurementPoints = (lineEntity as any).points;
      const area = (lineEntity as any).area;

      const filteredMeasurements = measurements.filter((m: any) => {
        if (m.type === "area" && m.points && m.points.length >= 3) {
          return !this.compareAreaMeasurements(
            m.points,
            m.area,
            measurementPoints,
            area
          );
        }
        return true;
      });
      localStorage.setItem(
        "measurements",
        JSON.stringify(filteredMeasurements)
      );

      // Remove all segments of this area measurement
      const groupName = (lineEntity as any).measurementGroup;
      this.view.lineEntities = this.view.lineEntities.filter((entity) => {
        if ((entity as any).measurementGroup === groupName) {
          if (entity.parent) entity.parent.removeChild(entity);
          entity.destroy();
          return false;
        }
        return true;
      });

      // Remove UI element
      const uiElement = document.getElementById(groupName);
      if (uiElement) {
        uiElement.remove();
      }
    } else {
      // Delete two-point measurement (existing logic)
      const lp0 = (lineEntity as any).points?.[0];
      const lp1 = (lineEntity as any).points?.[1];

      const filteredMeasurements = measurements.filter((m: any) => {
        if (!m.points || m.points.length !== 2) return true;

        const [s, e] = m.points;
        const match =
          (this.pointsEqual(s, lp0) && this.pointsEqual(e, lp1)) ||
          (this.pointsEqual(s, lp1) && this.pointsEqual(e, lp0));

        return !match;
      });
      localStorage.setItem(
        "measurements",
        JSON.stringify(filteredMeasurements)
      );

      // Remove from view's lineEntities array
      const index = this.view.lineEntities.indexOf(lineEntity);
      if (index > -1) {
        this.view.lineEntities.splice(index, 1);
        if (lineEntity.parent) lineEntity.parent.removeChild(lineEntity);
        lineEntity.destroy();
      }

      // Remove UI element
      const uiElement = document.getElementById(lineEntity.name);
      if (uiElement) {
        uiElement.remove();
      }
    }

    // Additional cleanup: destroy text entity if it exists
    if ((lineEntity as any).textEntity) {
      (lineEntity as any).textEntity.destroy();
    }
  }

  private compareMultiPointMeasurements(
    pointsA: any[],
    pointsB: any[],
    epsilon = 1e-6
  ): boolean {
    if (!pointsA || !pointsB || pointsA.length !== pointsB.length) {
      return false;
    }
    // Compare each point in order
    for (let i = 0; i < pointsA.length; i++) {
      if (!this.pointsEqual(pointsA[i], pointsB[i], epsilon)) {
        return false;
      }
    }
    return true;
  }

  private compareAngleMeasurements(
    storedPoints: any[],
    storedAngle: number,
    entityPoints: any[],
    entityAngle: number
  ): boolean {
    if (
      !storedPoints ||
      !entityPoints ||
      storedPoints.length !== 3 ||
      entityPoints.length !== 3
    ) {
      return false;
    }

    // Compare points and angle
    const pointsMatch = this.compareMultiPointMeasurements(
      storedPoints,
      entityPoints
    );
    const angleMatch = Math.abs(storedAngle - entityAngle) < 0.01; // Small tolerance for float comparison

    return pointsMatch && angleMatch;
  }

  private compareAreaMeasurements(
    storedPoints: any[],
    storedArea: number,
    entityPoints: any[],
    entityArea: number
  ): boolean {
    if (
      !storedPoints ||
      !entityPoints ||
      storedPoints.length !== entityPoints.length ||
      storedPoints.length < 3
    ) {
      return false;
    }

    // Compare points and area
    const pointsMatch = this.compareMultiPointMeasurements(
      storedPoints,
      entityPoints
    );
    const areaMatch = Math.abs(storedArea - entityArea) < 0.01; // Small tolerance for float comparison

    return pointsMatch && areaMatch;
  }

  public draw3DMeasurementsFromLocalStorage(): void {
    this.model.loadMeasurementsFromLocalStorage();

    this.model.measurements.forEach((measurement) => {
      if (
        measurement.type === "multi-point" &&
        measurement.points &&
        measurement.points.length >= 2
      ) {
        // Draw multi-point measurement
        const points = measurement.points.map(
          (p) => new pc.Vec3(p.x, p.y, p.z)
        );
        this.view.drawMultiPointMeasurement(points, measurement.distance);
      } else if (
        measurement.type === "angle" &&
        measurement.points &&
        measurement.points.length === 3
      ) {
        // Draw angle measurement
        const points = measurement.points.map(
          (p) => new pc.Vec3(p.x, p.y, p.z)
        );
        this.view.drawAngleMeasurement(points, measurement.angle!);
      } else if (
        measurement.type === "area" &&
        measurement.points &&
        measurement.points.length >= 3
      ) {
        // Draw area measurement
        const points = measurement.points.map(
          (p) => new pc.Vec3(p.x, p.y, p.z)
        );
        this.view.drawAreaMeasurement(points, measurement.area!);
      } else if (measurement.points?.length === 2) {
        // Draw two-point measurement
        const start = new pc.Vec3(
          measurement.points[0].x,
          measurement.points[0].y,
          measurement.points[0].z
        );
        const end = new pc.Vec3(
          measurement.points[1].x,
          measurement.points[1].y,
          measurement.points[1].z
        );
        this.view.drawMeasurement(start, end, measurement.distance);
      }
    });
  }
  public clearMeasurements() {
    // Remove all spheres
    const spheres = this.app.root.find((entity) => {
      return entity.name === "ClickSphere";
    }) as pc.Entity[];

    spheres.forEach((entity) => {
      entity.destroy();
    });

    console.log("🧹 Spheres cleared");
  }
}