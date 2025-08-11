import * as pc from 'playcanvas';

export class ColorBufferPicker {
    private app: pc.Application;
    private canvas: HTMLCanvasElement;
    private colorBuffer: pc.Texture;
    private renderTarget: pc.RenderTarget;
    private shader: pc.ShaderMaterial;

    constructor(app: pc.Application, canvas: HTMLCanvasElement, range: number = 200) {
        this.app = app;
        this.canvas = canvas;
        
        this.colorBuffer = new pc.Texture(app.graphicsDevice, {
            width: app.graphicsDevice.width,
            height: app.graphicsDevice.height,
            format: pc.PIXELFORMAT_R8_G8_B8_A8,
            mipmaps: false
        });

        this.renderTarget = new pc.RenderTarget({
            colorBuffer: this.colorBuffer,
            depth: true
        });

        this.shader = new pc.ShaderMaterial({
            uniqueName: "worldPosShader",
            attributes: { aPosition: pc.SEMANTIC_POSITION },
            vertexGLSL: `
                attribute vec3 aPosition;
                uniform mat4 matrix_model;
                uniform mat4 matrix_viewProjection;
                varying vec3 vWorldPos;
                void main(void) {
                    vec4 worldPosition = matrix_model * vec4(aPosition, 1.0);
                    vWorldPos = worldPosition.xyz;
                    gl_Position = matrix_viewProjection * worldPosition;
                }
            `,
            fragmentGLSL: `
                precision highp float;
                varying vec3 vWorldPos;
                void main(void) {
                    vec3 encoded = (vWorldPos + ${range/2}.0) / ${range}.0;
                    gl_FragColor = vec4(clamp(encoded, 0.0, 1.0), 1.0);
                }
            `
        });
    }
    // Helper to collect all meshInstances and their original materials from an entity hierarchy
    private collectMeshInstances(entity: pc.Entity): { meshInstance: pc.MeshInstance, originalMaterial: pc.Material }[] {
        const result: { meshInstance: pc.MeshInstance, originalMaterial: pc.Material }[] = [];
        if (entity.render && entity.render.meshInstances) {
            for (const mi of entity.render.meshInstances) {
                result.push({ meshInstance: mi, originalMaterial: mi.material });
            }
        }
        for (const child of entity.children) {
            if (child instanceof pc.Entity) {
                result.push(...this.collectMeshInstances(child));
            }
        }
        return result;
    }

    getWorldPos(event: pc.MouseEvent, camera: pc.Entity, targets: pc.Entity[], range: number = 200): pc.Vec3 | null {
        if (!camera.camera || !targets) return null;

            // Collect all meshInstances from all targets
        const meshData: { meshInstance: pc.MeshInstance, originalMaterial: pc.Material }[] = [];
        for (const target of targets) {
            meshData.push(...this.collectMeshInstances(target));
        }

        if (meshData.length === 0) return null;

        // Replace all materials with the picking shader
        for (const { meshInstance } of meshData) {
            meshInstance.material = this.shader;
        }

        const origRT = camera.camera.renderTarget;
        camera.camera.renderTarget = this.renderTarget;
        this.app.render();

        const gl = (this.app.graphicsDevice as any).gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, (this.renderTarget as any)._glFrameBuffer);

        const rect = this.canvas.getBoundingClientRect();
        const x = Math.floor((event.x - rect.left) * (this.colorBuffer.width / this.canvas.clientWidth));
        const y = Math.floor((this.canvas.clientHeight - (event.y - rect.top)) * (this.colorBuffer.height / this.canvas.clientHeight));

        const pixel = new Uint8Array(4);
        gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        // Restore original materials
        for (const { meshInstance, originalMaterial } of meshData) {
            meshInstance.material = originalMaterial;
        }
        camera.camera.renderTarget = origRT;

        if (pixel[3] === 0) return null;

        return new pc.Vec3(
            (pixel[0] / 255) * range - range/2,
            (pixel[1] / 255) * range - range/2,
            (pixel[2] / 255) * range - range/2
        );
    }
}