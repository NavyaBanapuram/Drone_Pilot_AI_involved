// ==========================================================
// DRONE PILOT — 3D WORLD SCENE (FACADE)
// Connects FlightSimulator to the modular WorldRoot engine
// ==========================================================

import * as THREE from "three";
import { WorldRoot } from "./world/world-root";

import { EnvironmentState } from "@/lib/simulation/types";

export class WorldScene {
  public root: WorldRoot;
  public group: THREE.Group;

  constructor(scene: THREE.Scene) {
    this.root = new WorldRoot(scene);
    this.group = this.root.group;
  }

  public update(dt: number, elapsed: number, dronePos?: THREE.Vector3, thrust = 1.0, envState?: EnvironmentState) {
    this.root.update(dt, elapsed, dronePos, thrust, envState);
  }

  public getGroundElevation(x: number, z: number): number {
    return this.root.getGroundElevation(x, z);
  }
}