import * as pc from 'playcanvas';

export class ColorBufferPicker {
    private app: pc.Application;
    private canvas: HTMLCanvasElement;
    private colorBuffer: pc.Texture;
    private renderTarget: pc.RenderTarget;
    private shader: pc.ShaderMaterial;
    private pickingCamera: pc.Entity; // Separate camera for picking

    constructor(app: pc.Application, canvas: HTMLCanvasElement) {
        this.app = app;
        this.canvas = canvas;

        // Create higher precision color buffer texture for better depth encoding
        this.colorBuffer = new pc.Texture(app.graphicsDevice, {
            width: app.graphicsDevice.width,
            height: app.graphicsDevice.height,
            format: pc.PIXELFORMAT_R8_G8_B8_A8,
            mipmaps: false,
            minFilter: pc.FILTER_NEAREST,
            magFilter: pc.FILTER_NEAREST
        });

        // Create render target
        this.renderTarget = new pc.RenderTarget({
            colorBuffer: this.colorBuffer,
            depth: true
        });

        // Create depth shader
        this.shader = this.createDepthShader();
        
        // Create a separate camera entity for picking (doesn't affect main camera)
        this.pickingCamera = new pc.Entity("PickingCamera");
        this.pickingCamera.addComponent("camera", {
            clearColor: new pc.Color(0, 0, 0, 0),
            renderTarget: this.renderTarget
        });
        this.app.root.addChild(this.pickingCamera);
    }

    private createDepthShader(): pc.ShaderMaterial {
        return new pc.ShaderMaterial({
            uniqueName: 'depthPickingShader',
            attributes: { aPosition: pc.SEMANTIC_POSITION },
            vertexGLSL: `
                attribute vec3 aPosition;
                uniform mat4 matrix_model;
                uniform mat4 matrix_viewProjection;
                uniform mat4 matrix_view;
                uniform float uNearClip;
                uniform float uFarClip;
                varying float vNormalizedDepth;
                varying vec3 vWorldPosition;
                
                void main(void) {
                    vec4 worldPosition = matrix_model * vec4(aPosition, 1.0);
                    vec4 viewPosition = matrix_view * worldPosition;
                    gl_Position = matrix_viewProjection * worldPosition;
                    
                    vWorldPosition = worldPosition.xyz;
                    float depth = gl_Position.w;
                    vNormalizedDepth = clamp((depth - uNearClip) / (uFarClip - uNearClip), 0.0, 1.0);
                }
            `,
            fragmentGLSL: `
                precision highp float;
                varying float vNormalizedDepth;
                varying vec3 vWorldPosition;
                
                vec4 float2vec4(float value) {
                    value = clamp(value, 0.0, 0.999999);
                    
                    float r = floor(value * 255.0) / 255.0;
                    float g = floor(fract(value * 255.0) * 255.0) / 255.0;
                    float b = floor(fract(value * 255.0 * 255.0) * 255.0) / 255.0;
                    // Use alpha channel as target marker (255 = target object)
                    float a = 1.0; // Mark this as a valid target
                    
                    return vec4(r, g, b, a);
                }
                
                void main(void) {
                    gl_FragColor = float2vec4(vNormalizedDepth);
                }
            `
        });
    }

    // Recursively collect all meshInstances and their original materials from an entity hierarchy
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

    getWorldPos(event: pc.MouseEvent, camera: pc.Entity, targets: pc.Entity[], range?: number): pc.Vec3 | null {
        if (!camera.camera || !targets || targets.length === 0) return null;

        // Copy main camera properties to picking camera
        const mainCam = camera.camera;
        const pickCam = this.pickingCamera.camera!;
        
        pickCam.fov = mainCam.fov;
        pickCam.nearClip = 0.1;
        pickCam.farClip = range || mainCam.farClip;
        pickCam.aspectRatio = mainCam.aspectRatio;
        
        // Copy transform
        this.pickingCamera.setPosition(camera.getPosition());
        this.pickingCamera.setRotation(camera.getRotation());

        // Collect all meshInstances from all targets recursively
        const meshData: { meshInstance: pc.MeshInstance, originalMaterial: pc.Material }[] = [];
        for (const target of targets) {
            meshData.push(...this.collectMeshInstances(target));
        }
        if (meshData.length === 0) return null;

        const origRT = camera.camera.renderTarget;

        try {
            // Clear the render target first to ensure clean background
            const gl = (this.app.graphicsDevice as any).gl;
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderTarget.impl._glFrameBuffer);
            gl.clearColor(0, 0, 0, 0); // Clear with alpha = 0 (no target)
            gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            // Set shader uniforms for depth range with better precision
            const nearClip = camera.camera.nearClip;
            const farClip = range || camera.camera.farClip;

            this.shader.setParameter('uNearClip', nearClip);
            this.shader.setParameter('uFarClip', farClip);

            // Replace all meshInstance materials with the picking shader
            for (const { meshInstance } of meshData) {
                meshInstance.material = this.shader;
            }

            camera.camera.renderTarget = this.renderTarget;
            this.app.render();

            // More accurate pixel coordinate calculation
            const rect = this.canvas.getBoundingClientRect();
            const devicePixelRatio = window.devicePixelRatio || 1;
            
            const canvasWidth = this.colorBuffer.width;
            const canvasHeight = this.colorBuffer.height;
            
            const pixelX = Math.floor((event.x - rect.left) * devicePixelRatio * (canvasWidth / (rect.width * devicePixelRatio)));
            const pixelY = Math.floor((rect.height - (event.y - rect.top)) * devicePixelRatio * (canvasHeight / (rect.height * devicePixelRatio)));

            const clampedX = Math.max(0, Math.min(canvasWidth - 1, pixelX));
            const clampedY = Math.max(0, Math.min(canvasHeight - 1, pixelY));

            // Read pixel data
            gl.bindFramebuffer(gl.FRAMEBUFFER, this.renderTarget.impl._glFrameBuffer);
            const pixel = new Uint8Array(4);
            gl.readPixels(clampedX, clampedY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
            gl.bindFramebuffer(gl.FRAMEBUFFER, null);

            // Check if we hit a target object (alpha should be 255 for targets, 0 for background)
            if (pixel[3] === 0) {
                return null;
            }

            // Additional validation: check if we have valid depth data
            if (pixel[0] === 0 && pixel[1] === 0 && pixel[2] === 0) {
                return null;
            }

            // Decode with higher precision and convert to world position
            const normalizedDepth = this.vec4ToFloat(pixel);
            const linearDepth = nearClip + normalizedDepth * (farClip - nearClip);

            return this.depthToWorldPosition(event, camera, linearDepth);

        } finally {
            // Restore original materials for all meshInstances
            for (const { meshInstance, originalMaterial } of meshData) {
                meshInstance.material = originalMaterial;
            }
            
            // Restore original render target
            camera.camera.renderTarget = origRT;
            
            // Force a re-render of the main scene to immediately restore the visual
            this.app.render();
        }
    }

    private vec4ToFloat(pixel: Uint8Array): number {
        // Higher precision RGBA to float decoding
        const r = pixel[0] / 255.0;
        const g = pixel[1] / 255.0;
        const b = pixel[2] / 255.0;
        const a = pixel[3] / 255.0;

        // Reconstruct the float value with proper precision
        return r + (g / 255.0) + (b / (255.0 * 255.0)) + (a / (255.0 * 255.0 * 255.0));
    }

    private depthToWorldPosition(event: pc.MouseEvent, camera: pc.Entity, depth: number): pc.Vec3 {
        const cam = camera.camera!;

        // More accurate NDC coordinate calculation
        const rect = this.canvas.getBoundingClientRect();
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Account for device pixel ratio
        const canvasX = (event.x - rect.left) * devicePixelRatio;
        const canvasY = (event.y - rect.top) * devicePixelRatio;
        const canvasWidth = rect.width * devicePixelRatio;
        const canvasHeight = rect.height * devicePixelRatio;
        
        const ndcX = (canvasX / canvasWidth) * 2 - 1;
        const ndcY = -((canvasY / canvasHeight) * 2 - 1);

        // More precise view space position calculation
        const aspect = canvasWidth / canvasHeight;
        const tanHalfFov = Math.tan((cam.fov * Math.PI / 180) * 0.5);

        // Account for perspective projection more accurately
        const viewX = ndcX * depth * tanHalfFov * aspect;
        const viewY = ndcY * depth * tanHalfFov;
        const viewPos = new pc.Vec3(viewX, viewY, -depth);

        // Transform to world space with higher precision
        const viewMatrix = cam.viewMatrix;
        const invViewMatrix = new pc.Mat4().copy(viewMatrix).invert();
        const worldPos = new pc.Vec3();
        invViewMatrix.transformPoint(viewPos, worldPos);

        return worldPos;
    }
}