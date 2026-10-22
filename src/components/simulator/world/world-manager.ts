// ==========================================================
// DRONE PILOT — 3D WORLD MANAGER (ORCHESTRATOR)
// Orchestrates WorldEnvironment, Terrain, and Regions A-F
// ==========================================================

import * as THREE from "three";
import { WorldEnvironment } from "./world-environment";
import { EnvironmentManager } from "./environment-manager";
import { TerrainManager } from "./terrain-manager";
import { TrainingRegion } from "./training-region";
import { ForestRegion } from "./forest-region";
import { MountainRegion } from "./mountain-region";
import { CityRegion } from "./city-region";
import { IndustrialRegion } from "./industrial-region";
import { WaterRegion } from "./water-region";
import { AssetManager } from "./asset-manager";

export class WorldManager {
  public group = new THREE.Group();

  public environment: WorldEnvironment;
  public envState: EnvironmentManager;
  public terrain: TerrainManager;
  public trainingRegion: TrainingRegion;
  public forestRegion: ForestRegion;
  public mountainRegion: MountainRegion;
  public cityRegion: CityRegion;
  public industrialRegion: IndustrialRegion;
  public waterRegion: WaterRegion;
  public assetManager: AssetManager;

  constructor(scene: THREE.Scene) {
    this.assetManager = AssetManager.getInstance();
    this.envState = EnvironmentManager.getInstance();

    // 1. Atmosphere, Sun, Lighting & Sky Clouds
    this.environment = new WorldEnvironment(scene);

    // 2. Base Island Landmass & Surrounding Ocean
    this.terrain = new TerrainManager();
    this.group.add(this.terrain.group);

    // 3. Region A: Training Helipad Area
    this.trainingRegion = new TrainingRegion();
    this.group.add(this.trainingRegion.group);

    // 4. Region B: Alpine & Broadleaf Forest
    this.forestRegion = new ForestRegion();
    this.group.add(this.forestRegion.group);

    // 5. Region C: Mount Apex Mountain Massif
    this.mountainRegion = new MountainRegion();
    this.group.add(this.mountainRegion.group);

    // 6. Region D: Metropolis City District
    this.cityRegion = new CityRegion();
    this.group.add(this.cityRegion.group);

    // 7. Region E: Industrial & Logistics Harbor
    this.industrialRegion = new IndustrialRegion();
    this.group.add(this.industrialRegion.group);

    // 8. Region F: Water Bodies, River & Marina
    this.waterRegion = new WaterRegion();
    this.group.add(this.waterRegion.group);

    scene.add(this.group);
  }

  /**
   * Elevation query for drone physics landing detection
   */
  public getGroundElevation(x: number, z: number): number {
    return this.terrain.getGroundElevation(x, z);
  }

  /**
   * Per-frame animation tick
   */
  public update(dt: number, elapsed: number) {
    this.environment.update(dt, elapsed);
    this.terrain.update(dt, elapsed);
    this.trainingRegion.update(dt, elapsed);
    this.mountainRegion.update(dt, elapsed);
    this.cityRegion.update(dt, elapsed);
  }
}
