export interface DroneTelemetry {
    sys_id: number;
    data: {
        global_position: { lat: number; lon: number; alt?: number };
        global_direction: { x: number; y: number; z?: number };
        [key: string]: any;
    };
}

export async function fetchActiveDrones(): Promise<DroneTelemetry[]> {
    try {
        const res = await fetch('http://localhost:8000/telemetry/active');
        if (!res.ok) return [];
        return await res.json();
    } catch (e) {
        console.error("Telemetry fetch error:", e);
        return [];
    }
}