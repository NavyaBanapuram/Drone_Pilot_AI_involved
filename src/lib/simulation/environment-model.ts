// ==========================================================
// DRONE PILOT — METEOROLOGICAL ENVIRONMENT MODEL
// Simulates wind vectors, continuous turbulent gusting,
// temperature-dependent air density, rain, and visibility.
// ==========================================================

import { EnvironmentState, WeatherPreset } from "./types";

export class EnvironmentModel {
  private state: EnvironmentState = {
    weather: "clear",
    preset: "normal",
    windSpeed: 2.0,
    windDirection: 45, // blowing from Northeast
    windGust: 1.2,
    temperature: 20.0,
    rainIntensity: 0.0,
    visibility: 1.0,
    timeOfDay: "noon",
  };

  private elapsed = 0;

  constructor(initialState?: Partial<EnvironmentState>) {
    if (initialState) {
      this.state = { ...this.state, ...initialState };
    }
  }

  public getState(): EnvironmentState {
    return { ...this.state };
  }

  public setState(updates: Partial<EnvironmentState>) {
    this.state = { ...this.state, ...updates };
  }

  public applyPreset(preset: WeatherPreset) {
    switch (preset) {
      case "windy":
        this.state = {
          ...this.state,
          preset: "windy",
          weather: "windy",
          windSpeed: 9.5,
          windDirection: 70,
          windGust: 4.8,
          temperature: 16,
          rainIntensity: 0.0,
          visibility: 1.0,
        };
        break;
      case "hot":
        this.state = {
          ...this.state,
          preset: "hot",
          weather: "clear",
          windSpeed: 1.5,
          windDirection: 180,
          windGust: 0.8,
          temperature: 38,
          rainIntensity: 0.0,
          visibility: 0.5,
        };
        break;
      case "rain":
        this.state = {
          ...this.state,
          preset: "rain",
          weather: "rain",
          windSpeed: 6.0,
          windDirection: 210,
          windGust: 3.5,
          temperature: 14,
          rainIntensity: 0.6,
          visibility: 0.5,
        };
        break;
      case "fog":
        this.state = {
          ...this.state,
          preset: "fog",
          weather: "fog",
          windSpeed: 0.8,
          windDirection: 0,
          windGust: 0.4,
          temperature: 9,
          rainIntensity: 0.0,
          visibility: 0.1,
        };
        break;
      case "storm":
        this.state = {
          ...this.state,
          preset: "storm",
          weather: "storm",
          windSpeed: 14.5,
          windDirection: 285,
          windGust: 7.2,
          temperature: 12,
          rainIntensity: 1.0,
          visibility: 0.1,
        };
        break;
      case "normal":
      default:
        this.state = {
          ...this.state,
          preset: "normal",
          weather: "clear",
          windSpeed: 2.0,
          windDirection: 45,
          windGust: 1.0,
          temperature: 20,
          rainIntensity: 0.0,
          visibility: 1.0,
        };
        break;
    }
  }

  /**
   * Computes instantaneous wind vector in world coordinates [Vx, Vy, Vz] (m/s)
   */
  public getInstantaneousWind(dt: number): { x: number; y: number; z: number } {
    this.elapsed += dt;

    // Wind direction angle in radians
    const dirRad = (this.state.windDirection * Math.PI) / 180.0;

    // Phase 2: Chaotic Turbulent Gust Harmonics
    // Multi-octave pseudo-random noise for unpredictable weather buffeting
    const t = this.elapsed;
    const gustFactor = 
      (Math.sin(t * 0.43) * 0.4) + 
      (Math.cos(t * 1.17) * 0.3) + 
      (Math.sin(t * 3.42) * 0.2) + 
      (Math.cos(t * 8.11) * 0.1);
    
    // Low-frequency wind direction shifting
    const dirShiftRad = Math.sin(t * 0.2) * (this.state.windGust * 0.05);
    const finalDirRad = dirRad + dirShiftRad;

    const currentSpeed = Math.max(0, this.state.windSpeed + this.state.windGust * gustFactor);

    // Wind vector points in the direction the air is flowing towards
    const windVx = Math.sin(finalDirRad) * currentSpeed;
    const windVz = Math.cos(finalDirRad) * currentSpeed;
    const windVy = Math.sin(this.elapsed * 1.2) * (this.state.windGust * 0.15);

    return { x: windVx, y: windVy, z: windVz };
  }

  /**
   * Air density based on temperature: rho = P / (R * T)
   * Sea level standard: ~1.225 kg/m^3 at 15°C
   */
  public getAirDensity(): number {
    const tempKelvin = this.state.temperature + 273.15;
    return (101325 / (287.05 * tempKelvin));
  }
}
