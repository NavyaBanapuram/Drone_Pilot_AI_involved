// ==========================================================
// DRONE PILOT — 3D ASSET MANAGER
// Loads, caches, and provides 3D models with resilient procedural fallbacks
// ==========================================================

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class AssetManager {
  private static instance: AssetManager;
  private loader: GLTFLoader;
  private modelCache: Map<string, THREE.Group> = new Map();
  private loadingPromises: Map<string, Promise<THREE.Group>> = new Map();

  private constructor() {
    this.loader = new GLTFLoader();
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  /**
   * Load a GLB model asynchronously from public/3d/world/
   * Falls back gracefully to procedural geometry if network fails.
   */
  public async loadModel(path: string): Promise<THREE.Group> {
    if (this.modelCache.has(path)) {
      return this.modelCache.get(path)!.clone();
    }

    if (this.loadingPromises.has(path)) {
      const group = await this.loadingPromises.get(path)!;
      return group.clone();
    }

    const loadPromise = new Promise<THREE.Group>((resolve) => {
      this.loader.load(
        path,
        (gltf) => {
          gltf.scene.traverse((child) => {
            if ((child as THREE.Mesh).isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.modelCache.set(path, gltf.scene);
          resolve(gltf.scene);
        },
        undefined,
        (error) => {
          console.warn(`[AssetManager] Could not load ${path}, using procedural fallback.`, error);
          const fallback = this.createProceduralFallback(path);
          this.modelCache.set(path, fallback);
          resolve(fallback);
        }
      );
    });

    this.loadingPromises.set(path, loadPromise);
    const result = await loadPromise;
    return result.clone();
  }

  /**
   * High-fidelity procedural geometry fallbacks ensuring zero pop-in delay
   */
  public createProceduralFallback(path: string): THREE.Group {
    const group = new THREE.Group();

    if (path.includes("pine_tree")) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.42, 3.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x422915, roughness: 0.9 })
      );
      trunk.position.y = 1.6;
      trunk.castShadow = true;
      group.add(trunk);

      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1c381c, roughness: 0.85 });
      const tiers = [
        { y: 3.2, r: 2.8, h: 3.5 },
        { y: 5.2, r: 2.3, h: 3.0 },
        { y: 7.0, r: 1.6, h: 2.5 },
      ];
      tiers.forEach((t) => {
        const cone = new THREE.Mesh(new THREE.ConeGeometry(t.r, t.h, 8), foliageMat);
        cone.position.y = t.y;
        cone.castShadow = true;
        group.add(cone);
      });
    } else if (path.includes("broadleaf")) {
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.32, 0.55, 3.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3728, roughness: 0.88 })
      );
      trunk.position.y = 1.9;
      trunk.castShadow = true;
      group.add(trunk);

      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x2e5c26, roughness: 0.8 });
      const clusters = [
        { x: 0, y: 4.8, z: 0, r: 2.4 },
        { x: -1.0, y: 4.4, z: 0.8, r: 1.8 },
        { x: 1.1, y: 4.5, z: -0.7, r: 1.9 },
        { x: 0.5, y: 5.6, z: 0.6, r: 1.7 },
      ];
      clusters.forEach((c) => {
        const sphere = new THREE.Mesh(new THREE.DodecahedronGeometry(c.r, 1), foliageMat);
        sphere.position.set(c.x, c.y, c.z);
        sphere.castShadow = true;
        group.add(sphere);
      });
    } else if (path.includes("shrub")) {
      const foliageMat = new THREE.MeshStandardMaterial({ color: 0x3d6e35, roughness: 0.82 });
      const m = new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 1), foliageMat);
      m.position.y = 0.65;
      m.castShadow = true;
      group.add(m);
    } else if (path.includes("boulder")) {
      const rockMat = new THREE.MeshStandardMaterial({ color: 0x556270, roughness: 0.95, flatShading: true });
      const mesh = new THREE.Mesh(new THREE.DodecahedronGeometry(1.8, 1), rockMat);
      mesh.scale.set(1.4, 0.9, 1.2);
      mesh.position.y = 0.8;
      mesh.castShadow = true;
      group.add(mesh);
    } else if (path.includes("windsock")) {
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.06, 0.08, 4.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 })
      );
      mast.position.y = 2.4;
      group.add(mast);

      const sock = new THREE.Mesh(
        new THREE.ConeGeometry(0.38, 2.0, 12),
        new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.6 })
      );
      sock.rotation.z = Math.PI / 2;
      sock.position.set(0.9, 4.7, 0);
      group.add(sock);
    } else if (path.includes("cargo_container")) {
      const body = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 2.6, 6.0),
        new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6, metalness: 0.4 })
      );
      body.position.y = 1.3;
      body.castShadow = true;
      group.add(body);
    } else {
      // Generic fallback cube
      const fallback = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: 0x94a3b8 })
      );
      fallback.position.y = 0.5;
      group.add(fallback);
    }

    return group;
  }
}
