# DRONE PILOT — World Architecture Specification (Phase 1)

This document specifies the world architecture, spatial standards, coordinate datums, mathematical terrain formulation, landmark registries, and tactical cartography established in **Phase 1: World Art Direction + World Map Rebuild**.

---

## 1. World Scale & Canonical Coordinate System

The world is measured exclusively in SI meters ($m$), referenced to Mean Sea Level (MSL = $0.0\text{m}$).

| Parameter | Dimension | Notes |
| :--- | :--- | :--- |
| **Ocean Expanse** | $4800\text{m} \times 4800\text{m}$ | Continuous procedural oceanic plane with multi-octave wave shaders |
| **Island Landmass** | $\approx 2400\text{m} \times 2200\text{m}$ | Organic irregular landmass silhouette |
| **Sea Level Datum** | $0.0\text{m}$ MSL | Reference baseline for all flight physics and bathymetry |
| **Highest Elevation** | $145.0\text{m}$ MSL | Mount Apex Summit Peak |
| **Lake Water Level** | $8.5\text{m}$ MSL | Crystal Mountain Lake reservoir basin |
| **Deep Ocean Floor** | $-16.0\text{m}$ MSL | Offshore submerged continental shelf |
| **World Origin $(0, 0, 0)$** | Central Training Academy | Helipad Alpha center point |
| **Axis Standard** | Right-handed standard | $+X$ = East, $-X$ = West, $+Y$ = Altitude (MSL), $+Z$ = South, $-Z$ = North |

---

## 2. Irregular Island Silhouette & Coastline Math

The island silhouette is mathematically formulated in `src/lib/world/coastline-math.ts` to replace repetitive circular shapes with realistic geographic landforms:

$$R(\theta) = R_{\text{base}} \cdot \left(1.0 + \sum_{k} h_k(\theta)\right)$$

Where $R_{\text{base}} = 1120\text{m}$ and harmonic components shape distinct coastal features:
- **Northwest Promontory** ($\theta \approx -2.0\text{ rad}$): Craggy granite headland jutting out into deep water.
- **Western Granite Bluffs** ($\theta \approx \pm \pi\text{ rad}$): Sheer vertical sea cliffs rising abruptly $18\text{m} - 24\text{m}$ above crashing surf.
- **Southwest Pelican Cove** ($\theta \approx 2.4\text{ rad}$): Sweeping crescent-shaped sandy bay with shallow turquoise reef shelf.
- **River Delta Estuary** ($\theta \approx 1.8\text{ rad}$): South-facing coastal indentation where the valley river discharges into the sea.
- **Southeast Harbor Peninsula** ($\theta \approx 1.0\text{ rad}$): Deepwater shipping basin and protective maritime promontory.
- **Northeast Emerald Bay** ($\theta \approx -0.7\text{ rad}$): Sheltered northern maritime cove.

---

## 3. Master World Layout & Biome Distribution

The island follows a natural drainage and geological progression:

```
                     NORTH / NORTHWEST
                  [Mount Apex Massif]
                    (Peaks up to 145m)
                           │
                           ▼ (Runoff Drainage)
                 [Crystal Mountain Lake] (8.5m)
                           │
                           ▼ (Cascade Falls)
  WEST                     ▼                     EAST
[Whispering Pines]  [Valley River & Canyon]  [Downtown Metropolis]
(Woodland Reserve)         │                 (Skyscrapers & Skyport)
                           │
                      [Central Academy] (Runway 09/27)
                           │
                           ▼
                 [River Estuary Delta]
                           │
       SOUTHWEST           ▼           SOUTHEAST
    [Pelican Cove] ──► [Ocean] ◄── [Harbor Industrial]
  (Cliffs & Beaches)               (Cargo Docks & Silos)
```

### Region Specifications

| Region ID | Name | Sector | Center $(X, Y, Z)$ | Elevation Range | Key Landmarks |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `mountain` | Mount Apex Massif | North / NW | $(-650, 48.0, -650)$ | $14.0\text{m} - 145.0\text{m}$ | Apex Summit ($145\text{m}$), Weather Station terrace ($48\text{m}$), Ridge Crags |
| `forest` | Whispering Pines | West | $(-640, 5.5, 20)$ | $2.5\text{m} - 18.0\text{m}$ | Ranger Cabin, $18\text{m}$ Fire Lookout Tower, Forest Clearings |
| `training` | Central Flight Academy | Center | $(0, 1.2, 0)$ | $1.2\text{m} - 2.8\text{m}$ | Runway 09/27 ($260\text{m} \times 32\text{m}$), Apron Helipads Alpha & Bravo |
| `river` | Valley River & Canyon | Inland Center | $(-160, 3.5, 160)$ | $0.2\text{m} - 8.5\text{m}$ | Crystal Lake ($8.5\text{m}$), Cascade Falls, Valley Stone Arch Bridge ($4.8\text{m}$) |
| `city` | Downtown Metropolis | East / SE | $(720, 2.5, 320)$ | $2.5\text{m} - 68.0\text{m}$ | Vertiport Plaza ($2.5\text{m}$), Apex Tower Rooftop Skyport ($68\text{m}$) |
| `industrial` | Harbor Industrial Park | South / SE | $(380, 1.8, 780)$ | $1.2\text{m} - 14.0\text{m}$ | Cargo Terminal Pad, Hangars, Bulk Fuel Silos, Shipping Docks |
| `coast` | Pelican Cove & Bluffs | South / SW | $(-720, 2.0, 560)$ | $0.3\text{m} - 22.0\text{m}$ | Marine Rescue Pad, Boardwalk Pier, Sentinel Sea Stack ($22\text{m}$) |
| `water` | Archipelago Waters | Outer Perimeter| $(0, 0, 0)$ | $-16.0\text{m} - 0.0\text{m}$ | Shallow Turquoise Shelf ($45\text{m}$ wide), Deep Ocean Floor ($-16\text{m}$) |

---

### 4. Multi-Octave Coherent Terrain Architecture & Biome Splatting

Terrain elevation is computed deterministically at arbitrary coordinates $(x, z)$ via `evaluateIslandElevation(x, z)` in `src/lib/world/terrain-math.ts`. It synthesizes:
1. **Multi-Tier Elevation Hierarchy**:
   - **Alpine Massif ($60\text{m} - 145\text{m}$)**: Apex Summit ($145\text{m}$), North Crest ($118\text{m}$), and West Sentinel ($102\text{m}$) connected by knife-edge ridges, cirques, scree chutes, and high-altitude saddles.
   - **Foothill Amphitheater ($20\text{m} - 55\text{m}$)**: Expansive geological transition zone wrapping around the southeastern flank of Mount Apex toward the valley.
   - **River Valley & Canyon ($2\text{m} - 14\text{m}$)**: Carved drainage corridor descending from Cascade Falls to the southern estuary delta, bordered by stone-faced canyon walls.
   - **Rolling Woodland Highlands ($10\text{m} - 28\text{m}$)**: Whispering Pines Forest ridges sloping into the western granite bluffs.
   - **Northeast Emerald Hills ($15\text{m} - 38\text{m}$)**: Scenic coastal headlands forming Emerald Bay.
   - **Lowland Plains & Coastal Shelves ($0.5\text{m} - 6\text{m}$)**: Central Flight Academy plateau ($1.2\text{m}$), Metropolis urban base ($2.5\text{m}$), and Harbor Industrial apron ($1.8\text{m}$).
2. **Continuous Biome Color Splatting**:
   - High summit snow / frost scree ($> 110\text{m}$)
   - Weathered granite cliffs on steep inclines ($\text{slope} > 0.38$)
   - Highland olive alpine meadow ($25\text{m} - 70\text{m}$)
   - Lowland vibrant meadow grass ($0\text{m} - 25\text{m}$)
   - Forest loam & deep pine needles in Whispering Pines
   - Golden dune sand on coastal beaches ($\text{distToCoast} < 45\text{m}$)
   - Dark river silt & lake sediment in carved waterbeds
3. **Freshwater System Integration**:
   - Crystal Mountain Lake sitting in an organic excavation bowl ($8.5\text{m}$ MSL) with a stone/gravel embankment collar.
   - Continuous meandering river channel with stone river banks expanding from $24\text{m}$ to $60\text{m}$ at the southern estuary.
   - Cascade Falls with procedural white-water churning animation and mist particles.
4. **Atmosphere & Lighting**:
   - Natural linear aerial perspective fog (`THREE.Fog(0xcfe7f8, 480, 3600)`), preserving long-distance horizon visibility of peaks, skylines, and coasts.
   - High-resolution directional sunlight with PCFSoft shadows highlighting terrain relief and building massing.

---

## 5. Master Road Network

The master road network is canonically defined in `WORLD_DEFINITION.roads`:
- **Primary Highway (`hwy-primary-metro`)**: $14\text{m}$ wide arterial linking Downtown Metropolis south to Harbor Industrial Park and the maritime piers.
- **Expressway Connector (`road-academy-city`)**: $11\text{m}$ wide arterial connecting Central Flight Academy east to Metropolis.
- **Forest Timber Road (`road-academy-forest`)**: $8\text{m}$ wide rural access road into the Western woodland reserve.
- **Pelican Cove Coastal Spur (`road-pelican-connect`)**: $8\text{m}$ wide scenic coastal spur to Sentinel Bluffs and Pelican Cove.
- **Mount Apex Switchback Pass (`road-mountain-switchback`)**: $7.5\text{m}$ wide alpine mountain road climbing to the Weather Station Helipad ($48\text{m}$).
- **Grand Valley Stone Arch Bridge (`bridge-valley`)**: Historic arched highway span crossing the river canyon.

---

## 6. Single Source of Truth & Synchronization

`WORLD_DEFINITION` drives:
- 3D Terrain mesh, ocean, and freshwater ribbons
- Tactical Reconnaissance Map (`world-map-selector.tsx`)
- Fullscreen Tactical Recon Map Modal (`island-map-modal.tsx`)
- In-Flight HUD Minimap (`minimap-widget.tsx`)
- Ground elevation queries (`getGroundElevation(x, z)`) in `world-root.ts`
- Flight spawn locations and helipad landing platforms

---

## 7. Performance Strategy

- **Deterministic Procedural Generation**: Elevation and biomes are calculated using pure math functions without storing megabytes of heightmaps in memory.
- **Instanced Geometry**: Trees, rocks, light fixtures, grass tufts, and bollards use `THREE.InstancedMesh`.
- **Frustum Culling**: Default on all static world geometry.
- **Shared Geometries & Materials**: Reusable materials for roads, water, and structures prevent GPU state thrashing.

---

## 8. Canonical Helipad & Spawn Registry

All pilot spawns pass through `SpawnSystem.resolveSpawn()`, guaranteeing that landing skids touch down at exact pad altitudes:

| Helipad ID | Name | Region | Position $(X, Y, Z)$ | Surface | Heading |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `training-alpha` | Helipad Alpha (Academy Main) | `training` | $(0, 1.2, 0)$ | Concrete | $0^\circ$ (N) |
| `training-bravo` | Helipad Bravo (Practice Pad) | `training` | $(45, 1.2, 20)$ | Concrete | $90^\circ$ (E) |
| `forest-alpha` | Forest Ranger Station Pad | `forest` | $(-620, 5.5, -40)$ | Timber | $45^\circ$ (NE) |
| `mountain-alpha` | Mount Apex Weather Station Pad | `mountain` | $(-580, 48.0, -560)$ | Steel Grate | $180^\circ$ (S) |
| `river-alpha` | Valley Bridge Observation Pad | `river` | $(-160, 3.5, 160)$ | Concrete | $120^\circ$ (SE) |
| `city-alpha` | Downtown Heliport Plaza | `city` | $(640, 2.5, 320)$ | Concrete | $0^\circ$ (N) |
| `city-apex-rooftop`| Apex Center Rooftop Skyport | `city` | $(760, 68.0, 360)$ | Rooftop Pad | $270^\circ$ (W) |
| `industrial-alpha`| Harbor Cargo Terminal Pad | `industrial` | $(360, 1.8, 760)$ | Concrete | $90^\circ$ (E) |
| `coast-alpha` | Pelican Cove Marine Station Pad | `coast` | $(-720, 2.0, 560)$ | Timber | $315^\circ$ (NW) |

---

## 7. Unified Tactical Map Architecture

To ensure zero divergence between the 3D world and 2D tactical maps:
$$\text{WORLD\_DEFINITION} \longrightarrow \text{3D World (Three.js)} \quad \& \quad \text{Tactical Maps (SVG)}$$

The `getTacticalMapData()` pipeline in `src/lib/world/map-data.ts` produces identical vector projections used simultaneously across:
1. **Pre-flight Map Selector** (`world-map-selector.tsx`): Interactive sector selection, helipad targeting, elevation callouts, distance scale.
2. **HUD Minimap Radar** (`minimap-widget.tsx`): Real-time rotating/scrolling radar with heading cone, target waypoint arrow, and runway beacons.
3. **In-Flight Reconnaissance Map** (`island-map-modal.tsx`): Full-screen military/aviation topographical map (`M` key) with live flight trail, elevation contours, waypoint vector line, and flight telemetry.

---

## 8. Performance Strategy & Future Population Roadmap

### Performance Foundation Established
- **Single Mesh Heightfield**: $3000\text{m} \times 3000\text{m}$ terrain with 58,081 vertices using shared vertex normal buffers and vertex-color biome splatting (eliminates multiple costly multi-texture draw passes).
- **Instanced Geometry Ready**: Instanced runway lights, threshold markers, streetlights, and marine piers.
- **Fast Deterministic Elevation Queries**: Real-time analytical terrain queries executed without heavy GPU readbacks.

### Phase 2 Natural Environment & World Scenery (Completed)
- Multi-species botanical ecosystem: Scots Pine, Norway Spruce, English Oak, Mountain Birch, Coastal Palm, River Willow, and Deadwood Snags.
- Multi-layer understory: Dogwood shrubs, prostrate alpine junipers, sword fern beds, and freshwater reeds.
- Geological systems: Monolithic granite boulders, alpine talus scree chutes, riverbed cobblestone beds, and coastal sea stacks.
- Authored environmental storytelling vignettes with fallen logs, weathered stumps, beach driftwood, and rustic trail fences.

---

## 9. Phase 2: Natural Environment Architecture

### 1. Environment Asset Registry (`environment-asset-registry.ts`)
The central registry defines metadata, LOD parameters, and placement rules across 12 asset categories:
`TREE`, `SHRUB`, `GRASS`, `FLOWER`, `ROCK`, `BOULDER`, `LOG`, `STUMP`, `FERN`, `GROUND_PROP`, `COAST_PROP`, and `RIVER_PROP`.

Each asset definition incorporates:
- **Biomes**: Ecological affinities (`FOREST_CORE`, `FOREST_EDGE`, `MOUNTAIN_LOWER`, `MOUNTAIN_MID`, `ALPINE_SUMMIT`, `RIVER_BANK`, `LAKE_SHORE`, `PELICAN_BEACH`, `ROCKY_COAST`, `LOWLAND_MEADOW`, `RURAL_PASTURE`).
- **Physical Dimensions & Scale Jitter**: Real-world height, crown radius, and min/max scale multipliers.
- **Ecological Constraints**: Elevation range MSL, maximum ground slope inclination, and distance buffers to roads, runways, and water.
- **Clustering Affinities**: Defines companion objects for natural authored compositions (e.g. giant boulder + satellite scree + dogwood shrubs + fallen mossy log + sword ferns).

### 2. Deterministic Biome & Placement Engine (`biome-system.ts`)
- **Seeded PRNG**: Implements a 32-bit `Mulberry32` generator initialized with canonical `WORLD_SEED = 421337`. Guarantees identical, repeatable procedural natural scenery across reloads, flight recordings, and multiplayer network synchronization.
- **Multi-Factor Biome Classifier (`getBiomeAt`)**:
  - Analytical elevation query $Y(x, z)$
  - Gradient slope magnitude $|\nabla h(x, z)|$ computed via central differences
  - Proximity to freshwater hydrology (Crystal Mountain Lake, Cascade Falls, Valley River corridor)
  - Proximity to oceanic coastline and Pelican Cove
  - Regional geographic sectors
- **Soft Clearance Engine (`isProtectedZone` & `getDistanceToRoad`)**:
  - Runway 09/27 & taxiways: strict 35m protection buffer
  - All 8 registered Helipads: 40m - 75m clearance envelope
  - Road network: graduated clearance where trees keep 6m - 8m distance, while low-lying understory shrubs and split-rail fences transition naturally along roadsides
  - Downtown Metropolis and Harbor Industrial parks: fully excluded from wild forest generation

### 3. Procedural Botanical & Geological Geometry Library (`environment-models.ts`)
- **Multi-Tier Conifers**: 26m Scots Pines with high umbrella canopies and 28.5m Norway Spruces with 7 downward scalloped bough tiers.
- **Broadleaf Deciduous**: 22m English Oaks with 4 spreading limb branches and organic faceted leaf clumps; 16.5m Mountain Birches with slender pale bark.
- **Specialized Species**: 14m Coastal Palms with 12 radiating fan fronds; 18m Riparian Willows with cascading weeping foliage; 15m Deadwood Snags with jagged lightning-struck limbs.
- **Geological Formations**: Multi-faceted glacial granite boulders (4.8m), angular alpine scree fragments (1.8m), smooth river cobblestones (0.6m), and coastal sea stacks (6.5m).
- **Forest Debris & Storytelling**: Fallen mossy timber logs (6.0m), weathered cut stumps (1.4m), sun-bleached beach driftwood, timber mooring posts, and split-rail trail fences.

### 4. GPU Instancing & Performance Strategy
- **100% Batched InstancedMesh**: Tens of thousands of individual vegetation, rock, and debris elements rendered in single GPU instanced draw calls per material tier.
- **Spatial Bounding & Frustum Culling**: Three.js instanced bounding spheres enable efficient hardware frustum culling.
- **Consistent 60 FPS in WebGL**: Zero per-frame geometry allocations or complex GC overhead.

