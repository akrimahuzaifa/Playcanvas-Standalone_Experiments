import * as pc from "playcanvas";


export interface Measurement {
    points?: pc.Vec3[];
    distance: number;
    name?: string;
    type?: 'two-point' | 'multi-point' | 'angle' | 'area';
    totalLength?: number;
    angle?: number; // For angle measurements
    area?: number; // For area measurements
}

export class MeasurementManager {
    public measurements: Measurement[] = [];
    public currentPoints: pc.Vec3[] = [];
    public measurementMode: 'two-point' | 'multi-point' | 'angle' | 'area' = 'two-point';

    setMeasurementMode(mode: 'two-point' | 'multi-point' | 'angle' | 'area'): void {
        this.measurementMode = mode;
        this.currentPoints = []; // Clear current points when switching modes
    }

    addPoint(point: pc.Vec3): boolean {
        this.currentPoints.push(point);
        
        if (this.measurementMode === 'two-point') {
            if (this.currentPoints.length === 2) {
                // Create two-point measurement
                const measurement: Measurement = {
                    points: [this.currentPoints[0], this.currentPoints[1]],
                    distance: this.currentPoints[0].distance(this.currentPoints[1]),
                    type: 'two-point'
                };
                this.measurements.push(measurement);
                this.currentPoints = [];
                return true; // Measurement completed
            }
        } else if (this.measurementMode === 'angle') {
            if (this.currentPoints.length === 3) {
                // Create angle measurement
                const angle = this.calculateAngle(
                    this.currentPoints[0], 
                    this.currentPoints[1], 
                    this.currentPoints[2]
                );
                const measurement: Measurement = {
                    points: [...this.currentPoints],
                    distance: 0, // Not applicable for angle
                    angle: angle,
                    type: 'angle'
                };
                this.measurements.push(measurement);
                this.currentPoints = [];
                return true; // Measurement completed
            }
        }
        // For multi-point and area, we don't auto-complete, user must call completeMeasurement
        return false;
    }

    // Calculate angle between three points (vertex at point 2)
    private calculateAngle(point1: pc.Vec3, vertex: pc.Vec3, point3: pc.Vec3): number {
        const vector1 = point1.clone().sub(vertex);
        const vector2 = point3.clone().sub(vertex);
        
        const dot = vector1.dot(vector2);
        const magnitude1 = vector1.length();
        const magnitude2 = vector2.length();
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        const cosAngle = dot / (magnitude1 * magnitude2);
        const angleRadians = Math.acos(Math.max(-1, Math.min(1, cosAngle)));
        return angleRadians * (180 / Math.PI); // Convert to degrees
    }

    // Calculate area of polygon using shoelace formula
    private calculatePolygonArea(points: pc.Vec3[]): number {
        if (points.length < 3) return 0;
        
        // Project points to 2D for area calculation
        // Find the best plane to project onto
        const normal = this.calculatePolygonNormal(points);
        const absNormal = new pc.Vec3(Math.abs(normal.x), Math.abs(normal.y), Math.abs(normal.z));
        
        let area = 0;
        
        // Choose projection plane based on largest normal component
        if (absNormal.z >= absNormal.x && absNormal.z >= absNormal.y) {
            // Project onto XY plane
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                area += points[i].x * points[j].y;
                area -= points[j].x * points[i].y;
            }
        } else if (absNormal.y >= absNormal.x && absNormal.y >= absNormal.z) {
            // Project onto XZ plane
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                area += points[i].x * points[j].z;
                area -= points[j].x * points[i].z;
            }
        } else {
            // Project onto YZ plane
            for (let i = 0; i < points.length; i++) {
                const j = (i + 1) % points.length;
                area += points[i].y * points[j].z;
                area -= points[j].y * points[i].z;
            }
        }
        
        return Math.abs(area) / 2;
    }

    // Calculate polygon normal for area calculation
    private calculatePolygonNormal(points: pc.Vec3[]): pc.Vec3 {
        if (points.length < 3) return pc.Vec3.UP;
        
        const normal = new pc.Vec3();
        for (let i = 0; i < points.length; i++) {
            const current = points[i];
            const next = points[(i + 1) % points.length];
            
            normal.x += (current.y - next.y) * (current.z + next.z);
            normal.y += (current.z - next.z) * (current.x + next.x);
            normal.z += (current.x - next.x) * (current.y + next.y);
        }
        
        return normal.normalize();
    }

    // Complete multi-point measurement manually
    completeMeasurement(): boolean {
        if (this.measurementMode === 'multi-point' && this.currentPoints.length >= 2) {
            let totalDistance = 0;
            for (let i = 0; i < this.currentPoints.length - 1; i++) {
                totalDistance += this.currentPoints[i].distance(this.currentPoints[i + 1]);
            }
            
            const measurement: Measurement = {
                points: [...this.currentPoints],
                distance: totalDistance,
                totalLength: totalDistance,
                type: 'multi-point'
            };
            this.measurements.push(measurement);
            this.currentPoints = [];
            return true;
        } else if (this.measurementMode === 'area' && this.currentPoints.length >= 3) {
            const area = this.calculatePolygonArea(this.currentPoints);
            
            const measurement: Measurement = {
                points: [...this.currentPoints],
                distance: 0, // Not applicable for area
                area: area,
                type: 'area'
            };
            this.measurements.push(measurement);
            this.currentPoints = [];
            return true;
        }
        return false;
    }

    clear() {
        this.measurements = [];
        this.currentPoints = [];
    }

    getPreviewLine(mousePoint: pc.Vec3): [pc.Vec3, pc.Vec3] | null {
        if (this.currentPoints.length >= 1) {
            const lastPoint = this.currentPoints[this.currentPoints.length - 1];
            return [lastPoint, mousePoint];
        }
        return null;
    }

    getCurrentLines(): [pc.Vec3, pc.Vec3][] {
        if (this.currentPoints.length < 2) return [];
        
        const lines: [pc.Vec3, pc.Vec3][] = [];
        
        if (this.measurementMode === 'angle') {
            // For angle mode, draw lines from vertex to other points
            if (this.currentPoints.length >= 2) {
                // First line from first point to second point (vertex)
                lines.push([this.currentPoints[0], this.currentPoints[1]]);
            }
            if (this.currentPoints.length >= 3) {
                // Second line from vertex to third point
                lines.push([this.currentPoints[1], this.currentPoints[2]]);
            }
        } else if (this.measurementMode === 'area') {
            // For area mode, connect all points to form polygon edges
            for (let i = 0; i < this.currentPoints.length - 1; i++) {
                lines.push([this.currentPoints[i], this.currentPoints[i + 1]]);
            }
            // If we have 3+ points, also show closing line as preview
            if (this.currentPoints.length >= 3) {
                lines.push([this.currentPoints[this.currentPoints.length - 1], this.currentPoints[0]]);
            }
        } else {
            // For multi-point mode, connect consecutive points
            for (let i = 0; i < this.currentPoints.length - 1; i++) {
                lines.push([this.currentPoints[i], this.currentPoints[i + 1]]);
            }
        }
        return lines;
    }

    public loadMeasurementsFromLocalStorage() {
        const saved = localStorage.getItem('measurements');
        if (saved) {
            this.measurements = JSON.parse(saved);
        }
    }
}