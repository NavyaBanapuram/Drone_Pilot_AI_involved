# DRONE PILOT — Asset & Material Licensing Declaration

This document records the licensing, provenance, and legal clearance for all 3D assets, textures, materials, and procedural generators used in **DRONE PILOT**.

---

## 1. World & Terrain Assets (Phase 1)

### Procedural Terrain Heightfield & Biome Splatting
* **Files**:
  * `src/lib/world/terrain-math.ts`
  * `src/lib/world/coastline-math.ts`
  * `src/lib/world/world-definition.ts`
  * `src/components/simulator/world/terrain/terrain-system.ts`
* **Source**: Custom procedural mathematical formulations developed for DRONE PILOT.
* **License**: MIT License (project repository).
* **Usage**: $2.4\text{km} \times 2.2\text{km}$ irregular island landmass, multi-peak Mount Apex Massif ($145\text{m}$), foothill lake basin ($8.5\text{m}$), carved valley canyon gorge, and PBR vertex color biome splatting.

### Ocean & Freshwater Hydrology Meshes
* **Files**:
  * `src/components/simulator/world/water/ocean-mesh.ts`
  * `src/components/simulator/world/water/freshwater-mesh.ts`
  * `src/components/simulator/world/water/water-system.ts`
* **Source**: Custom procedural Three.js water geometries with dynamic sine/cosine wave displacement.
* **License**: MIT License.
* **Usage**: $4800\text{m} \times 4800\text{m}$ ocean plane, turquoise shallow reef shelf, Crystal Mountain Lake ($110\text{m}$ radius), cascading waterfall ($8.5\text{m} \to 3.2\text{m}$), and descending river canyon surface.

### Master Road Network & Bridges
* **Files**:
  * `src/components/simulator/world/road-network.ts`
  * `src/lib/world/world-definition.ts`
* **Source**: Custom procedural road ribbon and bridge mesh generators.
* **License**: MIT License.
* **Usage**: Metropolis-Harbor Arterial Highway ($14\text{m}$), Academy-Metropolis Expressway ($11\text{m}$), Forest Timber Road ($8\text{m}$), Pelican Coastal Spur ($8\text{m}$), Mount Apex Switchback Pass ($7.5\text{m}$), and Grand Valley Stone Arch Bridge ($12\text{m}$).

### Physical Helipads & Aviation Markings
* **Files**:
  * `src/components/simulator/world/helipad-mesh.ts`
  * `src/lib/world/helipad-definitions.ts`
* **Source**: Procedural Three.js geometry generators matching standard ICAO / FAA heliport markings.
* **License**: MIT License.
* **Usage**: Standardized concrete, timber, steel, and rooftop vertiports with threshold LED lights and crosshatch markings.

---

## 2. External 3D Models & Commercial Kits

### Kenney Commercial Building Kit
* **Location in Project**: `public/models/commercial/`
* **Author / Source**: [Kenney](https://kenney.nl/)
* **License**: Creative Commons Zero (CC0 1.0 Universal) — Public Domain Dedication.
* **Usage**: Architectural skyscraper and commercial low-rise models forming the Downtown Metropolis district skyline in `city-district-system.ts`, `city-region.ts`, and `building-generator.ts`.

### Kenney Industrial Kit
* **Location in Project**: `public/models/industrial/`
* **Author / Source**: [Kenney](https://kenney.nl/)
* **License**: Creative Commons Zero (CC0 1.0 Universal) — Public Domain Dedication.
* **Usage**: Industrial warehouses, tanks, chimneys, and transition structures in `building-generator.ts`.

### Kenney Roads & Street Furniture Kit
* **Location in Project**: `public/models/roads/`
* **Author / Source**: [Kenney](https://kenney.nl/)
* **License**: Creative Commons Zero (CC0 1.0 Universal) — Public Domain Dedication.
* **Usage**: Streetlights, curved double streetlights, traffic signals, stop signs, warning signs, cones, dumpsters, and utility poles in `street-furniture.ts`.

### Kenney Vehicles Kit
* **Location in Project**: `public/models/vehicles/`
* **Author / Source**: [Kenney](https://kenney.nl/)
* **License**: Creative Commons Zero (CC0 1.0 Universal) — Public Domain Dedication.
* **Usage**: Sedans, SUVs, police interceptors, ambulances, taxis, vans, and commercial trucks in `traffic-manager.ts` and `parking-system.ts`.

---

## 3. Strict Compliance & Forbidden Asset Policy

In accordance with project governance:
* **Allowed Sources**:
  1. **Poly Haven** (CC0 Public Domain)
  2. **Quaternius** (CC0 Public Domain)
  3. **Kenney** (CC0 Public Domain)
  4. Custom in-house mathematical / procedural systems (MIT License)
* **Strictly Prohibited**:
  * Ripped game assets (GTA, PUBG, Flight Simulator, Fortnite, etc.)
  * Proprietary map data extracts
  * Copyrighted assets with non-commercial, attribution-only, or ambiguous licensing
  * Unverified web downloads

---

## 4. Phase 2 Natural Environment & Vegetation Systems

### Procedural Multi-Species Botanical & Geological Generators
* **Files**:
  * `src/components/simulator/world/environment/environment-models.ts`
  * `src/components/simulator/world/nature-system.ts`
  * `src/lib/world/biome-system.ts`
  * `src/lib/world/environment-asset-registry.ts`
* **Source**: Custom procedural Three.js multi-tier geometry generators developed for DRONE PILOT.
* **License**: MIT License (project repository).
* **Usage**:
  * Scots Pine (*Pinus Sylvestris*): 26m conifer with multi-directional branch tilting.
  * Norway Spruce: 28.5m tiered spire conifer with 7 downward bough tiers.
  * English Oak (*Quercus Robur*): 22m broadleaf canopy with 4 branching limbs and faceted foliage leaf masses.
  * Mountain Birch (*Betula Pendula*): 16.5m slender silvery trunk with airy crown.
  * Coastal Palm: 14m curved trunk with 12 radiating fan fronds.
  * Riparian Weeping Willow: 18m cascading branches trailing down toward water surfaces.
  * Weathered Snag: 15m deadwood trunk with shattered limbs.
  * Glacial Granite Boulders, Alpine Scree Talus Chutes, River Cobblestone Beds, and Sea Stacks.
  * Mossy Fallen Logs, Tree Stumps, Sun-Bleached Beach Driftwood, Mooring Pilings, and Trail Fences.

### Poly Haven Botanical & Geological Reference Archives
* **Location in Project**: `public/3d/world/environment/`
* **Author / Source**: [Poly Haven](https://polyhaven.com/)
* **License**: Creative Commons Zero (CC0 1.0 Universal) — Public Domain Dedication.
* **Reference Assets**:
  * `fir_tree_01_4k` (Bark & Needle Textures)
  * `dead_tree_trunk_02_4k` (Weathered Wood Textures)
  * `namaqualand_boulder_05_4k` & `namaqualand_boulder_06_4k` (Granite Surface Data)
  * `grass_medium_01_4k` & `dandelion_01_4k` (Foliage & Wildflower Reference)