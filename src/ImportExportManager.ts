import * as pc from "playcanvas";

/**
 * Minimal GLTF importer for PlayCanvas.
 * Usage:
 *   import { importGltfModel } from "./ImportExportManager";
 *   importGltfModel(app, "/models/2CylinderEngine/2CylinderEngine.gltf", "2CylinderEngine.gltf", (entity) => { ... });
 */
export function importGltfModel(
    app: pc.Application,
    url: string,
    filename: string = "model.gltf",
    onLoaded?: (entity: pc.Entity) => void
): void {
    console.log(`Attempting to load GLTF from: ${url} as ${filename}`);
    app.assets.loadFromUrlAndFilename(url, filename, "container", (err, asset) => {
        if (err || !asset) {
            console.error("Failed to load asset:", err);
            // Extra debug: fetch the file directly to see what is returned
            fetch(url)
                .then(res => res.text())
                .then(text => {
                    console.warn("Direct fetch result (first 200 chars):", text.slice(0, 200));
                });
            return;
        }
        const container = asset.resource as pc.ContainerResource;
        if (!container) {
            console.error("Asset loaded but no container resource found.");
            return;
        }
        const entity = container.instantiateRenderEntity();

        // Center and scale the model
        entity.setPosition(0, 10, 0); // Center on plane
        entity.setLocalScale(0.1, 0.1, 0.1); // Adjust scale as needed

        app.root.addChild(entity);
        console.log("GLTF model loaded and added to scene:", entity.name);

        if (onLoaded) {
            onLoaded(entity);
        }
    });
}