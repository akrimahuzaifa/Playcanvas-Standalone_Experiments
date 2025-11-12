# DroneMap PlayCanvas Frontend

This project is a 3D/2D drone visualization tool built with PlayCanvas and Leaflet. It displays live drone telemetry from a backend API, showing drone positions and headings in both a 3D scene and a 2D mini-map overlay.

## Features

- **3D Visualization:** Drones are rendered as 3D models in a PlayCanvas scene, with real-time position and heading updates.
- **2D Mini-Map:** Leaflet-based mini-map overlays the 3D view, showing drone locations and headings with SVG icons.
- **Live Telemetry:** Periodically fetches drone data from a backend API (`/telemetry/active`).
- **Expand/Collapse Mini-Map:** Mini-map can be toggled between overlay and fullscreen modes.
- **UI/Camera Decoupling:** Camera controls are paused when the mouse is over any UI element (e.g., mini-map), using a project-wide event bus.
- **Modular Architecture:** All mini-map and camera logic is encapsulated in dedicated classes for maintainability.

## Getting Started

### Prerequisites
- Node.js (for running a local server)
- PlayCanvas and Leaflet dependencies (installed via CDN or npm)
- Backend API serving drone telemetry at `http://localhost:8000/telemetry/active`

### Installation
1. Clone the repository.
2. Install dependencies:
   ```
   npm install
   ```
3. Start a local server:
   ```
   npx vite
   ```

### Project Structure
- `src/`
  - `Drones.ts` — 3D drone logic
  - `MiniMap.ts` — Leaflet mini-map logic
  - `CamFly.ts` — Fly camera controls
  - `EventBus.ts` — Event delegation for UI/camera interaction
  - `TelemetryService.ts` — Shared telemetry fetch logic
  - `Environment.ts` — Scene/environment setup
- `public/models/` — 3D model files (GLB)
- `index.html` — Main HTML entry point
- `main.ts` — Application bootstrap

## Usage
- Drones will appear in both the 3D scene and the mini-map as telemetry is received.
- Use the expand button on the mini-map to toggle fullscreen mode.
- Camera controls are disabled when the mouse is over the mini-map or any UI overlay.

## Customization
- To add more UI overlays, emit `"ui:focus"` events via the `EventBus` for consistent camera/UI interaction.
- To change drone models or icons, update the files in `public/models/` and the SVG logic in `MiniMap.ts`.

