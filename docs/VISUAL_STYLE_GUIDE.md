# DRONE PILOT — Visual Style Guide & World Rendering Standard

This document defines the art direction, rendering pipeline, material standards, and architectural conventions governing the 3D world in **DRONE PILOT**.

---

## 1. Visual Target & Art Direction

DRONE PILOT targets a **Polished Stylized 3D Aesthetic**:
* **Atmospheric Depth**: Cohesive sky gradient, atmospheric aerial perspective, and clear depth cues over a 3km island landmass.
* **Rich Materials**: Multi-texture PBR terrain splatting, dynamic water surface displacement, Fresnel rim highlights, and soft contact shadows.
* **Environmental Believability**: Natural transitions between biomes, defined tree silhouettes, layered forest understory, realistic road corridors with curbs, sidewalks, and street furniture.
* **Strict Asset Compliance**: 100% CC0 (Kenney, Poly Haven) or custom procedural generators. Absolutely zero ripped or unverified assets.

---

## 2. Lighting & Atmosphere Architecture

The atmospheric setup is managed in `src/components/simulator/world/world-environment.ts`:

### 2.1 Sky Dome
* **Geometry**: Inverted sphere (`radius = 2800m`, `depthWrite = false`, `BackSide`).
* **Shader**: Procedural three-stop vertical gradient:
  * **Zenith**: `#1d64c2` (Rich oceanic deep blue)
  * **Horizon**: `#cbe6fa` (Bright atmospheric haze)
  * **Ground / Nadir**: `#b0cbe3` (Harmonious ground-bounce tint)

### 2.2 Directional Sun & Follow-Shadow
* **Light Color**: `#fffdf4` (Crisp sunlight), intensity `2.4`.
* **Dynamic Shadow Camera**: The shadow camera frustum follows the drone dynamically (`±260m` bounds, resolution `2048x2048`). Both sun position and sun target track `dronePos` every frame, ensuring sharp soft shadows wherever the drone flies across the 3km island.
* **Shadow Map Type**: `THREE.PCFSoftShadowMap` with `normalBias = 0.04` and `bias = -0.0001` to eliminate shadow acne and surface self-shadow artifacts.
* **Ambient Balance**: Ambient light intensity `0.42` (`#b8d5ff`), paired with Hemisphere light `0.58` (sky `#dbeafe`, ground `#475569`), preserving high-contrast shadow definitions without pitch-black crevices.

### 2.3 Atmospheric Fog
* **Type**: Linear fog (`#c8e0f4`).
* **Range**: Near `400m`, Far `4800m`. Hides world perimeter clipping while maintaining clear visibility across the island's central valleys.

---

## 3. Terrain Multi-Material Splatting

Implemented in `src/components/simulator/world/terrain/terrain-system.ts` and `terrain-textures.ts`:

### 3.1 Five-Texture Blend Shader
The island heightfield uses custom GLSL injected via `onBeforeCompile`:
1. **Meadow Grass**: High-frequency lush green texture with blade noise.
2. **Forest Floor Loam**: Dark organic earth with pine needles and moss patches.
3. **Cliff Rock**: Layered granite stratifications with normal micro-relief; blended triplanarly on slopes (`normal.y < 0.72`).
4. **Alpine Scree**: Fractured slate and talus gravel for altitudes `> 68m`.
5. **Wet Coastal Sand**: Dark saturated beach sand at water margins (`height < 3.2m`).

### 3.2 Slope & Biome Splatting Logic
* **Cliff Detection**: `rockWeight = smoothstep(0.72, 0.45, vWorldNormal.y)`.
* **Elevation Splatting**: `screeWeight = smoothstep(68.0, 115.0, vWorldPosition.y)`.
* **Shoreline Bleed**: `sandWeight = smoothstep(3.2, 0.4, vWorldPosition.y)`.
* **Biome Modulation**: Interpolated with vertex color channels generated from elevation and hydrology maps.

---

## 4. Hydrology & Water Systems

Managed in `src/components/simulator/world/water/`:

### 4.1 Ocean Expanse (`ocean-mesh.ts`)
* **Dimensions**: $4000\text{m} \times 4000\text{m}$ plane at sea level ($y = 0$).
* **Wave Displacement**: 3-component Gerstner-like wave equation running in the update loop, dampened within 55m of the shoreline to eliminate land clipping.
* **Specular & Ripples**: Dual-harmonic animated normal map (`48x48` tiling) with dynamic UV drift (`offset += dt * speed`).
* **Water Fresnel**: Custom fragment shader injection adding sky-tinted rim reflections at grazing angles.

### 4.2 Coastal Shallow Shelf & Surf Foam
* **Turquoise Reef Shelf**: Ring geometry extending 55m seaward from the coastline at $y = 0.08\text{m}$, creating tropical shallow water gradients.
* **Animated Surf Ribbon**: Quad strip along the beach waterline pulsing with procedural foam texture (`offset.x` animation + opacity oscillation).

### 4.3 Alpine Lake & River Corridor (`freshwater-mesh.ts`)
* **Crystal Lake**: Multi-harmonic perimeter curve with granite gravel embankment collar.
* **River Corridor**: 128-segment organic spline dropping from $8.5\text{m}$ to sea level ($0.18\text{m}$), with procedural rapid streaks animating downstream (`offset.y = -elapsed * 0.45`).

### 4.4 Cascading Waterfall Landmark (`water-system.ts`)
* **Cascade**: Upper intake stream chute, primary $13\text{m}$ drop curtain, and secondary lower churning white-water plane.
* **Plunge Pool & Mist**: Turquoise plunge basin, surrounding boulders, and 350-particle animated rising mist system.

---

## 5. City & Architecture Standards

Managed in `src/components/simulator/world/city/`:

### 5.1 Asset Hierarchy
* **Primary Models**: High-detail Kenney CC0 models loaded asynchronously from `public/models/commercial/` and `public/models/industrial/`.
* **Procedural Fallback**: Procedural geometric facades (glass curtain walls, HVAC units, aviation beacons) constructed synchronously so zero empty spaces appear during asset load.
* **Asset Path Rule**: All paths use canonical `/models/<category>/<file>.glb` format.

### 5.2 District Zoning
* **CBD (Central Business District)**: High-rise skyscrapers ($50\text{m} - 95\text{m}$), reflective glass curtain walls, rooftop helipads, and red aviation warning lights.
* **Commercial Core**: Mid-rise perimeter blocks ($20\text{m} - 40\text{m}$) with retail storefronts, awnings, and parking bays.
* **Industrial Transition**: Warehouses, storage tanks, smokestacks, and distribution hubs bordering the harbor.
* **Civic & Residential**: Low-density housing, municipal offices, parks, and hospital emergency zones.

### 5.3 Street Infrastructure & Living Traffic
* **Roads**: Multi-lane asphalt with white lane markings, yellow medians, concrete curbs, and $8.5\text{m}$ vegetation-free corridors.
* **Street Furniture**: Kenney streetlights, double lights, traffic signals, warning signs, and dumpsters spaced along road edges.
* **Autonomous Traffic**: 22 GLB vehicles (sedans, SUVs, police cruisers, taxis, ambulances, trucks) navigating road waypoints with rotating wheels.

---

## 6. Nature & Vegetation Standards

Managed in `src/components/simulator/world/nature-system.ts` and `environment-models.ts`:

### 6.1 Multi-Species Canopy
* **Scots Pine**: $26\text{m}$ twisted conifer with multi-tier foliage clumps.
* **Norway Spruce**: $28.5\text{m}$ tiered spire conifer with 7 downward drooping boughs.
* **English Oak**: $22\text{m}$ broadleaf canopy with faceted foliage clusters.
* **Mountain Birch**: $16.5\text{m}$ slender silvery trunk with delicate crown.
* **Coastal Palm**: $14\text{m}$ curved trunk with 12 radiating fan fronds.
* **Weeping Willow**: $18\text{m}$ trailing riparian boughs near water edges.

### 6.2 Forest Understory & Debris
* **Understory**: Clustered ferns, wild flowering bushes, and river reeds.
* **Forest Floor Debris**: Mossy fallen logs, tree stumps, scree rock piles, and beach driftwood.
* **Wind Sway Shader**: Foliage materials inject a vertex shader displacement driven by `uWindTime`, providing organic swaying crowns.

---

## 7. Performance & Optimization Guidelines

1. **Instanced Rendering**: All vegetation, rocks, debris, and street furniture use `THREE.InstancedMesh` where possible to minimize draw calls.
2. **Texture Reuse**: Procedural textures (terrains, water, roads) are generated on canvas singletons and cached in `TerrainTextures`.
3. **Shadow Frustum Budgeting**: Dynamic follow-shadow maintains a tight bounding box (`±260m`) rather than covering the whole $3\text{km}$ world, achieving sharp 2048x2048 shadows at 60 FPS.
4. **Collision Filtering**: High-poly foliage models use simplified bounding cylinders or box colliders for drone physics detection.
