// File: src/views/MeasurementView.ts
import * as pc from "playcanvas";
import { MeasurementManager } from "./MeasurementManager";
//import { cameraManager } from "../main"; // Add this import

export class MeasurementView extends EventTarget {
    private app: pc.Application;
    public lineEntities: pc.Entity[] = [];
    private previewLineEntity: pc.Entity | null = null;
    private fontAsset: pc.Asset | null = null;
    public container: HTMLElement;
    public hoveredLineEntity: pc.Entity | null = null;
    public statusCallback?: (status: boolean, lineEntity: pc.Entity | null) => void;
    private selectedLine: pc.Entity | null = null;
    count: number = 0;

    // Pre-created materials for better performance
    private static readonly previewThickness = 0.03; // Change this value for desired thickness
    private static readonly lineThickness = 1; // Try a larger value

    // Update materials to match UI colors
    private static readonly previewMaterial = (() => {
        const mat = new pc.StandardMaterial();
        
        // Base red color for preview (keep as is for preview)
        mat.diffuse = new pc.Color(1, 0, 0);
        
        // LASER EFFECT - Bright red emission
        mat.emissive = new pc.Color(0.8, 0.1, 0.1); // Bright red glow
        mat.emissiveIntensity = 2.0; // Boost the glow intensity
        
        // Make it semi-transparent for laser effect
        mat.opacity = 1;
        mat.blendType = pc.BLEND_NORMAL;
        mat.depthWrite = false;
        
        // Add some metallic/glossy properties for more laser-like appearance
        mat.metalness = 0.1;
        mat.gloss = 0.5; // High shininess for reflective laser look
        
        mat.update();
        return mat;
    })();

    // Two-point measurement material - BLUE to match UI (#00557cff)
    private static readonly measurementMaterial = (() => {
        const mat = new pc.StandardMaterial();
        //mat.diffuse = new pc.Color(0, 0.333, 0.486); // Blue color matching UI (#00557c)
        mat.diffuse = new pc.Color(1, 0, 0); // Bright red
        mat.update();
        return mat;
    })();

    // Multi-point measurement material - PURPLE to match UI (#5a2d82)
    private static readonly multiPointMaterial = (() => {
        const mat = new pc.StandardMaterial();
        mat.diffuse = new pc.Color(0.353, 0.176, 0.510); // Purple color matching UI (#5a2d82)
        mat.update();
        return mat;
    })();

    // Angle measurement material - ORANGE to match UI (#d48806)
    private static readonly angleMaterial = (() => {
        const mat = new pc.StandardMaterial();
        mat.diffuse = new pc.Color(0.831, 0.533, 0.024); // Orange color matching UI (#d48806)
        mat.update();
        return mat;
    })();

    // Area measurement material - GREEN
    private static readonly areaMaterial = (() => {
        const mat = new pc.StandardMaterial();
        mat.diffuse = new pc.Color(0.133, 0.545, 0.133); // Green color (#228B22)
        mat.update();
        return mat;
    })();

    public onDeleteMeasurement?: (lineEntity: pc.Entity) => void;

    // --- Multi-point measurement properties ---
    public multiPointLines: pc.Entity[] = []; // Track multi-point line segments
    public currentMultiPointLines: pc.Entity[] = []; // Track current incomplete multi-point lines
    public angleLines: pc.Entity[] = []; // Track angle line segments
    public currentAngleLines: pc.Entity[] = []; // Track current incomplete angle lines
    public areaLines: pc.Entity[] = []; // Track area line segments
    public currentAreaLines: pc.Entity[] = []; // Track current incomplete area lines

    constructor(app: pc.Application, containerId: string, manager?: MeasurementManager) {
        super();
        this.app = app;
        this.container = document.getElementById(containerId)!;
        console.log("MeasurementView container:", this.container);
        this.loadFont();
        this.render();
    }

    private loadFont(): void {
        this.app.assets.loadFromUrl("font/Roboto-Black.json", "font", (err, asset) => {
            if (!err && asset) this.fontAsset = asset;
        });
    }

    private render(): void {
        this.container.innerHTML = "";

        // --- Measurement mode radio buttons ---
        const modeDiv = this.createElement("div", { marginBottom: "8px", marginLeft: "10px", marginTop: "10px", color: "white" });
        modeDiv.innerHTML = `
            <label>
                <input type="radio" name="measurement-mode" value="two" checked>
                Two Point
            </label>
            <label style="margin-left: 16px;">
                <input type="radio" name="measurement-mode" value="multi">
                Multi Point
            </label>
            <label style="margin-left: 16px;">
                <input type="radio" name="measurement-mode" value="angle">
                Angle
            </label>
            <label style="margin-left: 16px;">
                <input type="radio" name="measurement-mode" value="area">
                Area
            </label>
        `;
   

        // --- Measurement tool checkbox ---
        const label = this.createElement("label", {
            marginRight: "10px",
            color: "white",
        });

        const checkbox = this.createElement("input", {}) as HTMLInputElement;
        checkbox.type = "checkbox";
        checkbox.id = "measurement-toggle";

        label.appendChild(checkbox);
        label.appendChild(document.createTextNode(" Enable Measurement Tool"));

        const panel = this.createElement("div", {
            position: "absolute",
            display: "none",
            border: "1px solid block",
            padding: "5px",
            backgroundColor: "#00000063",
            borderRadius: "8px",
            cursor: "pointer",
            maxHeight: "215px",
            overflowY: "auto",
            scrollbarColor: "#00557c #222",
            marginTop: "5px"
        });
        panel.id = "measurement-tool-panel";

        this.container.appendChild(label);
        this.container.appendChild(modeDiv);
        this.container.appendChild(panel);
        
        // --- Checkbox event listener ---
        checkbox.addEventListener("change", () => {
            const enabled = checkbox.checked;
            this.dispatchEvent(new CustomEvent("toggle", { detail: { enabled } }));
            panel.style.display = enabled ? "block" : "none";
        });

        // Radio button change listener
        modeDiv.addEventListener("change", (e: Event) => {
            const target = e.target as HTMLInputElement;
            if (target && target.name === "measurement-mode") {
                this.dispatchEvent(new CustomEvent("mode-change", { 
                    detail: { mode: target.value } 
                }));
            }
        });

        // Create overlay for modal (only once)
        if (!document.getElementById("delete-alert-overlay")) {
            const overlay = this.createElement("div", {
                display: "none",
                position: "fixed",
                top: "0",
                left: "0",
                width: "100vw",
                height: "100vh",
                background: "rgba(0,0,0,0.5)",
                zIndex: "999",
                pointerEvents: "auto"
            });
            overlay.id = "delete-alert-overlay";
            document.body.appendChild(overlay);
        }
    }

    // Utility method for creating elements with styles
    private createElement(tag: string, styles: Record<string, string>): HTMLElement {
        const element = document.createElement(tag);
        Object.assign(element.style, styles);
        return element;
    }

    private measurementLines(lineEntity: pc.Entity): void {
        const panel = document.getElementById("measurement-tool-panel");
        if (!panel) return;

        const labelDiv = this.createElement("div", {
            padding: "6px 6px 8px 10px",
            margin: "4px",
            background: "#00557cff",
            borderRadius: "4px",
            color: "white"
        });
        
        labelDiv.id = lineEntity.name;
        labelDiv.textContent = lineEntity.name;

        const deleteBtn = this.createElement("button", {
            background: "#c51426ff",
            color: "white",
            padding: "2px 4px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            margin: "0px 0px 0px 20px",
            float: "right"
        }) as HTMLButtonElement;
        
        deleteBtn.textContent = "X";
        deleteBtn.onclick = () => {
            this.onDeleteMeasurement?.((labelDiv as any).lineEntity);
            console.log("line deleted");
        };

        labelDiv.appendChild(deleteBtn);
        panel.appendChild(labelDiv);

        // Store reference to line entity
        (labelDiv as any).lineEntity = lineEntity;
    }

    public showDeleteAlert(lineEntity: pc.Entity): void {
        this.selectedLine = lineEntity;
        const alert = document.getElementById("delete-alert");
        const overlay = document.getElementById("delete-alert-overlay");
        
        if (alert && overlay) {
            alert.style.display = "block";
            overlay.style.display = "block";
        }
    }

    public hideDeleteAlert(): void {
        const alert = document.getElementById("delete-alert");
        const overlay = document.getElementById("delete-alert-overlay");
        
        if (alert && overlay) {
            alert.style.display = "none";
            overlay.style.display = "none";
        }
    }

    public drawMeasurement(start: pc.Vec3, end: pc.Vec3, distance: number): void {
        //start.y = 0;
        //end.y = 0;
        const lineEntity = this.createLineEntity(
            `MeasurementLine ${this.count++} | ${distance.toFixed(2)}m`,
            start,
            end,
            MeasurementView.lineThickness,
            MeasurementView.measurementMaterial // Blue for two-point
        );
        console.log("Drawing line:", lineEntity.name);
        console.log("material:", MeasurementView.measurementMaterial);

        // Store points for deletion identification
        (lineEntity as any).start = start.clone();
        (lineEntity as any).end = end.clone();
        (lineEntity as any).points = [
            { x: start.x, y: start.y, z: start.z },
            { x: end.x, y: end.y, z: end.z }
        ];

        this.lineEntities.push(lineEntity);
        this.app.root.addChild(lineEntity);
        this.measurementLines(lineEntity);

        // --- 3D Text showing distance ---
        // Calculate midpoint
        const mid = new pc.Vec3().lerp(start, end, 0.5);

        const lineColor = new pc.Color(0, 0.333, 0.486);
        // Store the text entity reference on the line entity
        (lineEntity as any).textEntity = this.create3DTextLabel(`${distance.toFixed(2)}m`, mid, lineColor, 0.2);

        console.log('Drawing line from', start, 'to', end);
    }

    public drawPreviewLine(start: pc.Vec3, end: pc.Vec3): void {
        this.clearPreviewLine();
        this.previewLineEntity = this.createLineEntity(
            "PreviewCylinder",
            start,
            end,
            MeasurementView.lineThickness, // Use the shared thickness
            MeasurementView.previewMaterial
        );
        this.app.root.addChild(this.previewLineEntity);
    }

    // Optimized: Update existing preview line instead of recreating
    public updatePreviewLine(start: pc.Vec3, end: pc.Vec3): void {
        if (!this.previewLineEntity) {
            this.drawPreviewLine(start, end);
            return;
        }
        this.updateLineGeometry(
            this.previewLineEntity,
            start,
            end,
            MeasurementView.lineThickness // Use the shared thickness
        );
    }

    // Optimized: Shared line creation logic
    private createLineEntity(name: string, start: pc.Vec3, end: pc.Vec3, thickness: number, material: pc.StandardMaterial): pc.Entity {
        const lineEntity = new pc.Entity(name);
        lineEntity.addComponent("model", { type: "cylinder" });
        lineEntity.model!.material = material;
        this.updateLineGeometry(lineEntity, start, end, thickness);
        
        return lineEntity;
    }

    private getScreenSpaceThickness(worldPos: pc.Vec3, baseThickness: number): number {
        // Get camera position
        const cam = this.app.root.findByName("Camera") as pc.Entity;
        if (!cam || !cam.camera) return baseThickness;

        // Distance from camera to line midpoint
        const camPos = cam.getPosition();
        const dist = camPos.distance(worldPos);

        // Adjust this factor for your scene/camera FOV
        const scale = dist * 0.02; // 0.02 is an example, tweak as needed
        return Math.max(baseThickness, scale);
    }

    // Optimized: Shared geometry update logic
    private updateLineGeometry(entity: pc.Entity, start: pc.Vec3, end: pc.Vec3, baseThickness: number): void {
        const dir = end.clone().sub(start);
        const length = dir.length();
        const mid = new pc.Vec3().lerp(start, end, 0.5);

        // Use screen-space thickness
        const thickness = this.getScreenSpaceThickness(mid, baseThickness);

        entity.setLocalScale(thickness, length, thickness);
        entity.setPosition(mid);
        this.alignCylinder(entity, dir);
    }

    // Optimized: Faster cylinder alignment
    private alignCylinder(cylinder: pc.Entity, dir: pc.Vec3): void {
        const up = pc.Vec3.UP;
        const target = dir.clone().normalize();
        const dot = up.dot(target);

        // Handle edge cases first
        if (Math.abs(dot + 1) < 1e-8) {
            // Vector pointing down
            cylinder.setRotation(new pc.Quat().setFromAxisAngle(pc.Vec3.RIGHT, 180));
            return;
        }
        
        if (Math.abs(dot - 1) < 1e-8) {
            // Vector pointing up
            cylinder.setRotation(pc.Quat.IDENTITY);
            return;
        }

        // General case
        const axis = new pc.Vec3().cross(up, target).normalize();
        const angle = Math.acos(pc.math.clamp(dot, -1, 1)) * pc.math.RAD_TO_DEG;
        cylinder.setRotation(new pc.Quat().setFromAxisAngle(axis, angle));
    }

    public clearPreviewLine(): void {
        if (this.previewLineEntity) {
            this.previewLineEntity.destroy();
            this.previewLineEntity = null;
        }
    }

    public clearMeasurementLines(parent: HTMLElement): void {
        // Clear all measurement line UI elements
        const children = Array.from(parent.children);
        children.forEach(child => {
            if (child.id && (child.id.startsWith('MeasurementLine') || 
                            child.id.startsWith('MultiPointMeasurement') ||
                            child.id.startsWith('AngleMeasurement') ||
                            child.id.startsWith('AreaMeasurement'))) {
                child.remove();
            }
        });
    }

    public drawMultiPointMeasurement(points: pc.Vec3[], totalDistance: number): void {
        const groupName = `MultiPointMeasurement_${this.count++}`;
        const measurementGroup: pc.Entity[] = [];
        const lineColor = new pc.Color(0.353, 0.176, 0.510); // Purple, matches multiPointMaterial

        // Create line segments between consecutive points
        for (let i = 0; i < points.length - 1; i++) {
            const lineEntity = this.createLineEntity(
                `${groupName}_Segment_${i}`,
                points[i],
                points[i + 1],
                MeasurementView.lineThickness,
                MeasurementView.multiPointMaterial // Purple for multi-point
            );

            // Store measurement data
            (lineEntity as any).measurementGroup = groupName;
            (lineEntity as any).points = points.map(p => ({ x: p.x, y: p.y, z: p.z }));
            (lineEntity as any).totalDistance = totalDistance;
            (lineEntity as any).type = 'multi-point';
            (lineEntity as any).segmentIndex = i;

            measurementGroup.push(lineEntity);
            this.lineEntities.push(lineEntity);
            this.app.root.addChild(lineEntity);

            // --- 3D Text showing segment distance ---
            const segmentDistance = points[i].distance(points[i + 1]);
            const mid = new pc.Vec3().lerp(points[i], points[i + 1], 0.5);
            // Store the text entity reference on the line entity
            (lineEntity as any).textEntity = this.create3DTextLabel(`${segmentDistance.toFixed(2)}m`, mid, lineColor, 0.2);
        }

        // Create UI entry for the entire multi-point measurement
        this.createMultiPointMeasurementUI(groupName, totalDistance, measurementGroup);
    }

    private createMultiPointMeasurementUI(groupName: string, totalDistance: number, measurementGroup: pc.Entity[]): void {
        const panel = document.getElementById("measurement-tool-panel");
        if (!panel) return;

        const labelDiv = this.createElement("div", {
            padding: "6px 6px 8px 10px",
            margin: "4px",
            background: "#5a2d82", // Different color for multi-point (purple)
            borderRadius: "4px",
            color: "white"
        });
        
        labelDiv.id = groupName;
        labelDiv.textContent = `${groupName} | Total: ${totalDistance.toFixed(2)}m`;

        const deleteBtn = this.createElement("button", {
            background: "#c51426ff",
            color: "white",
            padding: "2px 4px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            margin: "0px 0px 0px 20px",
            float: "right"
        }) as HTMLButtonElement;
        
        deleteBtn.textContent = "X";
        deleteBtn.onclick = () => {
            this.onDeleteMeasurement?.(measurementGroup[0]); // Pass first segment for deletion
            console.log("Multi-point measurement deleted");
        };

        labelDiv.appendChild(deleteBtn);
        panel.appendChild(labelDiv);

        // Store reference to measurement group in first segment
        (labelDiv as any).measurementGroup = measurementGroup;
    }

    public drawAngleMeasurement(points: pc.Vec3[], angle: number): void {
        const groupName = `AngleMeasurement_${this.count++}`;
        const measurementGroup: pc.Entity[] = [];
        const angleColor = new pc.Color(0.831, 0.533, 0.024); // Orange, matches angleMaterial

        // Create two lines from vertex to the other points
        if (points.length >= 3) {
            // Line from first point to vertex (second point)
            const line1 = this.createLineEntity(
                `${groupName}_Line1`,
                points[0],
                points[1],
                MeasurementView.lineThickness,
                MeasurementView.angleMaterial // Orange for angle
            );

            // Line from vertex to third point
            const line2 = this.createLineEntity(
                `${groupName}_Line2`,
                points[1],
                points[2],
                MeasurementView.lineThickness,
                MeasurementView.angleMaterial // Orange for angle
            );

            // Store measurement data
            [line1, line2].forEach((lineEntity, index) => {
                (lineEntity as any).measurementGroup = groupName;
                (lineEntity as any).points = points.map(p => ({ x: p.x, y: p.y, z: p.z }));
                (lineEntity as any).angle = angle;
                (lineEntity as any).type = 'angle';
                (lineEntity as any).segmentIndex = index;

                measurementGroup.push(lineEntity);
                this.lineEntities.push(lineEntity);
                this.app.root.addChild(lineEntity);
            });

            // --- 3D Text showing angle ---
            const vertex = points[1];
            const dir1 = points[0].clone().sub(vertex).normalize();
            const dir2 = points[2].clone().sub(vertex).normalize();
            const offsetDir = dir1.add(dir2).normalize();
            const labelPos = vertex.clone().add(offsetDir.mulScalar(0.5)).add(new pc.Vec3(0, 0.2, 0));
            // Store the text entity reference on the first line entity
            const textEntity = this.create3DTextLabel(`${angle.toFixed(1)}°`, labelPos, angleColor, 0);
            (measurementGroup[0] as any).textEntity = textEntity;
        }

        // Create UI entry for the angle measurement
        this.createAngleMeasurementUI(groupName, angle, measurementGroup);
    }

    private createAngleMeasurementUI(groupName: string, angle: number, measurementGroup: pc.Entity[]): void {
        const panel = document.getElementById("measurement-tool-panel");
        if (!panel) return;

        const labelDiv = this.createElement("div", {
            padding: "6px 6px 8px 10px",
            margin: "4px",
            background: "#d48806", // Orange color for angle measurements
            borderRadius: "4px",
            color: "white"
        });
        
        labelDiv.id = groupName;
        labelDiv.textContent = `${groupName} | Angle: ${angle.toFixed(1)}°`;

        const deleteBtn = this.createElement("button", {
            background: "#c51426ff",
            color: "white",
            padding: "2px 4px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            margin: "0px 0px 0px 20px",
            float: "right"
        }) as HTMLButtonElement;
        
        deleteBtn.textContent = "X";
        deleteBtn.onclick = () => {
            this.onDeleteMeasurement?.(measurementGroup[0]); // Pass first segment for deletion
            console.log("Angle measurement deleted");
        };

        labelDiv.appendChild(deleteBtn);
        panel.appendChild(labelDiv);

        // Store reference to measurement group in first segment
        (labelDiv as any).measurementGroup = measurementGroup;
    }

    public drawAreaMeasurement(points: pc.Vec3[], area: number): void {
        const groupName = `AreaMeasurement_${this.count++}`;
        const measurementGroup: pc.Entity[] = [];
        const areaColor = new pc.Color(0.133, 0.545, 0.133); // Green, matches areaMaterial

        // Create polygon edges
        if (points.length >= 3) {
            for (let i = 0; i < points.length; i++) {
                const nextIndex = (i + 1) % points.length;
                const lineEntity = this.createLineEntity(
                    `${groupName}_Edge_${i}`,
                    points[i],
                    points[nextIndex],
                    MeasurementView.lineThickness,
                    MeasurementView.areaMaterial // Green for area
                );

                // Store measurement data
                (lineEntity as any).measurementGroup = groupName;
                (lineEntity as any).points = points.map(p => ({ x: p.x, y: p.y, z: p.z }));
                (lineEntity as any).area = area;
                (lineEntity as any).type = 'area';
                (lineEntity as any).edgeIndex = i;
                
                measurementGroup.push(lineEntity);
                this.lineEntities.push(lineEntity);
                this.app.root.addChild(lineEntity);
            }

            // --- 3D Text showing area ---
            // Calculate centroid of the polygon (average of all points)
            let centroid = new pc.Vec3(0, 0, 0);
            points.forEach(p => centroid.add(p));
            centroid.mulScalar(1 / points.length);
            centroid.y += 0.2;
            // Store the text entity reference on the first line entity
            const textEntity = this.create3DTextLabel(`${area.toFixed(2)}m²`, centroid, areaColor, 0);
            (measurementGroup[0] as any).textEntity = textEntity;
        }

        // Create UI entry for the area measurement
        this.createAreaMeasurementUI(groupName, area, measurementGroup);
    }

    private createAreaMeasurementUI(groupName: string, area: number, measurementGroup: pc.Entity[]): void {
        const panel = document.getElementById("measurement-tool-panel");
        if (!panel) return;

        const labelDiv = this.createElement("div", {
            padding: "6px 6px 8px 10px",
            margin: "4px",
            background: "#228B22", // Green color for area measurements
            borderRadius: "4px",
            color: "white"
        });
        
        labelDiv.id = groupName;
        labelDiv.textContent = `${groupName} | Area: ${area.toFixed(2)}m²`;

        const deleteBtn = this.createElement("button", {
            background: "#c51426ff",
            color: "white",
            padding: "2px 4px",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            margin: "0px 0px 0px 20px",
            float: "right"
        }) as HTMLButtonElement;
        
        deleteBtn.textContent = "X";
        deleteBtn.onclick = () => {
            this.onDeleteMeasurement?.(measurementGroup[0]); // Pass first segment for deletion
            console.log("Area measurement deleted");
        };

        labelDiv.appendChild(deleteBtn);
        panel.appendChild(labelDiv);

        // Store reference to measurement group in first segment
        (labelDiv as any).measurementGroup = measurementGroup;
    }

    public drawCurrentMultiPointLines(lines: [pc.Vec3, pc.Vec3][]): void {
        // Clear existing current lines
        this.clearCurrentMultiPointLines();
        
        // Draw all current line segments
        lines.forEach((line, index) => {
            const lineEntity = this.createLineEntity(
                `CurrentMultiLine_${index}`,
                line[0],
                line[1],
                MeasurementView.lineThickness,
                MeasurementView.multiPointMaterial // Purple for multi-point preview
            );
            
            this.currentMultiPointLines.push(lineEntity);
            this.app.root.addChild(lineEntity);
        });
    }

    public drawCurrentAngleLines(lines: [pc.Vec3, pc.Vec3][]): void {
        // Clear existing current lines
        this.clearCurrentAngleLines();
        
        // Draw all current line segments
        lines.forEach((line, index) => {
            const lineEntity = this.createLineEntity(
                `CurrentAngleLine_${index}`,
                line[0],
                line[1],
                MeasurementView.lineThickness,
                MeasurementView.angleMaterial // Orange for angle preview
            );
            
            this.currentAngleLines.push(lineEntity);
            this.app.root.addChild(lineEntity);
        });
    }

    public drawCurrentAreaLines(lines: [pc.Vec3, pc.Vec3][]): void {
        // Clear existing current lines
        this.clearCurrentAreaLines();
        
        // Draw all current line segments
        lines.forEach((line, index) => {
            const lineEntity = this.createLineEntity(
                `CurrentAreaLine_${index}`,
                line[0],
                line[1],
                MeasurementView.lineThickness,
                MeasurementView.areaMaterial // Green for area preview
            );
            
            this.currentAreaLines.push(lineEntity);
            this.app.root.addChild(lineEntity);
        });
    }

    public clearCurrentMultiPointLines(): void {
        this.currentMultiPointLines.forEach(line => {
            if (line.parent) line.parent.removeChild(line);
            line.destroy();
        });
        this.currentMultiPointLines.length = 0;
    }

    public clearCurrentAngleLines(): void {
        this.currentAngleLines.forEach(line => {
            if (line.parent) line.parent.removeChild(line);
            line.destroy();
        });
        this.currentAngleLines.length = 0;
    }

    public clearCurrentAreaLines(): void {
        this.currentAreaLines.forEach(line => {
            if (line.parent) line.parent.removeChild(line);
            line.destroy();
        });
        this.currentAreaLines.length = 0;
    }

    public clearAll3DLines(): void {
        // Clear regular lines
        this.lineEntities.forEach(line => {
            if (line.parent) line.parent.removeChild(line);
            line.destroy();
        });
        this.lineEntities.length = 0;

        // Clear current multi-point lines
        this.clearCurrentMultiPointLines();
        
        // Clear current angle lines
        this.clearCurrentAngleLines();
        
        // Clear current area lines
        this.clearCurrentAreaLines();
    }

    // Add this missing method
    public getMeasurementPanel(): HTMLElement | null {
        return document.getElementById("measurement-tool-panel");
    }

    private create3DTextLabel(
        text: string,
        position: pc.Vec3,
        color: pc.Color = new pc.Color(0, 1, 0),
        yOffset: number = 0.2
    ): pc.Entity | undefined {
        if (!this.fontAsset) return;

        // Create screen entity for 3D text
        const screen = new pc.Entity(`MeasurementTextScreen_${this.count}`);
        screen.addComponent("screen", {
            screenSpace: false,
            referenceResolution: new pc.Vec2(1280, 720),
            scaleMode: pc.SCALEMODE_NONE,
        });
        screen.setLocalPosition(position.x, position.y + yOffset, position.z);
        screen.setLocalScale(0.004, 0.004, 0.004);
        this.app.root.addChild(screen);

        // Add text label
        const textEntity = new pc.Entity(`MeasurementText_${this.count}`);
        textEntity.addComponent("element", {
            type: pc.ELEMENTTYPE_TEXT,
            text: text,
            fontAsset: this.fontAsset,
            fontSize: 64,
            color: color,
            pivot: new pc.Vec2(0.5, 0.5),
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            alignment: new pc.Vec2(0.5, 0.5),
            width: 400,
            height: 100,
        });
        screen.addChild(textEntity);

        // // Billboard the text to face the active camera every frame
        // this.app.on("update", () => {
        //     const activeCamera = cameraManager.getActiveCamera?.() || cameraManager.activeCamera;
        //     // If activeCamera has a cameraEntity property, use it; otherwise, use activeCamera itself
        //     const cameraEntity = (activeCamera && 'cameraEntity' in activeCamera)
        //         ? (activeCamera as any).cameraEntity
        //         : activeCamera;
        //     if (cameraEntity && screen) {
        //         screen.lookAt(cameraEntity.getPosition());
        //         screen.rotateLocal(0, 180, 0);
        //     }
        // });

        return screen;
    }
}