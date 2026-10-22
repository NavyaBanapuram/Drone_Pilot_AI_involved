// ==========================================================
// DRONE PILOT â€” MASTER ROAD NETWORK & HIGHWAY SYSTEM (PHASE 1)
// Realistic asphalt highways, regional connectors, mountain switchbacks,
// river canyon bridges, streetlights & traffic waypoints
// ==========================================================

import * as THREE from "three";
import { WORLD_DEFINITION } from "@/lib/world/world-definition";
import { RoadPolyline, Vector3D } from "@/lib/world/world-types";
import { evaluateIslandElevation } from "@/lib/world/terrain-math";
import { queryHydrology } from "@/lib/world/hydrology-mask";
import { WorldMaterials } from "./world-materials";

export class RoadNetwork {
  public group = new THREE.Group();

  // Navigation waypoints for traffic simulation
  public waypoints: THREE.Vector3[] = [];

  private roadMat: THREE.MeshStandardMaterial;
  private markingMat: THREE.MeshStandardMaterial;
  private whiteLineMat: THREE.MeshStandardMaterial;
  private bridgeMat: THREE.MeshStandardMaterial;

  private dirtRoadMat: THREE.MeshStandardMaterial;

  constructor() {
    this.roadMat = WorldMaterials.asphalt;
    this.dirtRoadMat = new THREE.MeshStandardMaterial({
      color: 0x735c40, // Natural sandy brown dirt
      roughness: 0.95,
      metalness: 0.05,
    });
    this.markingMat = WorldMaterials.markingYellow;
    this.whiteLineMat = WorldMaterials.markingWhite;
    this.bridgeMat = WorldMaterials.concrete;

    this.buildMasterNetwork();
    this.buildDowntownGrid();
    this.buildStreetlights();
    this.buildRoadGuardrails();
  }

  /**
   * Builds all continuous road ribbons from canonical WORLD_DEFINITION.roads
   */
  private buildMasterNetwork() {
    // 1. Primary Highways (Metropolis -> Industrial -> Port)
    WORLD_DEFINITION.roads.primaryHighways.forEach((road) => {
      this.buildRoadRibbon(road, true, road.type === "rural" || road.type === "switchback");
    });

    // 2. Arterial Connectors (Academy -> City, Academy -> Forest, Pelican Spur)
    WORLD_DEFINITION.roads.connectors.forEach((road) => {
      this.buildRoadRibbon(road, true, road.type === "rural" || road.type === "switchback");
    });

    // 3. Southern Coastal Connector (Pelican Cove -> Estuary -> Harbor Port)
    // Cleanly split at bridge abutments so no road ribbon is rendered underwater
    const coastalConnectorWest: RoadPolyline = {
      id: "road-southern-coastal-west",
      name: "Southern Coastal Highway West",
      type: "highway",
      widthMeters: 10,
      points: [
        { x: -720, y: 2.0, z: 560 },
        { x: -580, y: 2.2, z: 660 },
        { x: -400, y: 2.4, z: 740 },
        { x: -260, y: 2.6, z: 800 },
        { x: -140, y: 3.2, z: 840 }, // West bridge abutment
      ],
    };
    this.buildRoadRibbon(coastalConnectorWest, true, false);

    const coastalConnectorEast: RoadPolyline = {
      id: "road-southern-coastal-east",
      name: "Southern Coastal Highway East",
      type: "highway",
      widthMeters: 10,
      points: [
        { x: -40, y: 3.2, z: 860 },  // East bridge abutment
        { x: 60, y: 1.3, z: 880 },   // Connect to harbor highway
      ],
    };
    this.buildRoadRibbon(coastalConnectorEast, true, false);

    // 4. Mountain Switchback Pass
    WORLD_DEFINITION.roads.mountainPasses.forEach((road) => {
      this.buildRoadRibbon(road, false, road.type === "rural" || road.type === "switchback");
    });

    // 5. Canyon & Estuary Bridges
    WORLD_DEFINITION.roads.bridges.forEach((bridge) => {
      this.buildBridgeStructure(bridge);
    });

    // Estuary Delta Bridge spanning the lower river mouth
    this.buildBridgeStructure({
      id: "bridge-estuary",
      name: "Southern Estuary Maritime Bridge",
      type: "bridge",
      widthMeters: 12,
      points: [
        { x: -140, y: 3.2, z: 840 },
        { x: -40, y: 3.2, z: 860 },
      ],
      hasBridge: false, // Marine viaduct causeway
    });

    // 6. Intersection Blending Aprons (Fixes overlapping and abrupt endings)
    const junctions = [
      { x: -180, z: 140, r: 8 }, // West bridge abutment junction
      { x: -100, z: 180, r: 8 }, // East bridge abutment junction
      { x: -320, z: 340, r: 9 }, // Forest loop meets Pelican highway
      { x: -300, z: 70, r: 8 },  // Mountain pass start
      { x: 50, z: 0, r: 10 },    // Academy East Entrance
      { x: -50, z: 60, r: 10 },  // Academy North Perimeter
      { x: 60, z: 880, r: 12 },  // Harbor highway meets coastal highway
      { x: 640, z: 240, r: 16 }, // City downtown grid entry
      { x: 640, z: 120, r: 12 }, // Northern parkway meets city
    ];
    junctions.forEach((j) => this.buildIntersectionApron(j.x, j.z, j.r));

    // 7. Terminus Loops & Cul-de-Sacs (Ensures roads never end abruptly into grass)
    this.buildTurnaroundApron(-620, -40, 18, "Forest Ranger Station Turnaround");
    this.buildTurnaroundApron(-720, 560, 22, "Pelican Cove Coastal Overlook");
    this.buildTurnaroundApron(-580, -560, 16, "Mount Apex Weather Station Overlook");
    this.buildTurnaroundApron(-50, 0, 16, "Academy Flightline Access Loop");
  }

  /**
   * Paved circular intersection to seamlessly blend converging road ribbons
   */
  private buildIntersectionApron(cx: number, cz: number, radius: number) {
    const sample = evaluateIslandElevation(cx, cz);
    const y = Math.max(1.35, sample.elevation + 0.23); // Slightly above roads to cover z-fighting

    const circleGeo = new THREE.CircleGeometry(radius, 32);
    circleGeo.rotateX(-Math.PI / 2);
    const circleMesh = new THREE.Mesh(circleGeo, this.roadMat);
    circleMesh.position.set(cx, y, cz);
    circleMesh.receiveShadow = true;
    this.group.add(circleMesh);
  }

  /**
   * Paved circular turnaround apron / cul-de-sac with asphalt finish and concrete curb
   */
  private buildTurnaroundApron(cx: number, cz: number, radius: number, _name: string) {
    const sample = evaluateIslandElevation(cx, cz);
    const y = Math.max(1.35, sample.elevation + 0.18);

    // Reinforced concrete curb foundation so terrain never bleeds through
    const curbGeo = new THREE.CylinderGeometry(radius * 1.01, radius * 1.03, 0.40, 32);
    const curbMesh = new THREE.Mesh(curbGeo, this.bridgeMat);
    curbMesh.position.set(cx, y - 0.20, cz);
    curbMesh.receiveShadow = true;
    this.group.add(curbMesh);

    // Asphalt surface disc
    const circleGeo = new THREE.CircleGeometry(radius, 32);
    circleGeo.rotateX(-Math.PI / 2);
    const circleMesh = new THREE.Mesh(circleGeo, this.roadMat);
    circleMesh.position.set(cx, y + 0.01, cz);
    circleMesh.receiveShadow = true;
    this.group.add(circleMesh);

    // Circular white marking ring
    const ringGeo = new THREE.RingGeometry(radius - 2.5, radius - 2.0, 32);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, this.whiteLineMat);
    ringMesh.position.set(cx, y + 0.025, cz);
    ringMesh.receiveShadow = true;
    this.group.add(ringMesh);
  }

  /**
   * Generates a smooth, continuous asphalt ribbon conforming to terrain elevation
   * with strict water clearance guarantees (roads never plunge underwater)
   */
  private buildRoadRibbon(road: RoadPolyline, withCenterline = true, isDirt = false) {
    const rawPoints = road.points;
    if (rawPoints.length < 2) return;

    // Catmull-Rom centripetal spline for organic, natural flowing curves (no zig-zags)
    const curvePts = rawPoints.map((p) => new THREE.Vector3(p.x, 0, p.z));
    const curve = new THREE.CatmullRomCurve3(curvePts, false, "centripetal", 0.5);

    let totalLen = 0;
    for (let i = 0; i < rawPoints.length - 1; i++) {
      totalLen += Math.hypot(rawPoints[i + 1].x - rawPoints[i].x, rawPoints[i + 1].z - rawPoints[i].z);
    }
    const sampleStep = 6.0; // 6-meter fine resolution for buttery-smooth curvature
    const steps = Math.max(6, Math.round(totalLen / sampleStep));

    const sampledPoints: THREE.Vector3[] = [];
    const getRoadElevation = (x: number, z: number): number => {
      const terrainY = evaluateIslandElevation(x, z).elevation;
      const hydro = queryHydrology(x, z, terrainY);
      if (hydro.isWater) {
        return Math.max(terrainY + 0.22, hydro.waterElevation + 1.2);
      }
      return Math.max(terrainY + 0.22, 1.35);
    };

    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const pt = curve.getPoint(t);
      const roadY = getRoadElevation(pt.x, pt.z);
      sampledPoints.push(new THREE.Vector3(pt.x, roadY, pt.z));
    }

    if (sampledPoints.length < 2) return;

    const halfWidth = road.widthMeters / 2;
    const vertices: number[] = [];
    const uvs: number[] = [];
    const lineVerts: number[] = [];

    for (let i = 0; i < sampledPoints.length; i++) {
      const curr = sampledPoints[i];
      let tangent = new THREE.Vector3();

      if (i === 0) {
        tangent.subVectors(sampledPoints[1], curr).normalize();
      } else if (i === sampledPoints.length - 1) {
        tangent.subVectors(curr, sampledPoints[i - 1]).normalize();
      } else {
        tangent.subVectors(sampledPoints[i + 1], sampledPoints[i - 1]).normalize();
      }

      // Normal perpendicular vector in XZ plane
      const perp = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

      const left = new THREE.Vector3().copy(curr).addScaledVector(perp, -halfWidth);
      const right = new THREE.Vector3().copy(curr).addScaledVector(perp, halfWidth);

      if (i > 0) {
        const prevIdx = (i - 1) * 2;
        const currIdx = i * 2;

        // Quad triangles
        // Triangle 1: prevLeft, prevRight, currLeft
        // Triangle 2: currLeft, prevRight, currRight
      }

      vertices.push(left.x, left.y, left.z);
      vertices.push(right.x, right.y, right.z);

      const vProgress = i / (sampledPoints.length - 1);
      uvs.push(0, vProgress * 20);
      uvs.push(1, vProgress * 20);

      // Single Centerline
      if (withCenterline) {
        const cLeft = new THREE.Vector3().copy(curr).addScaledVector(perp, -0.06);
        const cRight = new THREE.Vector3().copy(curr).addScaledVector(perp, 0.06);
        lineVerts.push(cLeft.x, cLeft.y + 0.015, cLeft.z);
        lineVerts.push(cRight.x, cRight.y + 0.015, cRight.z);
      }
    }

    // Index buffer for road quad strip
    const indices: number[] = [];
    for (let i = 0; i < sampledPoints.length - 1; i++) {
      const pL = i * 2;
      const pR = i * 2 + 1;
      const cL = (i + 1) * 2;
      const cR = (i + 1) * 2 + 1;

      indices.push(pL, pR, cL);
      indices.push(cL, pR, cR);
    }

    const roadGeo = new THREE.BufferGeometry();
    roadGeo.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    roadGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    roadGeo.setIndex(indices);
    roadGeo.computeVertexNormals();

    const roadMesh = new THREE.Mesh(roadGeo, this.roadMat);
    roadMesh.receiveShadow = true;
    this.group.add(roadMesh);

    // Centerline strip
    if (withCenterline && lineVerts.length >= 6) {
      const lineIndices: number[] = [];
      for (let i = 0; i < sampledPoints.length - 1; i++) {
        const pL = i * 2;
        const pR = i * 2 + 1;
        const cL = (i + 1) * 2;
        const cR = (i + 1) * 2 + 1;
        lineIndices.push(pL, pR, cL);
        lineIndices.push(cL, pR, cR);
      }

      const lineGeo = new THREE.BufferGeometry();
      lineGeo.setAttribute("position", new THREE.Float32BufferAttribute(lineVerts, 3));
      lineGeo.setIndex(lineIndices);
      lineGeo.computeVertexNormals();

      const lineMesh = new THREE.Mesh(lineGeo, this.whiteLineMat);
      lineMesh.receiveShadow = true;
      this.group.add(lineMesh);
    }
  }

  /**
   * Builds an elevated bridge deck spanning the river canyon with concrete arches & safety railings
   */
  private buildBridgeStructure(bridge: RoadPolyline) {
    if (bridge.points.length < 2) return;
    const p1 = bridge.points[0];
    const p2 = bridge.points[1];

    const start = new THREE.Vector3(p1.x, p1.y, p1.z);
    const end = new THREE.Vector3(p2.x, p2.y, p2.z);
    const length = start.distanceTo(end);
    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const angle = Math.atan2(end.z - start.z, end.x - start.x);

    const bridgeGroup = new THREE.Group();
    bridgeGroup.position.copy(mid);
    bridgeGroup.rotation.y = -angle;

    const w = bridge.widthMeters;
    const steelMat = WorldMaterials.steel;
    const cableMat = WorldMaterials.steel;
    const strobeMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const lampGlowMat = new THREE.MeshBasicMaterial({ color: 0xfef08a });

    // 1. Reinforced Deck Slab (thickness: 1.4m)
    const deckGeo = new THREE.BoxGeometry(length, 1.4, w);
    const deck = new THREE.Mesh(deckGeo, this.bridgeMat);
    deck.castShadow = true;
    deck.receiveShadow = true;
    bridgeGroup.add(deck);

    // 2. Asphalt Roadway with Markings
    const surfaceGeo = new THREE.PlaneGeometry(length, w - 1.2);
    surfaceGeo.rotateX(-Math.PI / 2);
    const surface = new THREE.Mesh(surfaceGeo, this.roadMat);
    surface.position.y = 0.71;
    bridgeGroup.add(surface);

    // Single White Centerline
    const yellowLineGeo = new THREE.PlaneGeometry(length, 0.15);
    yellowLineGeo.rotateX(-Math.PI / 2);
    const yellowLine = new THREE.Mesh(yellowLineGeo, this.whiteLineMat);
    yellowLine.position.y = 0.72;
    bridgeGroup.add(yellowLine);

    // White Edge Lines
    [-w / 2 + 1.2, w / 2 - 1.2].forEach((side) => {
      const whiteLineGeo = new THREE.PlaneGeometry(length, 0.2);
      whiteLineGeo.rotateX(-Math.PI / 2);
      const whiteLine = new THREE.Mesh(whiteLineGeo, this.whiteLineMat);
      whiteLine.position.set(0, 0.72, side);
      bridgeGroup.add(whiteLine);
    });

    // 3. Safety Barrier Guardrails with Reflectors
    [-w / 2 + 0.4, w / 2 - 0.4].forEach((side) => {
      const railGeo = new THREE.BoxGeometry(length, 1.1, 0.35);
      const rail = new THREE.Mesh(railGeo, this.bridgeMat);
      rail.position.set(0, 0.7 + 0.55, side);
      rail.castShadow = true;
      bridgeGroup.add(rail);

      // Steel top cap on railing
      const capGeo = new THREE.BoxGeometry(length, 0.12, 0.45);
      const cap = new THREE.Mesh(capGeo, steelMat);
      cap.position.set(0, 0.7 + 1.15, side);
      bridgeGroup.add(cap);
    });

    // Solid concrete abutment anchorage blocks embedded into canyon terrain rims
    [-length / 2, length / 2].forEach((ax) => {
      const abutmentGeo = new THREE.BoxGeometry(6.0, 5.5, w + 1.6);
      const abutment = new THREE.Mesh(abutmentGeo, this.bridgeMat);
      abutment.position.set(ax, -2.0, 0);
      abutment.receiveShadow = true;
      abutment.castShadow = true;
      bridgeGroup.add(abutment);
    });

    // 4. Specific Bridge Engineering Typologies (Cable-stayed / Suspension)
    if (bridge.id === "bridge-valley") {
      // ----------------------------------------------------
      // GRAND RIVER CANYON SUSPENSION / CABLE-STAYED BRIDGE
      // ----------------------------------------------------
      const towerDist = length * 0.28;
      const towerHeight = 22.0; // Rises 22m above road deck
      const towerBaseDepth = 14.0; // Extends down to canyon bed

      // Steel Truss Undercarriage beneath the deck
      const trussHeight = 2.4;
      const trussGeo = new THREE.BoxGeometry(length * 0.94, trussHeight, w * 0.9);
      const truss = new THREE.Mesh(trussGeo, steelMat);
      truss.position.set(0, -0.7 - trussHeight / 2, 0);
      bridgeGroup.add(truss);

      // Twin H-Frame Concrete Pylon Towers
      [-towerDist, towerDist].forEach((tx) => {
        // Pylon legs on each side of the deck
        [-w / 2 - 0.8, w / 2 + 0.8].forEach((tz) => {
          const legGeo = new THREE.BoxGeometry(2.4, towerHeight + towerBaseDepth, 1.8);
          const leg = new THREE.Mesh(legGeo, this.bridgeMat);
          leg.position.set(tx, (towerHeight - towerBaseDepth) / 2, tz);
          leg.castShadow = true;
          bridgeGroup.add(leg);

          // Tower Apex Aviation Beacon
          const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.4, 6, 6), strobeMat);
          beacon.position.set(tx, towerHeight + 0.3, tz);
          bridgeGroup.add(beacon);
        });

        // Horizontal Portal Cross-Beam connecting legs above traffic
        const beamGeo = new THREE.BoxGeometry(2.4, 1.6, w + 3.4);
        const beam = new THREE.Mesh(beamGeo, this.bridgeMat);
        beam.position.set(tx, 7.5, 0);
        bridgeGroup.add(beam);

        // Upper Crown Cross-Beam
        const crownBeam = new THREE.Mesh(
          new THREE.BoxGeometry(2.0, 1.4, w + 3.4),
          this.bridgeMat
        );
        crownBeam.position.set(tx, towerHeight - 1.2, 0);
        bridgeGroup.add(crownBeam);
      });

      // Parabolic Main Suspension Cables and Vertical Hanger Suspenders
      [-w / 2 - 0.7, w / 2 + 0.7].forEach((cableZ) => {
        const cableSteps = 24;
        const cablePoints: THREE.Vector3[] = [];

        for (let i = 0; i <= cableSteps; i++) {
          const t = i / cableSteps;
          const x = -length / 2 + t * length;
          let y = 0.7;

          if (x < -towerDist) {
            // Anchor backspan: slopes from deck anchor up to tower saddle
            const p = (x - (-length / 2)) / (-towerDist - (-length / 2));
            y = 1.0 + p * (towerHeight - 1.0);
          } else if (x > towerDist) {
            // Far anchor backspan
            const p = (length / 2 - x) / (length / 2 - towerDist);
            y = 1.0 + p * (towerHeight - 1.0);
          } else {
            // Main span catenary sag: tower apex (21m) -> midspan dip (2.8m) -> tower apex
            const midP = (x + towerDist) / (towerDist * 2); // 0 to 1
            const sag = Math.sin(midP * Math.PI);
            y = towerHeight - sag * (towerHeight - 2.8);
          }
          cablePoints.push(new THREE.Vector3(x, y, cableZ));

          // Vertical wire suspender hangers in main span
          if (x >= -towerDist + 2 && x <= towerDist - 2 && i % 2 === 0) {
            const hangerHeight = y - 0.7;
            if (hangerHeight > 0.8) {
              const hangerGeo = new THREE.CylinderGeometry(0.04, 0.04, hangerHeight, 4);
              const hanger = new THREE.Mesh(hangerGeo, cableMat);
              hanger.position.set(x, 0.7 + hangerHeight / 2, cableZ);
              bridgeGroup.add(hanger);
            }
          }
        }

        // Main Suspension Cable Tube
        const curve = new THREE.CatmullRomCurve3(cablePoints);
        const tubeGeo = new THREE.TubeGeometry(curve, 32, 0.18, 6, false);
        const tube = new THREE.Mesh(tubeGeo, cableMat);
        bridgeGroup.add(tube);
      });

      // Bridge Deck Streetlights along both sides
      for (let lx = -length * 0.42; lx <= length * 0.42; lx += 18) {
        [-w / 2 + 0.4, w / 2 - 0.4].forEach((lz) => {
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.08, 0.12, 5.0, 5),
            steelMat
          );
          pole.position.set(lx, 0.7 + 2.5, lz);
          bridgeGroup.add(pole);

          const fixture = new THREE.Mesh(
            new THREE.BoxGeometry(0.4, 0.15, 0.4),
            lampGlowMat
          );
          fixture.position.set(lx, 0.7 + 5.0, lz + (lz > 0 ? -0.4 : 0.4));
          bridgeGroup.add(fixture);
        });
      }
    } else {
      // ----------------------------------------------------
      // ESTUARY CAUSEWAY PRESTRESSED CONCRETE VIADUCT BRIDGE
      // ----------------------------------------------------
      // Heavy deep-water marine pier bents with protective dolphin fenders
      const numPiers = 4;
      const pierSpacing = length / (numPiers + 1);

      for (let p = 1; p <= numPiers; p++) {
        const px = -length / 2 + p * pierSpacing;

        // Pier Bent Cap (hammerhead beam)
        const capGeo = new THREE.BoxGeometry(3.2, 1.4, w + 1.2);
        const cap = new THREE.Mesh(capGeo, this.bridgeMat);
        cap.position.set(px, -1.4, 0);
        cap.castShadow = true;
        bridgeGroup.add(cap);

        // Dual cylindrical marine piles extending deep underwater
        [-w / 3, w / 3].forEach((pz) => {
          const pileGeo = new THREE.CylinderGeometry(1.4, 1.6, 9.0, 8);
          const pile = new THREE.Mesh(pileGeo, this.bridgeMat);
          pile.position.set(px, -5.9, pz);
          pile.castShadow = true;
          bridgeGroup.add(pile);
        });
      }

      // Longitudinal concrete support girders underneath the road slab
      [-w / 3, 0, w / 3].forEach((gz) => {
        const girderGeo = new THREE.BoxGeometry(length, 1.2, 0.8);
        const girder = new THREE.Mesh(girderGeo, this.bridgeMat);
        girder.position.set(0, -0.7 - 0.6, gz);
        bridgeGroup.add(girder);
      });

      // Marine fairway navigation lights centered under midspan
      const greenNav = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 6, 6),
        new THREE.MeshBasicMaterial({ color: 0x22c55e })
      );
      greenNav.position.set(0, -2.2, 0);
      bridgeGroup.add(greenNav);

      // Coastal barrier lighting
      for (let lx = -length * 0.4; lx <= length * 0.4; lx += 22) {
        [-w / 2 + 0.4, w / 2 - 0.4].forEach((lz) => {
          const pole = new THREE.Mesh(
            new THREE.CylinderGeometry(0.07, 0.1, 4.5, 4),
            steelMat
          );
          pole.position.set(lx, 0.7 + 2.25, lz);
          bridgeGroup.add(pole);

          const fixture = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.12, 0.35),
            lampGlowMat
          );
          fixture.position.set(lx, 0.7 + 4.5, lz);
          bridgeGroup.add(fixture);
        });
      }
    }

    this.group.add(bridgeGroup);
  }

  /**
   * Downtown Metropolis street grid with double avenues, cross streets, and traffic circuit
   */
  private buildDowntownGrid() {
    const yElevation = 2.53;
    const avenueWidth = 14;
    const streetWidth = 10;

    // North-South Multi-Lane Avenues spanning across CBD, commercial, and suburban districts
    const avenues = [
      { x: 540, z: 420, length: 640, w: avenueWidth }, // West Suburban Parkway
      { x: 640, z: 420, length: 640, w: avenueWidth }, // 1st Avenue Commercial
      { x: 740, z: 420, length: 640, w: avenueWidth }, // Central Apex Boulevard
      { x: 840, z: 420, length: 640, w: avenueWidth }, // 2nd Avenue Residential High
      { x: 940, z: 400, length: 580, w: streetWidth }, // East Coastal Suburban Avenue
    ];

    // East-West Cross Streets connecting avenues and neighborhoods
    const crossStreets = [
      { x: 740, z: 120, length: 420, w: streetWidth }, // North Residential Parkway
      { x: 740, z: 200, length: 440, w: streetWidth }, // Parkside Drive
      { x: 740, z: 280, length: 460, w: avenueWidth }, // Commercial Cross Street
      { x: 740, z: 360, length: 460, w: avenueWidth }, // Apex Plaza Boulevard
      { x: 740, z: 440, length: 440, w: streetWidth }, // Civic Center Avenue
      { x: 740, z: 520, length: 420, w: streetWidth }, // South Industrial Transition Street
      { x: 740, z: 600, length: 440, w: avenueWidth }, // South Metro Cross
      { x: 740, z: 680, length: 420, w: streetWidth }, // Ocean View Boulevard
    ];

    avenues.forEach((ave) => {
      const geo = new THREE.PlaneGeometry(ave.w, ave.length);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, this.roadMat);
      mesh.position.set(ave.x, yElevation, ave.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // Dashed centerline markings
      const dashGeo = new THREE.PlaneGeometry(0.3, ave.length * 0.95);
      dashGeo.rotateX(-Math.PI / 2);
      const dashMesh = new THREE.Mesh(dashGeo, this.whiteLineMat);
      dashMesh.position.set(ave.x, yElevation + 0.02, ave.z);
      this.group.add(dashMesh);
    });

    crossStreets.forEach((street) => {
      const geo = new THREE.PlaneGeometry(street.length, street.w);
      geo.rotateX(-Math.PI / 2);
      const mesh = new THREE.Mesh(geo, this.roadMat);
      mesh.position.set(street.x, yElevation, street.z);
      mesh.receiveShadow = true;
      this.group.add(mesh);

      // Dashed centerline markings
      const dashGeo = new THREE.PlaneGeometry(street.length * 0.95, 0.3);
      dashGeo.rotateX(-Math.PI / 2);
      const dashMesh = new THREE.Mesh(dashGeo, this.whiteLineMat);
      dashMesh.position.set(street.x, yElevation + 0.02, street.z);
      this.group.add(dashMesh);
    });

    const rawWaypoints = [
      // 1. Downtown City Grid
      new THREE.Vector3(640, 2.53, 240),
      new THREE.Vector3(780, 2.53, 240),
      new THREE.Vector3(780, 2.53, 400),
      new THREE.Vector3(640, 2.53, 400),
      // 2. City-to-Harbor Parkway
      new THREE.Vector3(580, 2.3, 540),
      new THREE.Vector3(460, 2.0, 680),
      new THREE.Vector3(380, 1.8, 780),
      new THREE.Vector3(260, 1.5, 860),
      new THREE.Vector3(60, 1.4, 880),
      // 3. Estuary Maritime Bridge & Southern Coastal Highway
      new THREE.Vector3(-40, 3.2, 860),
      new THREE.Vector3(-140, 3.2, 840),
      new THREE.Vector3(-260, 2.6, 800),
      new THREE.Vector3(-400, 2.4, 740),
      new THREE.Vector3(-580, 2.2, 660),
      new THREE.Vector3(-720, 2.0, 560), // Pelican Cove Overlook
      // 4. Southern Coastal Highway to West Bridge Abutment
      new THREE.Vector3(-540, 2.8, 480),
      new THREE.Vector3(-320, 4.5, 340),
      new THREE.Vector3(-180, 9.8, 140), // West Bridge Abutment
      // 5. Forest Scenic Loop (Forward continuous circuit)
      new THREE.Vector3(-300, 5.5, 70),
      new THREE.Vector3(-440, 4.8, 10),
      new THREE.Vector3(-580, 5.5, -40),
      new THREE.Vector3(-660, 6.0, 10),
      new THREE.Vector3(-620, 5.2, 110),
      new THREE.Vector3(-480, 4.5, 180),
      new THREE.Vector3(-320, 4.5, 340),
      new THREE.Vector3(-180, 9.8, 140), // West Bridge Abutment
      // 6. Grand Valley Suspension Bridge Crossing (High above river canyon)
      new THREE.Vector3(-140, 9.8, 160), // Mid-span above river
      new THREE.Vector3(-100, 9.8, 180), // East Bridge Abutment
      // 7. Bridge-to-Academy Approach & Perimeter Ring Road
      new THREE.Vector3(-75, 4.2, 120),
      new THREE.Vector3(-50, 1.2, 60),
      new THREE.Vector3(-50, 1.2, 0),
      new THREE.Vector3(-35, 1.2, -35),
      new THREE.Vector3(0, 1.2, -42),
      new THREE.Vector3(35, 1.2, -30),
      new THREE.Vector3(50, 1.2, 0),
      // 8. Academy-to-City Expressway
      new THREE.Vector3(180, 1.4, 60),
      new THREE.Vector3(360, 1.8, 160),
      new THREE.Vector3(540, 2.2, 240),
      new THREE.Vector3(640, 2.53, 240),
    ];
    
    // Create a smooth spline from these points so cars drive in buttery smooth arcs 
    // that match the actual road geometry rather than cutting sharp corners.
    const circuitCurve = new THREE.CatmullRomCurve3(rawWaypoints, true, "centripetal", 0.5);
    
    // Extract highly detailed points (300 points = ~10-15m apart)
    this.waypoints = circuitCurve.getPoints(300);
  }

  /**
   * Installs modern curved LED streetlights along city avenues
   */
  private buildStreetlights() {
    const poleMat = WorldMaterials.steel;
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0xfffaed,
      emissive: 0xffeedd,
      emissiveIntensity: 2.2,
    });

    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7.5, 8);
    const armGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.8, 6);
    armGeo.rotateZ(Math.PI / 3);
    const headGeo = new THREE.SphereGeometry(0.35, 8, 8);

    const lampPositions = [
      { x: 632, z: 240 },
      { x: 632, z: 320 },
      { x: 632, z: 400 },
      { x: 788, z: 240 },
      { x: 788, z: 320 },
      { x: 788, z: 400 },
      { x: 710, z: 232 },
      { x: 710, z: 408 },
    ];

    lampPositions.forEach((pos) => {
      const group = new THREE.Group();
      group.position.set(pos.x, 2.52, pos.z);

      const pole = new THREE.Mesh(poleGeo, poleMat);
      pole.position.y = 3.75;
      pole.castShadow = true;
      group.add(pole);

      const arm = new THREE.Mesh(armGeo, poleMat);
      arm.position.set(0.8, 7.0, 0);
      group.add(arm);

      const head = new THREE.Mesh(headGeo, lampMat);
      head.position.set(1.8, 7.8, 0);
      group.add(head);

      this.group.add(group);
    });
  }

  /**
   * Installs realistic galvanized steel W-beam guardrails and safety barriers along
   * mountain switchbacks, coastal highway bluffs, bridge approaches, and sharp curves
   */
  private buildRoadGuardrails() {
    const railMat = WorldMaterials.steel;
    const postMat = WorldMaterials.steel;

    const reflectorMat = new THREE.MeshBasicMaterial({
      color: 0xf59e0b, // Amber retroreflective delineator
    });

    interface GuardrailRun {
      name: string;
      roadWidth: number;
      side: "left" | "right" | "both";
      points: Array<{ x: number; z: number }>;
    }

    const runs: GuardrailRun[] = [
      // 1. Mountain Pass Switchbacks (Critical cliff safety along entire Apex ascent)
      {
        name: "Mountain Pass Outer Cliff",
        roadWidth: 7.5,
        side: "left",
        points: [
          { x: -80, z: -80 },
          { x: -160, z: -140 },
          { x: -180, z: -210 },
          { x: -200, z: -310 },
          { x: -260, z: -390 },
          { x: -400, z: -460 },
          { x: -500, z: -510 },
          { x: -580, z: -560 },
        ],
      },
      {
        name: "Mountain Pass High Ridge Dropoff",
        roadWidth: 7.5,
        side: "right",
        points: [
          { x: -220, z: -340 },
          { x: -260, z: -390 },
          { x: -400, z: -460 },
          { x: -500, z: -510 },
        ],
      },
      // 2. West Pelican Coastal Highway (Cliffs above cove & canyon)
      {
        name: "West Pelican Coastal Bluff",
        roadWidth: 8.0,
        side: "left",
        points: [
          { x: -180, z: 140 },
          { x: -320, z: 340 },
          { x: -540, z: 480 },
          { x: -720, z: 560 },
        ],
      },
      // 3. Southern Coastal Highway (Seaward bluff dropoff)
      {
        name: "Southern Coastal Sea Bluff",
        roadWidth: 10.0,
        side: "right",
        points: [
          { x: -720, z: 560 },
          { x: -580, z: 660 },
          { x: -400, z: 740 },
          { x: -260, z: 800 },
          { x: -140, z: 840 },
        ],
      },
      // 4. Grand Valley Suspension Bridge Approaches (Both sides leading into bridge abutments)
      {
        name: "Valley Bridge West Approach",
        roadWidth: 8.0,
        side: "both",
        points: [
          { x: -240, z: 105 },
          { x: -180, z: 140 },
        ],
      },
      {
        name: "Valley Bridge East Approach",
        roadWidth: 8.0,
        side: "both",
        points: [
          { x: -75, z: 120 },
          { x: -100, z: 180 },
        ],
      },
      // 5. Southern Estuary Maritime Bridge Approaches
      {
        name: "Estuary Bridge East Causeway Approach",
        roadWidth: 10.0,
        side: "both",
        points: [
          { x: -40, z: 860 },
          { x: 30, z: 875 },
        ],
      },
      // 6. Highway 1 Sharp Outer Curves
      {
        name: "Highway 1 Harbor Curve",
        roadWidth: 14.0,
        side: "left",
        points: [
          { x: 640, z: 380 },
          { x: 580, z: 540 },
          { x: 460, z: 680 },
          { x: 380, z: 780 },
        ],
      },
      // 7. Forest Timber Road Steep Ravine Edge
      {
        name: "Forest Timber Ravine",
        roadWidth: 8.0,
        side: "right",
        points: [
          { x: -180, z: 140 },
          { x: -300, z: 70 },
          { x: -440, z: 10 },
        ],
      },
      // 8. Academy Perimeter Road Outer Curve
      {
        name: "Academy Perimeter Outer Rail",
        roadWidth: 10.0,
        side: "left",
        points: [
          { x: -50, z: 60 },
          { x: -50, z: 0 },
          { x: -35, z: -35 },
          { x: 0, z: -42 },
          { x: 35, z: -30 },
          { x: 50, z: 0 },
        ],
      },
      // 9. Northern Foothills Parkway Curves
      {
        name: "Northern Parkway Scenic Rail",
        roadWidth: 9.0,
        side: "left",
        points: [
          { x: 120, z: -80 },
          { x: 260, z: -160 },
          { x: 440, z: -140 },
          { x: 580, z: -20 },
        ],
      },
    ];

    const guardrailGroup = new THREE.Group();
    const postGeo = new THREE.BoxGeometry(0.12, 0.85, 0.12);
    const reflectorGeo = new THREE.BoxGeometry(0.06, 0.12, 0.04);

    runs.forEach((run) => {
      const sidesToBuild: Array<"left" | "right"> =
        run.side === "both" ? ["left", "right"] : [run.side];

      sidesToBuild.forEach((side) => {
        const sideSign = side === "left" ? 1 : -1;
        const lateralOffset = run.roadWidth / 2 + 0.35;

        // Subdivide road points into 3.5m spaced post stations
        const stepSize = 3.5;
        const posts: THREE.Vector3[] = [];

        for (let seg = 0; seg < run.points.length - 1; seg++) {
          const p1 = run.points[seg];
          const p2 = run.points[seg + 1];
          const segDist = Math.hypot(p2.x - p1.x, p2.z - p1.z);
          const steps = Math.max(1, Math.round(segDist / stepSize));

          for (let s = 0; s < steps; s++) {
            const t = s / steps;
            const cx = p1.x + (p2.x - p1.x) * t;
            const cz = p1.z + (p2.z - p1.z) * t;

            // Direction tangent
            const dx = p2.x - p1.x;
            const dz = p2.z - p1.z;
            const len = Math.hypot(dx, dz) || 1;
            const perpX = (-dz / len) * sideSign;
            const perpZ = (dx / len) * sideSign;

            const postX = cx + perpX * lateralOffset;
            const postZ = cz + perpZ * lateralOffset;
            const terrainY = evaluateIslandElevation(postX, postZ).elevation;

            posts.push(new THREE.Vector3(postX, terrainY, postZ));
          }
        }

        // Add final endpoint post
        if (run.points.length > 1) {
          const last = run.points[run.points.length - 1];
          const prev = run.points[run.points.length - 2];
          const dx = last.x - prev.x;
          const dz = last.z - prev.z;
          const len = Math.hypot(dx, dz) || 1;
          const perpX = (-dz / len) * sideSign;
          const perpZ = (dx / len) * sideSign;
          const postX = last.x + perpX * lateralOffset;
          const postZ = last.z + perpZ * lateralOffset;
          const terrainY = evaluateIslandElevation(postX, postZ).elevation;
          posts.push(new THREE.Vector3(postX, terrainY, postZ));
        }

        // 1. Build posts and reflectors
        posts.forEach((p, idx) => {
          const postMesh = new THREE.Mesh(postGeo, postMat);
          postMesh.position.set(p.x, p.y + 0.42, p.z);
          postMesh.castShadow = true;
          guardrailGroup.add(postMesh);

          // Retroreflective delineator every ~10.5m (every 3rd post)
          if (idx % 3 === 0) {
            const refl = new THREE.Mesh(reflectorGeo, reflectorMat);
            refl.position.set(p.x, p.y + 0.72, p.z);
            guardrailGroup.add(refl);
          }
        });

        // 2. Build continuous W-beam steel rail connecting posts
        for (let i = 0; i < posts.length - 1; i++) {
          const pA = posts[i];
          const pB = posts[i + 1];
          const spanLen = pA.distanceTo(pB);
          if (spanLen < 0.1) continue;

          const beamGeo = new THREE.BoxGeometry(0.08, 0.32, spanLen);
          const beam = new THREE.Mesh(beamGeo, railMat);

          const mid = new THREE.Vector3().addVectors(pA, pB).multiplyScalar(0.5);
          beam.position.set(mid.x, mid.y + 0.55, mid.z);

          // Orient beam along span
          const angle = Math.atan2(pB.x - pA.x, pB.z - pA.z);
          beam.rotation.y = angle;

          // Slope pitch along slope
          const dy = pB.y - pA.y;
          const pitch = Math.atan2(dy, Math.hypot(pB.x - pA.x, pB.z - pA.z));
          beam.rotation.x = -pitch;

          beam.castShadow = true;
          beam.receiveShadow = true;
          guardrailGroup.add(beam);
        }
      });
    });

    this.group.add(guardrailGroup);
  }
}






