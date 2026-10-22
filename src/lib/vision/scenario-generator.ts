// ==========================================================
// DRONE PILOT — REPRODUCIBLE SCENARIO & TRAJECTORY GENERATOR
// Generates parameterized flight runs across all 9 helipads
// with seeded deterministic PRNG, altitude profiles, attitude
// variations, and controlled positive/negative sample ratios.
// ==========================================================

import { HELIPADS_RECORD } from "../world/world-definition";
import { HELIPAD_SCENE_MAP, LandingSceneCategory } from "./dataset-schema";
import { DroneCategory } from "../simulation/types";

export class SeededRng {
  private state: number;

  constructor(seed = 4242) {
    this.state = (seed >>> 0) || 1;
  }

  public next(): number {
    // Mulberry32 32-bit deterministic PRNG
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  public pick<T>(items: readonly T[]): T {
    const idx = Math.floor(this.next() * items.length);
    return items[idx];
  }

  public boolean(probabilityTrue = 0.5): boolean {
    return this.next() < probabilityTrue;
  }
}

export interface ScenarioPoint {
  flightRunId: string;
  sequenceNumber: number;
  timeSeconds: number;
  airframeType: DroneCategory;
  targetHelipadId: string;
  sceneCategory: LandingSceneCategory;
  dronePosition: { x: number; y: number; z: number };
  droneAttitude: { pitchDeg: number; rollDeg: number; yawDeg: number };
  altitudeAglMeters: number;
  isNegativeSample: boolean;
}

export interface ScenarioGeneratorConfig {
  seed?: number;
  targetHelipads?: string[]; // Defaults to all 9 helipads
  runCount?: number; // Number of distinct flight runs
  framesPerRun?: number; // Samples captured along each approach trajectory
  negativeRunRatio?: number; // Target percentage of negative/off-pad runs (e.g. 0.20 for 20%)
}

export const ALL_NINE_HELIPAD_IDS = [
  "training-alpha",
  "training-bravo",
  "forest-alpha",
  "mountain-alpha",
  "river-alpha",
  "city-alpha",
  "city-apex-rooftop",
  "industrial-alpha",
  "coast-alpha",
] as const;

export class ScenarioGenerator {
  private rng: SeededRng;
  private config: Required<ScenarioGeneratorConfig>;

  constructor(config: ScenarioGeneratorConfig = {}) {
    const seed = config.seed !== undefined ? config.seed : 4242;
    this.rng = new SeededRng(seed);
    this.config = {
      seed,
      targetHelipads: config.targetHelipads || [...ALL_NINE_HELIPAD_IDS],
      runCount: config.runCount || 10,
      framesPerRun: config.framesPerRun || 10,
      negativeRunRatio: config.negativeRunRatio !== undefined ? config.negativeRunRatio : 0.2,
    };
  }

  /**
   * Generates a complete batch of structured scenario points grouped by unique flight runs.
   */
  public generateBatch(): ScenarioPoint[] {
    const allPoints: ScenarioPoint[] = [];
    const airframeCategories: DroneCategory[] = ["quadcopter", "hexacopter", "octacopter"];

    for (let r = 0; r < this.config.runCount; r++) {
      const runSeed = Math.floor(this.rng.next() * 1000000);
      const flightRunId = `run_synth_${this.config.seed}_${r.toString().padStart(4, "0")}`;
      const helipadId = this.config.targetHelipads[r % this.config.targetHelipads.length];
      const helipad = HELIPADS_RECORD[helipadId];
      const sceneCategory = HELIPAD_SCENE_MAP[helipadId] || "Field";
      const airframeType = this.rng.pick(airframeCategories);

      const isNegativeRun = this.rng.next() < this.config.negativeRunRatio;

      // Trajectory starting parameters
      const startAltitude = this.rng.range(22.0, 36.0);
      const endAltitude = isNegativeRun ? this.rng.range(18.0, 35.0) : this.rng.range(1.5, 4.0);

      const baseHeading = this.rng.range(0, 360);
      const startOffsetDist = isNegativeRun
        ? this.rng.range(22.0, 40.0) // Well outside camera frustum
        : this.rng.range(3.0, 14.0);
      const offsetAngle = this.rng.range(0, Math.PI * 2);

      const startOffsetX = Math.cos(offsetAngle) * startOffsetDist;
      const startOffsetZ = Math.sin(offsetAngle) * startOffsetDist;

      // Target descent vector towards center
      const endOffsetX = isNegativeRun ? startOffsetX + this.rng.range(-5, 5) : this.rng.range(-1.2, 1.2);
      const endOffsetZ = isNegativeRun ? startOffsetZ + this.rng.range(-5, 5) : this.rng.range(-1.2, 1.2);

      for (let s = 0; s < this.config.framesPerRun; s++) {
        const t = this.config.framesPerRun > 1 ? s / (this.config.framesPerRun - 1) : 0;
        const timeSeconds = Math.round((s * 0.5) * 100) / 100;

        // Interpolated descent
        const currentAltitudeAbovePad = startAltitude + (endAltitude - startAltitude) * t;
        const currentOffsetX = startOffsetX + (endOffsetX - startOffsetX) * t + this.rng.range(-0.3, 0.3);
        const currentOffsetZ = startOffsetZ + (endOffsetZ - startOffsetZ) * t + this.rng.range(-0.3, 0.3);

        const worldX = helipad.position.x + currentOffsetX;
        const worldY = helipad.position.y + currentAltitudeAbovePad;
        const worldZ = helipad.position.z + currentOffsetZ;

        // Minor dynamic attitude tilt as drone brakes / tracks
        const pitchDeg = this.rng.range(-12.0, 12.0);
        const rollDeg = this.rng.range(-12.0, 12.0);
        const yawDeg = Math.round((baseHeading + this.rng.range(-8, 8)) * 10) / 10;

        allPoints.push({
          flightRunId,
          sequenceNumber: s,
          timeSeconds,
          airframeType,
          targetHelipadId: helipadId,
          sceneCategory,
          dronePosition: {
            x: Math.round(worldX * 100) / 100,
            y: Math.round(worldY * 100) / 100,
            z: Math.round(worldZ * 100) / 100,
          },
          droneAttitude: {
            pitchDeg: Math.round(pitchDeg * 10) / 10,
            rollDeg: Math.round(rollDeg * 10) / 10,
            yawDeg,
          },
          altitudeAglMeters: Math.round(currentAltitudeAbovePad * 100) / 100,
          isNegativeSample: isNegativeRun,
        });
      }
    }

    return allPoints;
  }
}
