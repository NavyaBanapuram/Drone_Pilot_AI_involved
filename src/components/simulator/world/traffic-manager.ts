// ==========================================================
// DRONE PILOT â€” AUTONOMOUS TRAFFIC SIMULATION (LIVING WORLD)
// Real GLB vehicles (sedans, SUVs, police, ambulances, taxis) navigating roads
// ==========================================================

import * as THREE from "three";
import { AssetManager } from "./asset-manager";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

interface TrafficVehicle {
  mesh: THREE.Group;
  speed: number;
  progress: number; // 0 to 1 along waypoint path
  pathIndex: number;
  wheels: THREE.Object3D[];
}

export class TrafficManager {
  public group = new THREE.Group();
  private assetMgr = AssetManager.getInstance();
  private vehicles: TrafficVehicle[] = [];
  private waypoints: THREE.Vector3[] = [];

  constructor(waypoints: THREE.Vector3[]) {
    this.waypoints = waypoints;
    this.spawnTrafficFleet();
  }

  /**
   * Spawns a varied fleet of city vehicles on the road network
   */
  private async spawnTrafficFleet() {
    if (this.waypoints.length < 2) return;

    const vehicleModels = [
      "/models/vehicles/sedan.glb",
      "/models/vehicles/suv.glb",
      "/models/vehicles/police.glb",
      "/models/vehicles/taxi.glb",
      "/models/vehicles/ambulance.glb",
      "/models/vehicles/van.glb",
      "/models/vehicles/truck.glb",
      "/models/vehicles/sedan-sports.glb",
    ];

    const templates = await Promise.all(
      vehicleModels.map((p) => this.assetMgr.loadModel(p))
    );

    const vehicleCount = 22;

    // Shared soft contact shadow texture for vehicles
    let shadowTexture: THREE.CanvasTexture | null = null;
    if (typeof document !== "undefined") {
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const gradient = ctx.createRadialGradient(32, 64, 4, 32, 64, 46);
        gradient.addColorStop(0, "rgba(12, 16, 24, 0.65)");
        gradient.addColorStop(0.5, "rgba(12, 16, 24, 0.3)");
        gradient.addColorStop(1, "rgba(12, 16, 24, 0)");
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 64, 128);
        shadowTexture = new THREE.CanvasTexture(canvas);
      }
    }

    const shadowGeo = new THREE.PlaneGeometry(2.0, 4.2);
    shadowGeo.rotateX(-Math.PI / 2);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTexture,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    for (let i = 0; i < vehicleCount; i++) {
      const template = templates[i % templates.length].clone();
      // Realistic scale (1.18x) fitting road lanes and real car dimensions (~4.4m x 1.8m)
      template.scale.set(1.18, 1.18, 1.18);

      // Find wheel meshes for rotation animation & enhance materials/shadows
      const wheels: THREE.Object3D[] = [];
      template.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          if (mesh.material) {
            const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
            mats.forEach((mat) => {
              if (mat instanceof THREE.MeshStandardMaterial) {
                mat.roughness = 0.35;
                mat.metalness = 0.25;
                if (mat.map) {
                  mat.map.minFilter = THREE.LinearMipmapLinearFilter;
                  mat.map.magFilter = THREE.LinearFilter;
                  mat.map.needsUpdate = true;
                }
              }
            });
          }

          if (child.name.toLowerCase().includes("wheel") || child.position.y < 0.6) {
            wheels.push(child);
          }
        }
      });

      // Ground soft ambient shadow plane
      const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
      shadowMesh.position.set(0, 0.03, 0);
      template.add(shadowMesh);

      // Front Headlight Glow
      const headLightMat = new THREE.MeshBasicMaterial({ color: 0xfffde0 });
      const hlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.05), headLightMat);
      hlLeft.position.set(-0.45, 0.45, 1.1);
      const hlRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.05), headLightMat);
      hlRight.position.set(0.45, 0.45, 1.1);
      template.add(hlLeft);
      template.add(hlRight);

      // Rear Taillight Glow (Red)
      const tailLightMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
      const tlLeft = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.05), tailLightMat);
      tlLeft.position.set(-0.45, 0.45, -1.1);
      const tlRight = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.08, 0.05), tailLightMat);
      tlRight.position.set(0.45, 0.45, -1.1);
      template.add(tlLeft);
      template.add(tlRight);

      // Position evenly along the waypoint circuit
      const startWaypoint = i % (this.waypoints.length - 1);
      const startPos = this.waypoints[startWaypoint];
      template.position.copy(startPos);

      this.group.add(template);

      this.vehicles.push({
        mesh: template,
        speed: 13 + Math.random() * 9, // 13-22 m/s (~47-80 km/h)
        progress: (i / vehicleCount),
        pathIndex: startWaypoint,
        wheels,
      });
    }
  }

  /**
   * Updates vehicle positions along waypoints and spins wheels
   */
  public update(dt: number) {
    if (this.waypoints.length < 2) return;

    const totalPoints = this.waypoints.length;

    for (const v of this.vehicles) {
      const pCurrent = this.waypoints[v.pathIndex];
      const nextIdx = (v.pathIndex + 1) % totalPoints;
      const pNext = this.waypoints[nextIdx];

      const segmentDist = pCurrent.distanceTo(pNext);
      if (segmentDist <= 0.001) {
        v.pathIndex = nextIdx;
        continue;
      }

      // Advance along current segment
      v.progress += (v.speed * dt) / segmentDist;

      if (v.progress >= 1.0) {
        v.progress -= 1.0;
        v.pathIndex = nextIdx;
      }

      // Interpolate position
      const p1 = this.waypoints[v.pathIndex];
      const p2 = this.waypoints[(v.pathIndex + 1) % totalPoints];
      v.mesh.position.lerpVectors(p1, p2, v.progress);
      
      const terrainY = evaluateIslandElevation(v.mesh.position.x, v.mesh.position.z).elevation;
      const roadY = Math.max(terrainY + 0.22, 1.35); // Base road elevation logic
      
      // If the interpolated waypoint Y is vastly higher than the terrain, assume it's a bridge.
      // Otherwise, snap tightly to the procedural road surface.
      if (v.mesh.position.y > roadY + 2.5) {
        // On a bridge, keep CatmullRom Y
      } else {
        v.mesh.position.y = roadY + 0.3; // Car suspension offset
      }

      // Steer heading towards next waypoint
      const targetHeading = Math.atan2(p2.x - p1.x, p2.z - p1.z);
      let diff = targetHeading - v.mesh.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      v.mesh.rotation.y += diff * Math.min(1.0, dt * 15.0);

      // Spin wheels
      const wheelSpin = (v.speed * dt) / 0.35; // r ~ 0.35m
      for (const w of v.wheels) {
        w.rotation.x += wheelSpin;
      }
    }
  }
}



