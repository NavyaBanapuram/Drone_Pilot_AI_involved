// ==========================================================
// DRONE PILOT — REGION 5: DOWNTOWN METROPOLIS (PHASE 1)
// Commercial skyscrapers, concrete plaza, Vertiport & Apex Tower Skyport (68m)
// ==========================================================

import * as THREE from "three";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { createHelipadMesh } from "../helipad-mesh";
import { AssetManager } from "../asset-manager";

export class CityRegion {
  public group = new THREE.Group();
  private assetMgr = AssetManager.getInstance();
  private radarDish!: THREE.Mesh;
  private commsStrobe!: THREE.Mesh;

  constructor() {
    // 1. Urban Concrete Ground Plaza
    this.buildUrbanPlaza();

    // 2. Physical Helipads
    const padGround = createHelipadMesh(HELIPADS["city-alpha"]);
    this.group.add(padGround);

    const padRooftop = createHelipadMesh(HELIPADS["city-apex-rooftop"]);
    this.group.add(padRooftop);

    // 4. Communications Mast & Hazard Beacon
    this.buildCommunicationsTower();
  }

  /**
   * Paved concrete urban base for the entire downtown core
   */
  private buildUrbanPlaza() {
    const plazaGeo = new THREE.PlaneGeometry(440, 440);
    plazaGeo.rotateX(-Math.PI / 2);

    const plazaMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Concrete urban plaza base
      roughness: 0.85,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

    const plaza = new THREE.Mesh(plazaGeo, plazaMat);
    plaza.position.set(720, 2.52, 320);
    plaza.receiveShadow = true;
    this.group.add(plaza);

    // Vertiport Terminal building beside city-alpha pad (x: 610, y: 2.5, z: 320)
    const terminalMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.4,
      metalness: 0.6,
    });
    const terminal = new THREE.Mesh(new THREE.BoxGeometry(22, 9, 32), terminalMat);
    terminal.position.set(610, 2.5 + 4.5, 320);
    terminal.castShadow = true;
    terminal.receiveShadow = true;
    this.group.add(terminal);

    // Terminal glass curtain facade
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.1,
      metalness: 0.9,
      transparent: true,
      opacity: 0.8,
    });
    const terminalGlass = new THREE.Mesh(new THREE.BoxGeometry(22.4, 6.5, 32.4), glassMat);
    terminalGlass.position.set(610, 2.5 + 4.5, 320);
    this.group.add(terminalGlass);
  }

  /**
   * Spawns high-rise commercial skyscrapers and multi-story office blocks
   */
  private async buildSkyscraperSkyline() {
    const skyscraperModels = [
      "/models/commercial/building-skyscraper-a.glb",
      "/models/commercial/building-skyscraper-b.glb",
      "/models/commercial/building-skyscraper-c.glb",
      "/models/commercial/building-skyscraper-d.glb",
      "/models/commercial/building-skyscraper-e.glb",
    ];

    const commercialModels = [
      "/models/commercial/building-a.glb",
      "/models/commercial/building-c.glb",
      "/models/commercial/building-e.glb",
      "/models/commercial/building-g.glb",
      "/models/commercial/building-i.glb",
      "/models/commercial/building-k.glb",
      "/models/commercial/building-m.glb",
      "/models/commercial/building-n.glb",
    ];

    let skyTemplates: THREE.Group[] = [];
    let commTemplates: THREE.Group[] = [];

    try {
      [skyTemplates, commTemplates] = await Promise.all([
        Promise.all(skyscraperModels.map((p) => this.assetMgr.loadModel(p))),
        Promise.all(commercialModels.map((p) => this.assetMgr.loadModel(p))),
      ]);
    } catch {
      // Graceful fallback if models take longer or fail
    }

    // Core Apex Center Tower supporting the rooftop skyport at (760, 68.0, 360)
    // 1. Ground Plaza Podium (0m - 12m)
    const podiumMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a, // Deep slate granite
      roughness: 0.35,
      metalness: 0.65,
    });
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.08,
      metalness: 0.92,
      transparent: true,
      opacity: 0.85,
    });
    const mullionMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Brushed aluminum mullions
      roughness: 0.2,
      metalness: 0.9,
    });

    // Podium Base
    const podium = new THREE.Mesh(new THREE.BoxGeometry(36, 12, 36), podiumMat);
    podium.position.set(760, 6 + 2.5, 360);
    podium.castShadow = true;
    podium.receiveShadow = true;
    this.group.add(podium);

    // Grand Entrance Glass Lobby with canopy
    const lobbyGlass = new THREE.Mesh(new THREE.BoxGeometry(36.4, 7, 14), glassMat);
    lobbyGlass.position.set(760, 3.5 + 2.5, 372);
    this.group.add(lobbyGlass);

    const entranceCanopy = new THREE.Mesh(
      new THREE.BoxGeometry(18, 0.6, 6),
      mullionMat
    );
    entranceCanopy.position.set(760, 7.5 + 2.5, 381);
    entranceCanopy.castShadow = true;
    this.group.add(entranceCanopy);

    // 2. Main Tower Shaft (12m - 56m)
    const shaft = new THREE.Mesh(new THREE.BoxGeometry(32, 44, 32), podiumMat);
    shaft.position.set(760, 14.5 + 22, 360);
    shaft.castShadow = true;
    shaft.receiveShadow = true;
    this.group.add(shaft);

    // Glass curtain bands with vertical aluminum structural fins
    for (let f = 17; f < 55; f += 4.5) {
      const band = new THREE.Mesh(new THREE.BoxGeometry(32.4, 2.6, 32.4), glassMat);
      band.position.set(760, f, 360);
      this.group.add(band);
    }
    // Vertical mullion columns on all 4 corners
    const colGeo = new THREE.BoxGeometry(0.8, 44, 0.8);
    [
      [-16, -16],
      [-16, 16],
      [16, -16],
      [16, 16],
    ].forEach(([cx, cz]) => {
      const col = new THREE.Mesh(colGeo, mullionMat);
      col.position.set(760 + cx, 14.5 + 22, 360 + cz);
      this.group.add(col);
    });

    // 3. Upper Setback Tier (56m - 67.8m)
    const crown = new THREE.Mesh(new THREE.BoxGeometry(26, 11.8, 26), podiumMat);
    crown.position.set(760, 56.5 + 5.9, 360);
    crown.castShadow = true;
    this.group.add(crown);

    const crownGlass = new THREE.Mesh(new THREE.BoxGeometry(26.4, 7, 26.4), glassMat);
    crownGlass.position.set(760, 56.5 + 5.9, 360);
    this.group.add(crownGlass);

    // Rooftop Skyport Perimeter Railing & Safety Strobes at 68m
    const railMat = new THREE.MeshBasicMaterial({ color: 0xfacc15 });
    const cornerStrobes = [
      [748, 348],
      [748, 372],
      [772, 348],
      [772, 372],
    ];
    cornerStrobes.forEach(([sx, sz]) => {
      const strobe = new THREE.Mesh(new THREE.SphereGeometry(0.45, 6, 6), railMat);
      strobe.position.set(sx, 68.3, sz);
      this.group.add(strobe);
    });

    // Spire antenna on crown edge
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.6, 14, 6),
      mullionMat
    );
    spire.position.set(770, 75, 370);
    this.group.add(spire);

    const spireBeacon = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    spireBeacon.position.set(770, 82.2, 370);
    this.group.add(spireBeacon);

    // Dense cluster of realistic GLB skyscrapers across downtown (65m - 125m tall)
    if (skyTemplates.length > 0) {
      const skyLocations = [
        // Downtown Financial Core (around Apex Center at 760, 360)
        { x: 670, z: 270, scale: 20.0, rot: 0, idx: 0 },
        { x: 670, z: 380, scale: 22.0, rot: Math.PI / 2, idx: 1 },
        { x: 710, z: 220, scale: 19.0, rot: Math.PI, idx: 2 },
        { x: 710, z: 420, scale: 24.0, rot: 0, idx: 3 },
        { x: 810, z: 270, scale: 21.0, rot: -Math.PI / 2, idx: 4 },
        { x: 810, z: 380, scale: 19.5, rot: 0, idx: 1 },
        { x: 840, z: 320, scale: 23.0, rot: Math.PI / 2, idx: 2 },
        // Secondary Skyline Extension (East Boulevard & North Plaza)
        { x: 760, z: 230, scale: 18.5, rot: Math.PI / 4, idx: 3 },
        { x: 760, z: 450, scale: 19.0, rot: -Math.PI / 4, idx: 0 },
        { x: 850, z: 240, scale: 17.0, rot: 0, idx: 4 },
        { x: 850, z: 410, scale: 18.0, rot: Math.PI / 2, idx: 1 },
      ];

      skyLocations.forEach((loc) => {
        const template = skyTemplates[loc.idx % skyTemplates.length].clone();
        template.scale.set(loc.scale, loc.scale * 3.5, loc.scale);
        template.position.set(loc.x, 2.5, loc.z);
        template.rotation.y = loc.rot;
        this.group.add(template);

        // Rooftop hazard beacon on towers over 70m
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.55, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xef4444 })
        );
        beacon.position.set(loc.x, 2.5 + loc.scale * 3.5 * 0.95, loc.z);
        this.group.add(beacon);
      });
    }

    // Commercial storefronts, mid-rise offices & district perimeter blocks
    if (commTemplates.length > 0) {
      const midLocations = [
        // Vertiport Approach Corridor
        { x: 580, z: 240, scale: 10.0, rot: 0 },
        { x: 580, z: 380, scale: 11.0, rot: 0 },
        { x: 600, z: 320, scale: 9.0, rot: Math.PI / 2 },
        // Central Avenues
        { x: 730, z: 280, scale: 9.5, rot: Math.PI / 2 },
        { x: 730, z: 360, scale: 10.5, rot: Math.PI / 2 },
        { x: 800, z: 220, scale: 10.0, rot: Math.PI },
        { x: 800, z: 430, scale: 11.0, rot: Math.PI },
        // Outskirts & Transition Blocks
        { x: 640, z: 180, scale: 8.5, rot: 0 },
        { x: 690, z: 180, scale: 9.0, rot: 0 },
        { x: 880, z: 310, scale: 9.5, rot: Math.PI / 2 },
        { x: 880, z: 360, scale: 8.5, rot: Math.PI / 2 },
        { x: 650, z: 460, scale: 9.0, rot: Math.PI },
        { x: 710, z: 470, scale: 9.5, rot: 0 },
      ];

      midLocations.forEach((loc, i) => {
        const template = commTemplates[i % commTemplates.length].clone();
        template.scale.set(loc.scale, loc.scale * 2.2, loc.scale);
        template.position.set(loc.x, 2.5, loc.z);
        template.rotation.y = loc.rot;
        this.group.add(template);
      });
    }
  }

  /**
   * Communications lattice tower with rotating radar dish and flashing red beacon
   */
  private buildCommunicationsTower() {
    const towerX = 680;
    const towerZ = 440;
    const mastMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85 });

    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 2.4, 48, 4),
      mastMat
    );
    mast.position.set(towerX, 24 + 2.5, towerZ);
    mast.rotation.y = Math.PI / 4;
    mast.castShadow = true;
    this.group.add(mast);

    this.radarDish = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 0.4, 0.6, 16),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.7 })
    );
    this.radarDish.position.set(towerX, 48 + 2.5, towerZ);
    this.group.add(this.radarDish);

    this.commsStrobe = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xef4444 })
    );
    this.commsStrobe.position.set(towerX, 50.5 + 2.5, towerZ);
    this.group.add(this.commsStrobe);
  }

  public update(_dt: number, elapsed: number) {
    if (this.radarDish) {
      this.radarDish.rotation.y = elapsed * 1.5;
    }
    if (this.commsStrobe) {
      const strobeOn = Math.sin(elapsed * 6) > 0.3;
      (this.commsStrobe.material as THREE.MeshBasicMaterial).color.setHex(
        strobeOn ? 0xef4444 : 0x450a0a
      );
    }
  }
}
