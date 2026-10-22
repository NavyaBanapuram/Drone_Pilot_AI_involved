// ==========================================================
// DRONE PILOT — STREET FURNITURE (PHASE 3)
// Streetlights, benches, bins, signs, traffic lights using
// Kenney road GLBs + procedural fallbacks
// ==========================================================

import * as THREE from "three";
import { AssetManager } from "../asset-manager";
import type { DistrictType } from "./city-district-system";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

// GLB paths for road/street furniture
const GLB_PATHS = {
  streetlight: "/models/roads/light-curved.glb",
  streetlightDouble: "/models/roads/light-curved-double.glb",
  trafficLight: "/models/roads/traffic-light.glb",
  stopSign: "/models/roads/road-sign-stop.glb",
  warningSign: "/models/roads/road-sign-warning.glb",
  streetSign: "/models/roads/road-sign-street.glb",
  constructionCone: "/models/roads/construction-cone.glb",
  dumpster: "/models/roads/dumpster.glb",
  electricityPole: "/models/roads/electricity-pole-single.glb",
} as const;

export class StreetFurniture {
  public group = new THREE.Group();
  private assetMgr: AssetManager;
  private placementCount = 0;
  private maxPlacements = 120; // Cap total furniture items for performance

  // Procedural materials (shared across instances)
  private metalMat = new THREE.MeshStandardMaterial({
    color: 0x64748b, roughness: 0.4, metalness: 0.7,
  });
  private woodMat = new THREE.MeshStandardMaterial({
    color: 0x78350f, roughness: 0.8, metalness: 0.1,
  });
  private greenMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e, roughness: 0.7, metalness: 0.1,
  });
  private redMat = new THREE.MeshStandardMaterial({
    color: 0xef4444, roughness: 0.6, metalness: 0.3,
  });

  constructor(assetMgr: AssetManager) {
    this.assetMgr = assetMgr;
    this.placeStreetlights();
    this.placeTrafficLights();
    this.placeBenches();
    this.placeTrashBins();
    this.placeFireHydrants();
    this.placeBollards();
  }

  /**
   * Place a few pieces of street furniture near each building position
   */
  public placeNearBuilding(x: number, z: number, districtType: DistrictType) {
    if (this.placementCount >= this.maxPlacements) return;

    // Deterministic decision based on position
    const hash = Math.abs(Math.sin(x * 127.1 + z * 311.7) * 43758.5453) % 1;

    if (districtType === "cbd" || districtType === "commercial") {
      if (hash < 0.3) {
        this.addBench(x + 14, z + 2);
        this.placementCount++;
      }
      if (hash > 0.7) {
        this.addTrashBin(x - 14, z - 1);
        this.placementCount++;
      }
    } else if (districtType === "residential_low") {
      if (hash < 0.2) {
        this.addMailbox(x + 8, z + 6);
        this.placementCount++;
      }
    }
  }

  // ────────────────────────────────────────────────────────────
  // Batch placement methods
  // ────────────────────────────────────────────────────────────

  private placeStreetlights() {
    // Along main avenues (x=640 and x=780) every 30m
    [640, 780].forEach(aveX => {
      for (let z = 200; z <= 460; z += 30) {
        // Right side of road
        this.addStreetlight(aveX + 9, evaluateIslandElevation(aveX + 9, z).elevation, z);
      }
    });
    // Along cross streets (z=240 and z=400) every 35m
    [240, 400].forEach(streetZ => {
      for (let x = 610; x <= 810; x += 35) {
        this.addStreetlight(x, evaluateIslandElevation(x, streetZ + 9).elevation, streetZ + 9);
      }
    });
  }

  private placeTrafficLights() {
    // At 4 major intersections
    const intersections = [
      { x: 640, z: 240 },
      { x: 640, z: 400 },
      { x: 780, z: 240 },
      { x: 780, z: 400 },
    ];
    intersections.forEach(pos => {
      this.addTrafficLight(pos.x + 8, evaluateIslandElevation(pos.x + 8, pos.z + 8).elevation, pos.z + 8);
      this.addTrafficLight(pos.x - 8, evaluateIslandElevation(pos.x - 8, pos.z - 8).elevation, pos.z - 8, Math.PI);
    });
  }

  private placeBenches() {
    // Along park edges and key pedestrian areas
    const benchPositions = [
      { x: 710, z: 210 }, { x: 750, z: 210 },
      { x: 730, z: 190 }, { x: 730, z: 230 },
      { x: 670, z: 300 }, { x: 700, z: 350 },
      { x: 800, z: 300 }, { x: 820, z: 370 },
    ];
    benchPositions.forEach(p => this.addBench(p.x, p.z));
  }

  private placeTrashBins() {
    const binPositions = [
      { x: 645, z: 260 }, { x: 785, z: 260 },
      { x: 645, z: 380 }, { x: 785, z: 380 },
      { x: 720, z: 220 }, { x: 740, z: 420 },
    ];
    binPositions.forEach(p => this.addTrashBin(p.x, p.z));
  }

  private placeFireHydrants() {
    const positions = [
      { x: 635, z: 280 }, { x: 775, z: 350 },
      { x: 700, z: 245 }, { x: 700, z: 395 },
    ];
    positions.forEach(p => this.addFireHydrant(p.x, p.z));
  }

  private placeBollards() {
    // Along park perimeter
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const x = 730 + Math.cos(angle) * 42;
      const z = 200 + Math.sin(angle) * 36;
      this.addBollard(x, z);
    }
  }

  // ────────────────────────────────────────────────────────────
  // Individual furniture builders
  // ────────────────────────────────────────────────────────────

  private addStreetlight(x: number, y: number, z: number) {
    const poleGeo = new THREE.CylinderGeometry(0.08, 0.12, 8, 6);
    const pole = new THREE.Mesh(poleGeo, this.metalMat);
    pole.position.set(x, y + 4, z);
    pole.castShadow = true;
    this.group.add(pole);

    // Curved arm
    const armGeo = new THREE.BoxGeometry(2.5, 0.1, 0.1);
    const arm = new THREE.Mesh(armGeo, this.metalMat);
    arm.position.set(x - 1.2, y + 8, z);
    this.group.add(arm);

    // Light fixture (emissive)
    const fixtureMat = new THREE.MeshStandardMaterial({
      color: 0xfbbf24, emissive: 0xfbbf24, emissiveIntensity: 0.4,
      roughness: 0.3, metalness: 0.5,
    });
    const fixture = new THREE.Mesh(
      new THREE.BoxGeometry(1.0, 0.3, 0.6),
      fixtureMat
    );
    fixture.position.set(x - 2.2, y + 7.9, z);
    this.group.add(fixture);

    // Try loading GLB async
    this.assetMgr.loadModel(GLB_PATHS.streetlight).then(model => {
      model.scale.set(2.2, 2.2, 2.2);
      model.position.set(x, y, z);
      this.group.add(model);
      // Remove procedural version
      this.group.remove(pole);
      this.group.remove(arm);
      this.group.remove(fixture);
    }).catch(() => { /* keep procedural */ });
  }

  private addTrafficLight(x: number, y: number, z: number, rotY = 0) {
    // Procedural traffic light
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.1, 5, 6),
      this.metalMat
    );
    pole.position.set(x, y + 2.5, z);
    this.group.add(pole);

    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.6, 1.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.6 })
    );
    housing.position.set(x, y + 5.5, z);
    housing.rotation.y = rotY;
    this.group.add(housing);

    // Red/yellow/green lights
    const lightColors = [0xef4444, 0xfbbf24, 0x22c55e];
    lightColors.forEach((color, i) => {
      const light = new THREE.Mesh(
        new THREE.SphereGeometry(0.15, 6, 6),
        new THREE.MeshStandardMaterial({
          color, emissive: color, emissiveIntensity: i === 2 ? 0.6 : 0.15,
        })
      );
      light.position.set(x, y + 6.0 - i * 0.45, z + (rotY === 0 ? 0.22 : -0.22));
      this.group.add(light);
    });
  }

  private addBench(x: number, z: number) {
    const y = evaluateIslandElevation(x, z).elevation;
    // Seat
    const seat = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.12, 0.6),
      this.woodMat
    );
    seat.position.set(x, y + 0.5, z);
    this.group.add(seat);

    // Backrest
    const back = new THREE.Mesh(
      new THREE.BoxGeometry(2.4, 0.6, 0.08),
      this.woodMat
    );
    back.position.set(x, y + 0.85, z - 0.28);
    this.group.add(back);

    // Legs (4)
    const legGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.5, 4);
    [-0.9, 0.9].forEach(lx => {
      [-0.22, 0.22].forEach(lz => {
        const leg = new THREE.Mesh(legGeo, this.metalMat);
        leg.position.set(x + lx, y + 0.25, z + lz);
        this.group.add(leg);
      });
    });
  }

  private addTrashBin(x: number, z: number) {
    const y = evaluateIslandElevation(x, z).elevation;
    const bin = new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.35, 0.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.6, metalness: 0.4 })
    );
    bin.position.set(x, y + 0.45, z);
    this.group.add(bin);

    // Lid
    const lid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.33, 0.33, 0.08, 8),
      this.metalMat
    );
    lid.position.set(x, y + 0.94, z);
    this.group.add(lid);
  }

  private addFireHydrant(x: number, z: number) {
    const y = evaluateIslandElevation(x, z).elevation;
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.2, 0.7, 8),
      this.redMat
    );
    body.position.set(x, y + 0.35, z);
    this.group.add(body);

    const cap = new THREE.Mesh(
      new THREE.SphereGeometry(0.18, 6, 6),
      this.redMat
    );
    cap.position.set(x, y + 0.75, z);
    this.group.add(cap);
  }

  private addBollard(x: number, z: number) {
    const y = evaluateIslandElevation(x, z).elevation;
    const bollard = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.12, 1.0, 8),
      this.metalMat
    );
    bollard.position.set(x, y + 0.5, z);
    this.group.add(bollard);
  }

  private addMailbox(x: number, z: number) {
    const y = evaluateIslandElevation(x, z).elevation;
    // Post
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 1.2, 6),
      this.woodMat
    );
    post.position.set(x, y + 0.6, z);
    this.group.add(post);

    // Box
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 0.35, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.6 })
    );
    box.position.set(x, y + 1.3, z);
    this.group.add(box);
  }
}
