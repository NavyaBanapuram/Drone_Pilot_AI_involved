// ==========================================================
// DRONE PILOT — BUILDING GENERATOR (PHASE 3)
// Creates varied buildings using Kenney GLB models + procedural
// fallbacks with material variety and architectural detail
// ==========================================================

import * as THREE from "three";
import { AssetManager } from "../asset-manager";
import type { DistrictType } from "./city-district-system";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

export interface BuildingPlacement {
  x: number;
  z: number;
  height: number;
  rotationY: number;
  districtType: DistrictType;
}

// Correct Kenney asset paths — all GLBs are directly in /models/<category>/
const SKYSCRAPER_GLBS = [
  "/models/commercial/building-skyscraper-a.glb",
  "/models/commercial/building-skyscraper-b.glb",
  "/models/commercial/building-skyscraper-c.glb",
  "/models/commercial/building-skyscraper-d.glb",
  "/models/commercial/building-skyscraper-e.glb",
];

const COMMERCIAL_GLBS = [
  "/models/commercial/building-a.glb",
  "/models/commercial/building-b.glb",
  "/models/commercial/building-c.glb",
  "/models/commercial/building-d.glb",
  "/models/commercial/building-e.glb",
  "/models/commercial/building-f.glb",
  "/models/commercial/building-g.glb",
  "/models/commercial/building-h.glb",
  "/models/commercial/building-i.glb",
  "/models/commercial/building-j.glb",
  "/models/commercial/building-k.glb",
  "/models/commercial/building-l.glb",
  "/models/commercial/building-m.glb",
  "/models/commercial/building-n.glb",
];

const LOW_DETAIL_GLBS = [
  "/models/commercial/low-detail-building-a.glb",
  "/models/commercial/low-detail-building-b.glb",
  "/models/commercial/low-detail-building-c.glb",
  "/models/commercial/low-detail-building-d.glb",
  "/models/commercial/low-detail-building-e.glb",
  "/models/commercial/low-detail-building-f.glb",
  "/models/commercial/low-detail-building-g.glb",
  "/models/commercial/low-detail-building-h.glb",
  "/models/commercial/low-detail-building-wide-a.glb",
  "/models/commercial/low-detail-building-wide-b.glb",
];

const INDUSTRIAL_GLBS = [
  "/models/industrial/building-a.glb",
  "/models/industrial/building-b.glb",
  "/models/industrial/building-c.glb",
  "/models/industrial/building-d.glb",
  "/models/industrial/building-e.glb",
  "/models/industrial/building-f.glb",
  "/models/industrial/building-g.glb",
  "/models/industrial/building-h.glb",
  "/models/industrial/building-i.glb",
  "/models/industrial/building-j.glb",
];

import { WorldMaterials, FACADE_COLORS, GLASS_COLORS } from "../world-materials";

interface CityRNG {
  next(): number;
  range(min: number, max: number): number;
  int(min: number, max: number): number;
  pick<T>(arr: readonly T[] | T[]): T;
}

export class BuildingGenerator {
  private assetMgr: AssetManager;
  private rng: CityRNG;
  private glbLoadInitiated = false;

  constructor(assetMgr: AssetManager, rng: CityRNG) {
    this.assetMgr = assetMgr;
    this.rng = rng;
    this.initGLBLoading();
  }

  /**
   * Kick off async loading of all GLB building models (non-blocking)
   */
  private async initGLBLoading() {
    if (this.glbLoadInitiated) return;
    this.glbLoadInitiated = true;

    const allPaths = [
      ...SKYSCRAPER_GLBS,
      ...COMMERCIAL_GLBS.slice(0, 8), // Load first 8 commercial models
      ...LOW_DETAIL_GLBS.slice(0, 6), // Load first 6 low-detail
      ...INDUSTRIAL_GLBS.slice(0, 4), // Load first 4 industrial
    ];

    // Fire-and-forget preload
    Promise.all(allPaths.map(p => this.assetMgr.loadModel(p).catch(() => null)));
  }

  /**
   * Create a building group for a given placement
   */
  public createBuilding(p: BuildingPlacement): THREE.Group {
    const group = new THREE.Group();
    const terrainY = evaluateIslandElevation(p.x, p.z).elevation;
    group.position.set(p.x, terrainY, p.z);
    group.rotation.y = p.rotationY;

    // Select building type based on district and height
    if (p.districtType === "cbd" && p.height > 40) {
      this.buildSkyscraper(group, p);
    } else if (p.districtType === "commercial" || (p.districtType === "cbd" && p.height <= 40)) {
      this.buildCommercialMidrise(group, p);
    } else if (p.districtType === "residential_high") {
      this.buildApartmentBlock(group, p);
    } else if (p.districtType === "residential_low") {
      this.buildHouse(group, p);
    } else if (p.districtType === "civic") {
      this.buildCivicBuilding(group, p);
    } else if (p.districtType === "industrial_transition") {
      this.buildIndustrialBuilding(group, p);
    }

    // Async: try loading a GLB model to replace/enhance
    this.tryLoadGLB(group, p);

    return group;
  }

  /**
   * Attempt to load and place a Kenney GLB model asynchronously
   */
  private async tryLoadGLB(group: THREE.Group, p: BuildingPlacement) {
    let glbPaths: string[];
    let scaleMult: number;

    if (p.districtType === "cbd" && p.height > 40) {
      glbPaths = SKYSCRAPER_GLBS;
      scaleMult = p.height / 3.2; // Kenney skyscrapers are ~3.2 units tall
    } else if (p.districtType === "industrial_transition") {
      glbPaths = INDUSTRIAL_GLBS;
      scaleMult = p.height / 2.5;
    } else if (p.districtType === "residential_low") {
      glbPaths = LOW_DETAIL_GLBS;
      scaleMult = p.height / 1.8;
    } else {
      glbPaths = COMMERCIAL_GLBS;
      scaleMult = p.height / 2.8;
    }

    const idx = Math.floor(Math.abs(p.x * 7 + p.z * 13) % glbPaths.length);
    const path = glbPaths[idx];

    try {
      const model = await this.assetMgr.loadModel(path);
      const s = scaleMult;
      model.scale.set(s, s, s);
      model.position.set(0, 0, 0);

      // Remove procedural fallback children (keep first child which may be ground contact)
      while (group.children.length > 0) {
        const child = group.children[0];
        group.remove(child);
        if ((child as THREE.Mesh).geometry) {
          (child as THREE.Mesh).geometry.dispose();
        }
      }

      group.add(model);
    } catch {
      // Keep procedural fallback — it's already there
    }
  }

  // ────────────────────────────────────────────────────────────
  // Procedural Fallback Builders (used before GLBs load)
  // ────────────────────────────────────────────────────────────

  private buildSkyscraper(group: THREE.Group, p: BuildingPlacement) {
    const w = this.rng.range(16, 28);
    const d = this.rng.range(16, 28);
    const h = p.height;

    const facadeColor = this.rng.pick(FACADE_COLORS);
    const glassColor = this.rng.pick(GLASS_COLORS);

    const facadeMat = new THREE.MeshStandardMaterial({
      color: facadeColor, roughness: 0.35, metalness: 0.6,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: glassColor, roughness: 0.08, metalness: 0.92,
      transparent: true, opacity: 0.85,
    });

    // Main shaft
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), facadeMat);
    shaft.position.y = h / 2;
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    group.add(shaft);

    // Glass curtain wall bands
    const bandCount = Math.floor(h / 6);
    for (let i = 0; i < bandCount; i++) {
      const bandY = 4 + i * 6;
      if (bandY > h - 2) break;
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(w + 0.3, 2.4, d + 0.3),
        glassMat
      );
      band.position.y = bandY;
      group.add(band);
    }

    // Rooftop HVAC box
    const hvac = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.3, 2.5, d * 0.3),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.7, metalness: 0.4 })
    );
    hvac.position.y = h + 1.25;
    hvac.castShadow = true;
    group.add(hvac);

    // Aviation beacon
    const beacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.4, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    beacon.position.y = h + 2.8;
    group.add(beacon);
  }

  private buildCommercialMidrise(group: THREE.Group, p: BuildingPlacement) {
    const w = this.rng.range(12, 22);
    const d = this.rng.range(12, 22);
    const h = p.height;

    const facadeColor = this.rng.pick(FACADE_COLORS);
    const mat = new THREE.MeshStandardMaterial({
      color: facadeColor, roughness: 0.6, metalness: 0.3,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Window grid (simple raised panels)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8, roughness: 0.1, metalness: 0.85,
      transparent: true, opacity: 0.75,
    });
    const floors = Math.floor(h / 3.5);
    for (let f = 0; f < Math.min(floors, 8); f++) {
      const wy = 2.5 + f * 3.5;
      if (wy > h - 1) break;
      const windowPanel = new THREE.Mesh(
        new THREE.BoxGeometry(w * 0.85, 1.8, d + 0.2),
        windowMat
      );
      windowPanel.position.y = wy;
      group.add(windowPanel);
    }

    // Entrance canopy
    const canopy = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.5, 0.3, 3),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.6 })
    );
    canopy.position.set(0, 3.5, d / 2 + 1.5);
    canopy.castShadow = true;
    group.add(canopy);
  }

  private buildApartmentBlock(group: THREE.Group, p: BuildingPlacement) {
    const w = this.rng.range(18, 30);
    const d = this.rng.range(10, 16);
    const h = p.height;

    // Warm residential colors
    const color = this.rng.pick([0xfef3c7, 0xe7e5e4, 0xd6d3d1, 0xfde68a, 0xbfdbfe]);
    const mat = new THREE.MeshStandardMaterial({
      color, roughness: 0.75, metalness: 0.1,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Balconies on front face
    const balconyMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, roughness: 0.5, metalness: 0.6,
    });
    const floors = Math.floor(h / 3.2);
    const balconiesPerFloor = Math.max(2, Math.floor(w / 6));
    for (let f = 1; f < Math.min(floors, 7); f++) {
      for (let b = 0; b < balconiesPerFloor; b++) {
        const bx = -w / 2 + (b + 0.5) * (w / balconiesPerFloor);
        const by = 1.5 + f * 3.2;
        if (by > h - 1) break;
        const balcony = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 0.2, 1.5),
          balconyMat
        );
        balcony.position.set(bx, by, d / 2 + 0.75);
        group.add(balcony);

        // Balcony railing
        const railing = new THREE.Mesh(
          new THREE.BoxGeometry(3.5, 1.0, 0.08),
          balconyMat
        );
        railing.position.set(bx, by + 0.5, d / 2 + 1.45);
        group.add(railing);
      }
    }
  }

  private buildHouse(group: THREE.Group, p: BuildingPlacement) {
    const w = this.rng.range(8, 13);
    const d = this.rng.range(8, 12);
    const wallH = this.rng.range(4, 6);
    const roofH = this.rng.range(2.5, 4);

    const wallColor = this.rng.pick([
      0xfef3c7, 0xe7e5e4, 0xd6d3d1, 0xfde68a, 0xbfdbfe,
      0xfce7f3, 0xecfccb, 0xfed7aa,
    ]);

    const wallMat = new THREE.MeshStandardMaterial({
      color: wallColor, roughness: 0.8, metalness: 0.05,
    });

    // Walls
    const walls = new THREE.Mesh(new THREE.BoxGeometry(w, wallH, d), wallMat);
    walls.position.y = wallH / 2;
    walls.castShadow = true;
    walls.receiveShadow = true;
    group.add(walls);

    // Pitched roof
    const roofMat = new THREE.MeshStandardMaterial({
      color: this.rng.pick([0x78350f, 0x92400e, 0x44403c, 0x1e293b, 0x854d0e]),
      roughness: 0.7, metalness: 0.2,
    });
    const roofGeo = new THREE.ConeGeometry(
      Math.max(w, d) * 0.72, roofH, 4
    );
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = wallH + roofH / 2;
    roof.rotation.y = Math.PI / 4;
    roof.castShadow = true;
    group.add(roof);

    // Door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.8 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.15), doorMat);
    door.position.set(0, 1.1, d / 2 + 0.08);
    group.add(door);

    // Windows (2 on front)
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0x93c5fd, roughness: 0.1, metalness: 0.7,
      transparent: true, opacity: 0.7,
    });
    [-w * 0.3, w * 0.3].forEach(wx => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.1), windowMat);
      win.position.set(wx, wallH * 0.6, d / 2 + 0.06);
      group.add(win);
    });

    // Small garden fence
    if (this.rng.next() > 0.4) {
      const fenceMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.7 });
      const fenceGeo = new THREE.BoxGeometry(w + 6, 1.0, 0.1);
      const fence = new THREE.Mesh(fenceGeo, fenceMat);
      fence.position.set(0, 0.5, d / 2 + 4);
      group.add(fence);
    }
  }

  private buildCivicBuilding(group: THREE.Group, p: BuildingPlacement) {
    const w = this.rng.range(20, 30);
    const d = this.rng.range(16, 24);
    const h = p.height;

    // Civic buildings: warm stone / official colors
    const mat = new THREE.MeshStandardMaterial({
      color: this.rng.pick([0xe7e5e4, 0xd6d3d1, 0xfef3c7, 0xfef9c3]),
      roughness: 0.65, metalness: 0.15,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Columned entrance portico
    const columnMat = new THREE.MeshStandardMaterial({
      color: 0xd6d3d1, roughness: 0.4, metalness: 0.3,
    });
    for (let c = -2; c <= 2; c++) {
      const column = new THREE.Mesh(
        new THREE.CylinderGeometry(0.4, 0.5, h * 0.6, 8),
        columnMat
      );
      column.position.set(c * 3.5, h * 0.3, d / 2 + 1.8);
      column.castShadow = true;
      group.add(column);
    }

    // Entrance lintel
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(w * 0.7, 1.2, 2.5),
      columnMat
    );
    lintel.position.set(0, h * 0.6 + 0.6, d / 2 + 1.8);
    lintel.castShadow = true;
    group.add(lintel);

    // Flag pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 10, 6), poleMat);
    pole.position.set(w / 2 + 2, 5, d / 2 + 3);
    group.add(pole);
  }

  private buildIndustrialBuilding(group: THREE.Group, p: BuildingPlacement) {
    const w = this.rng.range(16, 28);
    const d = this.rng.range(14, 22);
    const h = p.height;

    const mat = new THREE.MeshStandardMaterial({
      color: this.rng.pick([0x475569, 0x64748b, 0x334155, 0x78716c]),
      roughness: 0.8, metalness: 0.3,
    });

    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Corrugated barrel roof
    const roofGeo = new THREE.CylinderGeometry(w / 2, w / 2, d, 12, 1, false, 0, Math.PI);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.rotateY(Math.PI / 2);
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, roughness: 0.6, metalness: 0.5,
    });
    const roof = new THREE.Mesh(roofGeo, roofMat);
    roof.position.y = h;
    roof.castShadow = true;
    group.add(roof);

    // Large loading bay door
    const doorMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.7 });
    const door = new THREE.Mesh(new THREE.BoxGeometry(5, 5, 0.2), doorMat);
    door.position.set(0, 2.5, d / 2 + 0.1);
    group.add(door);
  }
}
