// ==========================================================
// DRONE PILOT — PARKING SYSTEM (PHASE 3)
// Roadside parked vehicles and surface parking lots
// ==========================================================

import * as THREE from "three";
import { AssetManager } from "../asset-manager";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

const PARKED_VEHICLE_GLBS = [
  "/models/vehicles/sedan.glb",
  "/models/vehicles/suv.glb",
  "/models/vehicles/hatchback-sports.glb",
  "/models/vehicles/van.glb",
  "/models/vehicles/sedan-sports.glb",
  "/models/vehicles/suv-luxury.glb",
  "/models/vehicles/taxi.glb",
  "/models/vehicles/truck.glb",
] as const;

// Deterministic hash for consistent parking
function parkHash(x: number, z: number, seed: number): number {
  return Math.abs(Math.sin(x * 127.1 + z * 311.7 + seed * 43.37) * 43758.5453) % 1;
}

export class ParkingSystem {
  public group = new THREE.Group();
  private assetMgr: AssetManager;
  private vehicleCount = 0;
  private maxVehicles = 80;

  constructor(assetMgr: AssetManager) {
    this.assetMgr = assetMgr;
    this.buildParkingLots();
    this.buildRoadsideParking();
  }

  /**
   * Add a single parked vehicle at position
   */
  public addParkedVehicle(x: number, z: number, rotY: number) {
    if (this.vehicleCount >= this.maxVehicles) return;
    this.vehicleCount++;

    const idx = Math.floor(parkHash(x, z, 42) * PARKED_VEHICLE_GLBS.length);
    const glbPath = PARKED_VEHICLE_GLBS[idx];
    const yElev = evaluateIslandElevation(x, z).elevation;

    // Procedural fallback (simple colored box)
    const fallbackColor = [0x1e293b, 0xef4444, 0x3b82f6, 0x22c55e, 0xfbbf24, 0xe7e5e4][
      Math.floor(parkHash(x, z, 99) * 6)
    ];
    const fallback = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 1.2, 4.5),
      new THREE.MeshStandardMaterial({ color: fallbackColor, roughness: 0.5, metalness: 0.4 })
    );
    fallback.position.set(x, yElev + 0.6, z);
    fallback.rotation.y = rotY;
    fallback.castShadow = true;
    this.group.add(fallback);

    // Try async GLB load
    this.assetMgr.loadModel(glbPath).then(model => {
      model.scale.set(1.9, 1.9, 1.9);
      model.position.set(x, yElev, z);
      model.rotation.y = rotY;
      this.group.add(model);
      this.group.remove(fallback);
      fallback.geometry.dispose();
    }).catch(() => { /* keep fallback */ });
  }

  private buildParkingLots() {
    // Surface parking lot near commercial district
    const lotPositions = [
      { cx: 660, cz: 260, rows: 3, cols: 6 },
      { cx: 800, cz: 420, rows: 2, cols: 8 },
    ];

    lotPositions.forEach(lot => {
      const yElev = evaluateIslandElevation(lot.cx, lot.cz).elevation + 0.01;

      // Asphalt surface
      const surfaceW = lot.cols * 5 + 4;
      const surfaceD = lot.rows * 5 + 4;
      const surface = new THREE.Mesh(
        new THREE.PlaneGeometry(surfaceW, surfaceD),
        new THREE.MeshStandardMaterial({
          color: 0x374151,
          roughness: 0.9,
          metalness: 0.1,
          polygonOffset: true,
          polygonOffsetFactor: -2,
          polygonOffsetUnits: -2,
        })
      );
      surface.rotation.x = -Math.PI / 2;
      surface.position.set(lot.cx, yElev, lot.cz);
      surface.receiveShadow = true;
      this.group.add(surface);

      // Parking line markings
      const lineMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.5,
        polygonOffset: true,
        polygonOffsetFactor: -3,
        polygonOffsetUnits: -3,
      });

      for (let r = 0; r < lot.rows; r++) {
        for (let c = 0; c < lot.cols; c++) {
          const px = lot.cx - surfaceW / 2 + 4 + c * 5;
          const pz = lot.cz - surfaceD / 2 + 4 + r * 5;

          // Parking spot lines (3 lines per spot — left, right, back)
          const leftLine = new THREE.Mesh(
            new THREE.PlaneGeometry(0.12, 4.2),
            lineMat
          );
          leftLine.rotation.x = -Math.PI / 2;
          leftLine.position.set(px - 2, yElev + 0.01, pz);
          this.group.add(leftLine);

          // Place vehicle (70% chance)
          if (parkHash(px, pz, 17) < 0.7) {
            this.addParkedVehicle(
              px,
              pz,
              Math.PI / 2 + (parkHash(px, pz, 23) < 0.5 ? 0 : Math.PI)
            );
          }
        }
      }
    });
  }

  private buildRoadsideParking() {
    // Parallel parking along main avenues
    // Along x=640 avenue, right side (x=648), z=200 to z=440
    for (let z = 205; z <= 435; z += 8) {
      if (parkHash(648, z, 31) < 0.55) {
        this.addParkedVehicle(648, z, 0);
      }
    }

    // Along x=780 avenue, left side (x=772)
    for (let z = 205; z <= 435; z += 8) {
      if (parkHash(772, z, 47) < 0.5) {
        this.addParkedVehicle(772, z, Math.PI);
      }
    }

    // Along cross streets
    [240, 400].forEach(streetZ => {
      for (let x = 650; x <= 770; x += 8) {
        if (parkHash(x, streetZ + 9, 53) < 0.4) {
          this.addParkedVehicle(x, streetZ + 9, Math.PI / 2);
        }
      }
    });
  }
}
