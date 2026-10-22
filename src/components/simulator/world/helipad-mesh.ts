// ==========================================================
// DRONE PILOT — 3D HELIPAD MESH GENERATOR (PUBG-GRADE)
// Realistic concrete/steel landing slab with high-contrast PBR target texture & perimeter LEDs
// ==========================================================

import * as THREE from "three";
import { Helipad } from "@/lib/world/world-types";
import { TerrainTextures } from "./terrain/terrain-textures";
import { WorldMaterials } from "./world-materials";

export function createHelipadMesh(helipad: Helipad): THREE.Group {
  const group = new THREE.Group();
  group.name = `helipad-${helipad.id}`;
  group.position.set(helipad.position.x, helipad.position.y, helipad.position.z);
  group.rotation.y = (helipad.headingDeg * Math.PI) / 180;

  const radius =
    helipad.dimensions.radius ||
    Math.max(helipad.dimensions.width, helipad.dimensions.length) / 2 ||
    7;
  const slabThickness = 0.3;

  // 1. Select foundation material based on surfaceType
  let baseMat: THREE.Material;
  switch (helipad.surfaceType) {
    case "steel":
      baseMat = WorldMaterials.steel;
      break;
    case "wood":
      baseMat = WorldMaterials.wood;
      break;
    case "rooftop":
      baseMat = WorldMaterials.concrete;
      break;
    case "concrete":
    default:
      baseMat = WorldMaterials.concrete;
      break;
  }

  // 2. Foundation slab cylinder (top of slab at y = 0)
  const slabGeom = new THREE.CylinderGeometry(radius, radius * 1.02, slabThickness, 36);
  const slabMesh = new THREE.Mesh(slabGeom, baseMat);
  slabMesh.position.y = -slabThickness / 2;
  slabMesh.receiveShadow = true;
  slabMesh.castShadow = true;
  group.add(slabMesh);

  // 3. Top landing target surface with high-contrast Helipad texture
  let targetMat: THREE.Material;
  if (typeof document !== "undefined") {
    const tex = TerrainTextures.getHelipadTexture();
    targetMat = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 0.8,
      metalness: 0.1,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });
  } else {
    targetMat = new THREE.MeshStandardMaterial({
      color: 0x22262a,
      roughness: 0.8,
      metalness: 0.1,
    });
  }

  const targetGeom = new THREE.CircleGeometry(radius * 0.98, 36);
  const targetMesh = new THREE.Mesh(targetGeom, targetMat);
  targetMesh.rotation.x = -Math.PI / 2;
  targetMesh.position.y = 0.005; // Slightly above slab to prevent z-fighting
  targetMesh.receiveShadow = true;
  group.add(targetMesh);

  // 4. Perimeter LED warning/alignment fixtures
  const lightCount = 8;
  const fixtureRadius = radius * 0.96;
  const postGeom = new THREE.CylinderGeometry(0.06, 0.08, 0.15, 8);
  const postMat = WorldMaterials.steel;
  const ledGeom = new THREE.SphereGeometry(0.08, 8, 8);
  const ledMat = new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    emissive: new THREE.Color(0xfacc15),
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  for (let i = 0; i < lightCount; i++) {
    const angle = (i / lightCount) * Math.PI * 2;
    const lx = Math.cos(angle) * fixtureRadius;
    const lz = Math.sin(angle) * fixtureRadius;

    const postMesh = new THREE.Mesh(postGeom, postMat);
    postMesh.position.set(lx, 0.075, lz);
    group.add(postMesh);

    const ledMesh = new THREE.Mesh(ledGeom, ledMat);
    ledMesh.position.set(lx, 0.18, lz);
    group.add(ledMesh);
  }

  return group;
}


