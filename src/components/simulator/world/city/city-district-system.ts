// ==========================================================
// DRONE PILOT â€” CITY DISTRICT SYSTEM (PHASE 3)
// Multi-district urban center with building variety, sidewalks,
// street furniture, parking, parks, and civic buildings
// ==========================================================

import * as THREE from "three";
import { AssetManager } from "../asset-manager";
import { BuildingGenerator, BuildingPlacement } from "./building-generator";
import { StreetFurniture } from "./street-furniture";
import { CityPark } from "./city-park";
import { ParkingSystem } from "./parking-system";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// District Definitions
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export type DistrictType =
  | "cbd"           // Central Business District â€” tall glass towers
  | "commercial"    // Mid-rise offices, shops, hotels
  | "residential_high" // Apartment blocks
  | "residential_low"  // Houses, townhouses
  | "civic"         // Hospital, fire station, school
  | "park"          // Green space
  | "industrial_transition"; // Warehouses near port

interface DistrictDef {
  id: DistrictType;
  name: string;
  center: { x: number; z: number };
  halfW: number;
  halfD: number;
  buildingDensity: number; // 0-1 how tightly packed
  minHeight: number;
  maxHeight: number;
  sidewalkWidth: number;
}

const DISTRICTS: DistrictDef[] = [
  {
    id: "cbd",
    name: "Central Business District",
    center: { x: 760, z: 340 },
    halfW: 180, halfD: 180,
    buildingDensity: 0.98,
    minHeight: 70, maxHeight: 220,
    sidewalkWidth: 3.2,
  },
  {
    id: "commercial",
    name: "Commercial Downtown Core",
    center: { x: 600, z: 320 },
    halfW: 160, halfD: 160,
    buildingDensity: 0.95,
    minHeight: 30, maxHeight: 90,
    sidewalkWidth: 3.0,
  },
  {
    id: "residential_high",
    name: "High-Density Residential Towers",
    center: { x: 860, z: 340 },
    halfW: 150, halfD: 150,
    buildingDensity: 0.90,
    minHeight: 20, maxHeight: 65,
    sidewalkWidth: 2.8,
  },
  {
    id: "residential_low",
    name: "West Suburban Neighborhood",
    center: { x: 520, z: 200 },
    halfW: 140, halfD: 140,
    buildingDensity: 0.85,
    minHeight: 8, maxHeight: 18,
    sidewalkWidth: 2.2,
  },
  {
    id: "residential_low",
    name: "North Suburban Estates",
    center: { x: 720, z: 120 },
    halfW: 160, halfD: 120,
    buildingDensity: 0.85,
    minHeight: 8, maxHeight: 18,
    sidewalkWidth: 2.2,
  },
  {
    id: "residential_low",
    name: "East Coastal Bay Suburbs",
    center: { x: 940, z: 200 },
    halfW: 130, halfD: 130,
    buildingDensity: 0.85,
    minHeight: 8, maxHeight: 18,
    sidewalkWidth: 2.2,
  },
  {
    id: "civic",
    name: "Civic & Municipal District",
    center: { x: 680, z: 460 },
    halfW: 120, halfD: 100,
    buildingDensity: 0.80,
    minHeight: 15, maxHeight: 40,
    sidewalkWidth: 3.0,
  },
  {
    id: "park",
    name: "Central Metropolis Park",
    center: { x: 740, z: 210 },
    halfW: 55, halfD: 45,
    buildingDensity: 0.0,
    minHeight: 0, maxHeight: 0,
    sidewalkWidth: 2.5,
  },
  {
    id: "industrial_transition",
    name: "Industrial Logistics Corridor",
    center: { x: 500, z: 440 },
    halfW: 65, halfD: 65,
    buildingDensity: 0.65,
    minHeight: 8, maxHeight: 18,
    sidewalkWidth: 2.2,
  },
  {
    id: "commercial",
    name: "South Metro Extension",
    center: { x: 700, z: 620 },
    halfW: 160, halfD: 140,
    buildingDensity: 0.85,
    minHeight: 25, maxHeight: 85,
    sidewalkWidth: 3.0,
  },
  {
    id: "residential_high",
    name: "South Hills Apartments",
    center: { x: 520, z: 620 },
    halfW: 140, halfD: 140,
    buildingDensity: 0.80,
    minHeight: 15, maxHeight: 45,
    sidewalkWidth: 2.5,
  },
  {
    id: "residential_low",
    name: "Ocean View Suburbs",
    center: { x: 880, z: 620 },
    halfW: 140, halfD: 140,
    buildingDensity: 0.70,
    minHeight: 8, maxHeight: 15,
    sidewalkWidth: 2.0,
  }
];

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Seeded PRNG for deterministic city generation
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

class CityPRNG {
  private s: number;
  constructor(seed: number) { this.s = seed | 0; }
  next(): number {
    this.s = (this.s + 0x6D2B79F5) | 0;
    let t = Math.imul(this.s ^ (this.s >>> 15), 1 | this.s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }
  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Main City District System
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export class CityDistrictSystem {
  public group = new THREE.Group();
  private assetMgr = AssetManager.getInstance();
  private rng = new CityPRNG(831457);
  private buildingGen: BuildingGenerator;
  private streetFurniture: StreetFurniture;
  private cityPark: CityPark;
  private parkingSystem: ParkingSystem;

  constructor() {
    this.buildingGen = new BuildingGenerator(this.assetMgr, this.rng);
    this.streetFurniture = new StreetFurniture(this.assetMgr);
    this.cityPark = new CityPark();
    this.parkingSystem = new ParkingSystem(this.assetMgr);

    this.buildAllDistricts();
    this.buildSidewalks();

    this.group.add(this.streetFurniture.group);
    this.group.add(this.cityPark.group);
    this.group.add(this.parkingSystem.group);
  }

  private buildAllDistricts() {
    for (const dist of DISTRICTS) {
      if (dist.id === "park") {
        // Park handled by CityPark module
        this.cityPark.build(dist.center.x, dist.center.z, dist.halfW, dist.halfD);
        continue;
      }
      this.populateDistrict(dist);
    }
  }

  /**
   * Fill a district with buildings on a grid, avoiding the Apex Tower zone
   */
  private populateDistrict(dist: DistrictDef) {
    // Grid spacing tuned for architectural density and abundant residential homes
    const baseSpacing = dist.id === "cbd" ? 38 : dist.id === "residential_low" ? 24 : 32;
    const jitter = baseSpacing * 0.15;

    const minX = dist.center.x - dist.halfW;
    const maxX = dist.center.x + dist.halfW;
    const minZ = dist.center.z - dist.halfD;
    const maxZ = dist.center.z + dist.halfD;

    for (let gx = minX + baseSpacing / 2; gx < maxX; gx += baseSpacing) {
      for (let gz = minZ + baseSpacing / 2; gz < maxZ; gz += baseSpacing) {
        // Skip if density roll fails
        if (this.rng.next() > dist.buildingDensity) continue;

        const px = gx + this.rng.range(-jitter, jitter);
        const pz = gz + this.rng.range(-jitter, jitter);

        // --- CITY ROAD EXCLUSION ---
        const avenuesX = [540, 640, 740, 840, 940];
        const streetsZ = [120, 200, 280, 360, 440, 520, 600, 680];
        let onRoad = false;
        for (const ax of avenuesX) if (Math.abs(px - ax) < 11) { onRoad = true; break; }
        for (const sz of streetsZ) if (Math.abs(pz - sz) < 11) { onRoad = true; break; }
        if (onRoad) continue;

        // Protect Apex Tower zone (760, 360) Â± 20m
        if (Math.abs(px - 760) < 22 && Math.abs(pz - 360) < 22) continue;

        // Protect helipads
        if (Math.abs(px - 610) < 18 && Math.abs(pz - 320) < 18) continue; // city-alpha

        const height = this.rng.range(dist.minHeight, dist.maxHeight);
        const rotY = this.rng.pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);

        const placement: BuildingPlacement = {
          x: px,
          z: pz,
          height,
          rotationY: rotY,
          districtType: dist.id,
        };

        const buildingGroup = this.buildingGen.createBuilding(placement);
        this.group.add(buildingGroup);

        // Street furniture near buildings
        this.streetFurniture.placeNearBuilding(px, pz, dist.id);

        // Parking near commercial and residential
        if (dist.id === "commercial" || dist.id === "residential_high") {
          if (this.rng.next() > 0.5) {
            this.parkingSystem.addParkedVehicle(
              px + this.rng.range(-12, 12),
              pz + this.rng.range(-12, 12),
              this.rng.next() * Math.PI * 2
            );
          }
        }
      }
    }
  }

  /**
   * Raised concrete sidewalks along major downtown roads
   */
  private buildSidewalks() {
    const sidewalkMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af, // Light grey concrete
      roughness: 0.85,
      metalness: 0.05,
    });

    const sidewalkH = 0.15;
    const sidewalkW = 2.8;
    const segmentL = 10; // Break into 10m segments to follow terrain

    // Along the 4 Major N-S Avenues (x=540, 640, 740, 840, length 440m)
    [540, 640, 740, 840].forEach((aveX) => {
      const segGeo = new THREE.BoxGeometry(sidewalkW, sidewalkH, segmentL);
      for (let z = 100; z < 540; z += segmentL) {
        const cz = z + segmentL / 2;
        
        const leftMesh = new THREE.Mesh(segGeo, sidewalkMat);
        const yL = evaluateIslandElevation(aveX - 7 - sidewalkW / 2, cz).elevation;
        leftMesh.position.set(aveX - 7 - sidewalkW / 2, yL + sidewalkH / 2, cz);
        leftMesh.receiveShadow = true;
        this.group.add(leftMesh);

        const rightMesh = new THREE.Mesh(segGeo, sidewalkMat);
        const yR = evaluateIslandElevation(aveX + 7 + sidewalkW / 2, cz).elevation;
        rightMesh.position.set(aveX + 7 + sidewalkW / 2, yR + sidewalkH / 2, cz);
        rightMesh.receiveShadow = true;
        this.group.add(rightMesh);
      }
    });

    // Along 4 E-W Cross Streets (z=200, 280, 360, 440, length 440m)
    [200, 280, 360, 440].forEach((streetZ) => {
      const segGeo = new THREE.BoxGeometry(segmentL, sidewalkH, sidewalkW);
      for (let x = 470; x < 910; x += segmentL) {
        const cx = x + segmentL / 2;

        const topMesh = new THREE.Mesh(segGeo, sidewalkMat);
        const yT = evaluateIslandElevation(cx, streetZ - 7 - sidewalkW / 2).elevation;
        topMesh.position.set(cx, yT + sidewalkH / 2, streetZ - 7 - sidewalkW / 2);
        topMesh.receiveShadow = true;
        this.group.add(topMesh);

        const botMesh = new THREE.Mesh(segGeo, sidewalkMat);
        const yB = evaluateIslandElevation(cx, streetZ + 7 + sidewalkW / 2).elevation;
        botMesh.position.set(cx, yB + sidewalkH / 2, streetZ + 7 + sidewalkW / 2);
        botMesh.receiveShadow = true;
        this.group.add(botMesh);
      }
    });

    // Crosswalks at major intersections
    const crosswalkMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.5,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    });

    const intersections = [
      { x: 540, z: 280 },
      { x: 540, z: 360 },
      { x: 640, z: 200 },
      { x: 640, z: 280 },
      { x: 640, z: 360 },
      { x: 640, z: 440 },
      { x: 740, z: 200 },
      { x: 740, z: 280 },
      { x: 740, z: 360 },
      { x: 740, z: 440 },
      { x: 840, z: 280 },
      { x: 840, z: 360 },
    ];

    intersections.forEach(pos => {
      // Zebra stripes (6 stripes per crossing, 2 crossings per intersection)
      for (let dir = 0; dir < 2; dir++) {
        for (let s = -3; s <= 2; s++) {
          const stripeGeo = dir === 0
            ? new THREE.PlaneGeometry(1.0, 10)
            : new THREE.PlaneGeometry(10, 1.0);
          stripeGeo.rotateX(-Math.PI / 2);
          const stripe = new THREE.Mesh(stripeGeo, crosswalkMat);
          let cx = dir === 0 ? pos.x + s * 2 : pos.x;
          let cz = dir === 0 ? pos.z : pos.z + s * 2;
          const y = evaluateIslandElevation(cx, cz).elevation;
          stripe.position.set(cx, y + 0.02, cz);
          this.group.add(stripe);
        }
      }
    });
  }

  public update(_dt: number, _elapsed: number) {
    // Future: animated signs, traffic light cycling
  }
}



