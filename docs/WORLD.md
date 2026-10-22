# DRONE PILOT — World & Terrain Architecture Documentation

## 1. Overview & Simulation Scale
**DRONE PILOT** is an interactive, aeronautical drone training simulator set in an expansive, naturally formed archipelago environment.

* **World Coordinate Standard**:
  * Origin $(0, 0, 0)$: Geographic center of the Central Training Academy Helipad Alpha.
  * $+X$ Axis: East, $-X$ Axis: West.
  * $+Y$ Axis: Altitude in meters Above Sea Level (MSL Datum $Y = 0.0\text{m}$).
  * $+Z$ Axis: South, $-Z$ Axis: North.
  * Units: Meters (SI International standard).
* **World Dimensions**:
  * **Ocean Simulation Space**: $4000\text{m} \times 4000\text{m}$ ($X: [-2000, 2000]\text{m}, Z: [-2000, 2000]\text{m}$).
  * **Island Landmass Footprint**: Width $\approx 2000\text{m}$ (East–West), Length $\approx 1800\text{m}$ (North–South).
  * **Offshore Safety Perimeter**: Radius $R = 1100\text{m}$ from origin triggers telemetry safety advisory.
  * **Flight Ceiling**: $200\text{m}$ AGL (conforming to international UAV training airspace regulations).

---

## 2. Terrain Elevation Engine (`src/lib/world/terrain-math.ts`)
The terrain engine provides a deterministic, single-source elevation function `evaluateIslandElevation(x, z)` shared by both Three.js mesh vertex generation and real-time flight physics collision.

### Regional Biomes & Elevation Envelopes:
1. **Central Training Academy (`training`)**:
   * Center: $(0, 1.2, 0)$, Radius $\approx 160\text{m}$.
   * Elevation: Leveled tarmac plateau at $Y = 1.2\text{m}$.
   * Helipads: Helipad Alpha (Main) and Helipad Bravo (Practice).
2. **Mount Apex Highlands (`mountain`)**:
   * Center: $(-480, 24.0, -450)$, Massif Radius $\approx 460\text{m}$.
   * Elevation: Climbs smoothly from foothill ridges ($12\text{m}$) to craggy peaks ($85\text{m}$).
   * Leveled plateau terrace at $(-480, -450)$ at elevation $Y = 28.5\text{m}$ engineered for the Weather Station Helipad.
3. **Crystal Mountain Lake Basin (`river`)**:
   * Center: $(-280, -180)$, Radius $\approx 110\text{m}$.
   * Freshwater lake water plane resting at $Y = 7.5\text{m}$ MSL with a concave basin bottom at $Y = 5.0\text{m}$ (depth $2.5\text{m}$).
4. **Valley River Corridor (`river`)**:
   * Meandering canyon carved $2.5\text{m}$ below the surrounding plains, descending from Crystal Lake ($Y = 7.5\text{m}$ at $Z = -160$) down to the southern ocean delta ($Y = 0.0\text{m}$ at $Z = 680$).
   * Valley Observation Helipad (`river-alpha`) at $Y = 2.5\text{m}$.
5. **Whispering Pines Forest (`forest`)**:
   * Center: $(450, 4.0, -420)$, Radius $\approx 380\text{m}$.
   * Multi-frequency harmonic rolling hills ($3.0\text{m} - 9.5\text{m}$).
   * Ranger Outpost Helipad (`forest-alpha`) at $Y = 4.0\text{m}$.
6. **Downtown Metropolis (`city`)**:
   * Center: $(520, 2.5, 380)$.
   * Leveled alluvial plain at $Y \approx 2.5\text{m}$ for high-rise commercial structures.
   * Ground Heliport Plaza at $Y = 2.5\text{m}$, Apex Skyscraper rooftop skyport at $Y = 58.5\text{m}$.
7. **Harbor Industrial Park (`industrial`)**:
   * Center: $(120, 1.8, 620)$.
   * Flat logistics apron at $Y = 1.8\text{m}$ adjacent to the ocean estuary channel.
8. **Pelican Cove & Western Bluffs (`coast`)**:
   * Center: $(-580, 1.5, 320)$.
   * Western sea cliffs rising $14\text{m}-18\text{m}$ and southern sandy beach dunes.

---

## 3. Coastline & Water System Architecture
* **Coastline Math (`src/lib/world/coastline-math.ts`)**:
  Multi-harmonic radial perturbation model forming natural bays (Emerald Bay), rocky headlands (North Cape), and crescent sandy beaches.
* **Ocean Water (`src/components/simulator/world/water/ocean-mesh.ts`)**:
  * $4000\text{m} \times 4000\text{m}$ ocean plane with animated wave vertex swells ($0.22\text{m}$).
  * PBR parameters: Roughness $0.12$, Metalness $0.82$, Opacity $0.94$.
  * Coastal Shallow Shelf: Submerged turquoise/cyan coastal ring ($0\text{m}$ to $45\text{m}$ offshore) providing natural depth coloration.
* **Freshwater System (`src/components/simulator/world/water/freshwater-mesh.ts`)**:
  * Crystal Mountain Lake surface sheet at $Y = 7.5\text{m}$.
  * Contoured river ribbon descending along the valley canyon to the ocean delta.

---

## 4. Multi-Zone PBR Terrain Texturing
* **Vertex Color Splatting**:
  * **Lush Grass / Woodland Soil**: Natural greens (`#476839`, `#3e5c32`) on inland plains and forest.
  * **Golden Sand**: Warm sand (`#d4b27d`) along low-slope shorelines and dunes.
  * **Granite Rock**: Dark slate (`#4a5568`, `#2d3748`) on slopes $> 22^\circ$ and sea cliffs.
  * **Alpine Scree**: Cold grey scree and snow caps (`#94a3b8`) on mountain summits $> 65\text{m}$.
  * **Moist Silt / Mud**: Dark earthy tones (`#3a3227`) along riverbeds and lake basins.
* **Lighting**: PBR-compatible directional sunlight, ambient fill, and smooth normal interpolation.

---

## 5. Developer Avionics Debug Mode
* Toggle with **F3** or backquote (**`**) key (or URL parameter `?debug=true`).
* Live telemetry readout:
  * Drone world position $[X, Z]\text{m}$
  * Drone altitude MSL ($Y\text{m}$)
  * Ground elevation MSL ($Y\text{m}$)
  * Radar clearance (AGL)
  * Surface biome & slope
  * Active region
  * Nearest helipad & distance

---

## 6. Implementation Status & Future Roadmap
* **Implemented (Step 1 - 3)**:
  * Irregular $2000\text{m} \times 1800\text{m}$ island landmass
  * $4000\text{m} \times 4000\text{m}$ ocean expanse with coastal shallow shelf
  * 8 canonical regions & 9 physical helipads
  * Dynamic ground elevation collision & contact shadow
  * Flight region & helipad selection suite (`/fly/select`)
  * Realistic multi-biome terrain elevation & freshwater lake/river foundation
  * Developer terrain debug HUD
* **Planned (Future Steps)**:
  * Step 4+: Realistic vegetation biomes (instanced trees, shrubs, grass)
  * Step 5+: Architecture & urban structures (buildings, hangars, bridges)
  * Step 6+: Dynamic weather, wind vectors, and aerology physics
