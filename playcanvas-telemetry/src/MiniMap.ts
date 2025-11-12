import { EventBus } from "./EventBus";
import { fetchActiveDrones } from "./TelemetryService";
import * as L from 'leaflet';

export class MiniMap {
    private map: L.Map;
    private droneMarkers: Record<number, L.Marker> = {};
    private updateInterval: number = 5000;
    private intervalId: number | null = null;
    private containerId: string;
    private isExpanded: boolean = false;

    constructor(containerId: string = "mini-map") {
        this.containerId = containerId;
        this.createMiniMapDiv();
        this.map = this.InitializeLeafletMap();

        this.start();
    }

    private createMiniMapDiv() {
        if (document.getElementById(this.containerId)) return; // Already exists

        const div = document.createElement('div');
        div.id = this.containerId;
        div.style.position = "absolute";
        div.style.bottom = "16px";
        div.style.right = "16px";
        div.style.width = "240px";
        div.style.height = "180px";
        div.style.zIndex = "20";
        div.style.border = "2px solid #444";
        div.style.borderRadius = "8px";
        div.style.overflow = "hidden";
        div.style.boxShadow = "0 2px 8px rgba(0,0,0,0.2)";
        div.style.background = "#fff";
        
        // Signal others when mouse is over the div
        div.onmouseenter = () => EventBus.emit("ui:focus", true);
        div.onmouseleave = () => EventBus.emit("ui:focus", false);

        // Expand/collapse button
        const btn = document.createElement('button');
        btn.innerHTML = "&#x26F6;"; // Unicode for expand arrows
        btn.title = "Expand/Collapse";
        btn.style.position = "absolute";
        btn.style.top = "6px";
        btn.style.right = "6px";
        btn.style.zIndex = "1001";
        btn.style.background = "#ffffffff";
        btn.style.border = "1px solid #888";
        btn.style.borderRadius = "4px";
        btn.style.padding = "2px 6px";
        btn.style.cursor = "pointer";
        btn.style.fontSize = "18px";
        btn.style.opacity = "0.8";
        btn.style.transition = "opacity 0.2s";
        btn.onmouseenter = () => btn.style.opacity = "1";
        btn.onmouseleave = () => btn.style.opacity = "0.8";

        btn.addEventListener('click', () => this.toggleExpand());

        div.appendChild(btn);
        document.body.appendChild(div);
    }

    private toggleExpand() {
        const div = document.getElementById(this.containerId);
        if (!div) return;
        this.isExpanded = !this.isExpanded;

        if (this.isExpanded) {
            div.style.position = "fixed";
            div.style.top = "0";
            div.style.left = "0";
            div.style.bottom = "0";
            div.style.right = "0";
            div.style.width = "100vw";
            div.style.height = "100vh";
            div.style.borderRadius = "0";
            div.style.border = "none";
            div.style.zIndex = "1000";
        } else {
            div.style.position = "absolute";
            div.style.bottom = "16px";
            div.style.right = "16px";
            div.style.top = "";
            div.style.left = "";
            div.style.width = "240px";
            div.style.height = "180px";
            div.style.borderRadius = "8px";
            div.style.border = "2px solid #444";
            div.style.zIndex = "20";
        }
        // Notify Leaflet to resize
        setTimeout(() => this.map.invalidateSize(), 300);
    }

    private InitializeLeafletMap(): L.Map {
        const map = L.map(this.containerId, {
            zoomControl: false,
            attributionControl: false,
            dragging: true,
            scrollWheelZoom: true,
            doubleClickZoom: false,
            boxZoom: false,
            keyboard: false,
        }).setView([49.87165, 8.64361], 17); // Center on HardByte GmbH

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            maxZoom: 19,
        }).addTo(map);

        return map;
    }

    private async updateDrones() {
        const drones = await fetchActiveDrones();

        // Remove markers for drones no longer present
        for (const id in this.droneMarkers) {
            if (!drones.find(d => d.sys_id === Number(id))) {
                this.map.removeLayer(this.droneMarkers[id]);
                delete this.droneMarkers[id];
            }
        }

        // Add or update markers
        for (const { sys_id, data } of drones) {
            const heading = Math.atan2(data.global_direction.y, data.global_direction.x) * 180 / Math.PI;
            const color = sys_id === 1 ? 'blue' : 'green';
            const arrowIcon = L.divIcon({
                className: '',
                html: `
                    <svg width="32" height="32" style="transform: rotate(${heading}deg);" viewBox="0 0 32 32">
                        <polygon points="16,4 28,28 16,22 4,28" fill="${color}" stroke="black" stroke-width="2"/>
                    </svg>
                `,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
            });

            // Simulate movement (use data.global_position in production)
            const randomLat = data.global_position.lat + (Math.random() - 0.5) * 0.001;
            const randomLon = data.global_position.lon + (Math.random() - 0.5) * 0.001;
            
            // Use actual position (no random jitter for production)
            //const lat = data.global_position.lat;
            //const lon = data.global_position.lon;
            const lat = randomLat;
            const lon = randomLon;


            if (!this.droneMarkers[sys_id]) {
                this.droneMarkers[sys_id] = L.marker([lat, lon], { icon: arrowIcon })
                    .addTo(this.map)
                    .bindPopup(`${data.name ?? 'Drone ' + sys_id}<br>Heading: ${heading.toFixed(1)}°`);
            } else {
                this.droneMarkers[sys_id].setLatLng([lat, lon]);
                this.droneMarkers[sys_id].setIcon(arrowIcon);
                this.droneMarkers[sys_id].setPopupContent(`${data.name ?? 'Drone ' + sys_id}<br>Heading: ${heading.toFixed(1)}°`);
            }
        }
    }

    public start() {
        this.updateDrones();
        this.intervalId = window.setInterval(() => this.updateDrones(), this.updateInterval);
    }

    public stop() {
        if (this.intervalId !== null) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }
}