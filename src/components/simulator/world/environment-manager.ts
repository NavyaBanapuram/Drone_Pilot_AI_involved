// ==========================================================
// DRONE PILOT — ENVIRONMENT MANAGER
// Manages environmental conditions: wind, atmosphere, time-of-day
// ==========================================================

import * as THREE from "three";

export interface EnvironmentState {
  windSpeed: number; // m/s
  windDirectionDeg: number; // 0-360 degrees (0 = North, 90 = East)
  gustFactor: number; // 0 to 1
  airTemperatureC: number; // Celsius
  airPressureHpa: number; // hPa
  airDensity: number; // kg/m^3 (standard: 1.225)
  timeOfDay: "noon" | "golden_hour" | "dusk" | "overcast";
  visibilityKm: number;
}

export class EnvironmentManager {
  private static instance: EnvironmentManager;

  public state: EnvironmentState = {
    windSpeed: 3.4, // Gentle 3.4 m/s (6.6 kts) training breeze
    windDirectionDeg: 65, // Coming from East-North-East
    gustFactor: 0.15,
    airTemperatureC: 21,
    airPressureHpa: 1013.25,
    airDensity: 1.225,
    timeOfDay: "noon",
    visibilityKm: 10,
  };

  private windVector: THREE.Vector3 = new THREE.Vector3();

  private constructor() {
    this.updateWindVector();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private updateWindVector() {
    const rad = THREE.MathUtils.degToRad(this.state.windDirectionDeg);
    // Wind blowing towards direction
    this.windVector.set(Math.sin(rad) * this.state.windSpeed, 0, Math.cos(rad) * this.state.windSpeed);
  }

  public getWindVector(): THREE.Vector3 {
    return this.windVector.clone();
  }

  public setWind(speed: number, directionDeg: number) {
    this.state.windSpeed = Math.max(0, speed);
    this.state.windDirectionDeg = (directionDeg + 360) % 360;
    this.updateWindVector();
  }

  /**
   * Get momentary dynamic wind including gust oscillations
   */
  public getDynamicWind(elapsed: number): THREE.Vector3 {
    const gust = Math.sin(elapsed * 1.5) * this.state.gustFactor;
    const currentSpeed = Math.max(0, this.state.windSpeed * (1.0 + gust));
    const rad = THREE.MathUtils.degToRad(this.state.windDirectionDeg + Math.sin(elapsed * 0.8) * 5.0);
    return new THREE.Vector3(Math.sin(rad) * currentSpeed, 0, Math.cos(rad) * currentSpeed);
  }
}
