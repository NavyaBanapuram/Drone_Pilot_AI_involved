import * as THREE from "three";

// ==========================================================
// DRONE PILOT — UNIFIED WORLD MATERIALS (PHASE 4)
// Centralized PBR material strategy for a cohesive
// "Premium Stylized Technical Simulation" aesthetic.
// ==========================================================

export const WorldMaterials = {
  // --------------------------------------------------------
  // URBAN & INFRASTRUCTURE
  // --------------------------------------------------------
  asphalt: new THREE.MeshStandardMaterial({
    color: 0x151618, // Very dark, fresh asphalt
    roughness: 0.92,
    metalness: 0.05,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  }),
  
  concrete: new THREE.MeshStandardMaterial({
    color: 0x78818f,
    roughness: 0.75,
    metalness: 0.15,
  }),

  steel: new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.50,
    metalness: 0.75,
  }),

  paintedMetal: new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.40,
    metalness: 0.60,
  }),

  glass: new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.05,
    metalness: 0.95,
    transparent: true,
    opacity: 0.75,
  }),

  markingYellow: new THREE.MeshStandardMaterial({
    color: 0xfacc15,
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  }),

  markingWhite: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.5,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  }),

  // --------------------------------------------------------
  // NATURAL ENVIRONMENT
  // --------------------------------------------------------
  wood: new THREE.MeshStandardMaterial({
    color: 0x5c4033,
    roughness: 0.90,
    metalness: 0.0,
  }),

  rock: new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.95,
    metalness: 0.02,
    flatShading: true,
  }),

  sand: new THREE.MeshStandardMaterial({
    color: 0xd4b996,
    roughness: 0.95,
    metalness: 0.0,
  }),

  mud: new THREE.MeshStandardMaterial({
    color: 0x3b3024,
    roughness: 0.85,
    metalness: 0.0,
  }),
  
  // --------------------------------------------------------
  // WATER & HYDROLOGY
  // --------------------------------------------------------
  waterOcean: new THREE.MeshStandardMaterial({
    color: 0x0369a1,
    roughness: 0.10,
    metalness: 0.85,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  }),

  waterFresh: new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.15,
    metalness: 0.80,
    transparent: true,
    opacity: 0.85,
    depthWrite: false,
  }),

  foam: new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.80,
    transparent: true,
    opacity: 0.60,
  })
};

// Extracted procedural facade colors for buildings
export const FACADE_COLORS = [
  0x1e293b, 0x334155, 0x475569, 0x64748b, // Slate tones
  0x78350f, 0x92400e, // Warm tones
  0xfef3c7, 0xe7e5e4, 0xd6d3d1, // Light stones
  0x0f172a, 0x1e3a5f, 0x44403c, // Corporate darks
] as const;

export const GLASS_COLORS = [
  0x38bdf8, 0x60a5fa, 0x22d3ee, 0x0ea5e9, 0x6366f1, 0x94a3b8
] as const;
