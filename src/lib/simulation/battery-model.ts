// ==========================================================
// DRONE PILOT — LIPO BATTERY ELECTRICAL DYNAMICS MODEL
// Simulates series LiPo cells, internal resistance,
// voltage sag under high-current draw, and temperature derating.
// ==========================================================

import { BatteryState } from "./types";

export class BatteryModel {
  private capacityMah: number;
  private remainingMah: number;
  private cellCount: number;
  // Internal resistance in Ohms (total pack level, not per-cell).
  // Default: 8 mΩ/cell × cellCount (typical fresh LiPo).
  private packInternalResistanceOhm: number;
  private temperatureC = 22.0;
  private lastTerminalVoltage: number = 16.8;

  constructor(capacityMah: number, cellCount = 4) {
    this.capacityMah = capacityMah;
    this.remainingMah = capacityMah;
    this.cellCount = cellCount;
    this.packInternalResistanceOhm = 0.008 * cellCount; // default: 8 mΩ/cell
  }

  /**
   * Override pack internal resistance from Digital Twin configuration.
   * @param milliOhms - Total pack resistance in milliohms (e.g. 12 for 12 mΩ pack)
   */
  public setInternalResistance(milliOhms: number): void {
    if (!Number.isFinite(milliOhms) || milliOhms <= 0) return;
    this.packInternalResistanceOhm = milliOhms / 1000;
  }

  public setTemperature(tempC: number) {
    this.temperatureC = tempC;
  }

  public reset(initialPercentage = 100.0) {
    this.remainingMah = (initialPercentage / 100.0) * this.capacityMah;
  }

  public getPercentage(): number {
    return Math.max(0, Math.min(100, (this.remainingMah / this.capacityMah) * 100));
  }


  /**
   * Evaluates battery state given active total current draw (Amperes) and timestep (seconds).
   */
  public update(currentAmps: number, dt: number): BatteryState {
    // 1. Drain energy (Amps * seconds -> mAh)
    const drainedMah = (currentAmps * (dt / 3600)) * 1000;
    this.remainingMah = Math.max(0, this.remainingMah - drainedMah);

    const percentage = Math.max(0, Math.min(100, (this.remainingMah / this.capacityMah) * 100));

    // 2. Open-Circuit Cell Voltage curve:
    // 100% -> 4.20V
    // 50%  -> 3.82V (nominal storage)
    // 10%  -> 3.60V (kneepoint)
    // 0%   -> 3.25V (cutoff)
    const stateOfCharge = percentage / 100.0;
    let cellVoc = 3.25;
    if (stateOfCharge > 0.1) {
      cellVoc = 3.60 + Math.pow(stateOfCharge - 0.1, 0.75) * 0.60;
    } else {
      cellVoc = 3.25 + (stateOfCharge / 0.1) * 0.35;
    }

    const openCircuitVoltage = cellVoc * this.cellCount;

    // 3. Temperature influence on internal resistance:
    // Cold (< 10°C) increases internal resistance dramatically
    let tempFactor = 1.0;
    if (this.temperatureC < 15) {
      tempFactor = 1.0 + (15 - this.temperatureC) * 0.05; // +5% R_int per °C below 15
    } else if (this.temperatureC > 35) {
      tempFactor = 0.95;
    }

    // Apply temperature derating to pack-level resistance
    const packInternalResistance = this.packInternalResistanceOhm * tempFactor;

    // 4. Terminal Voltage with Ohm's Law Voltage Sag: V_terminal = V_oc - I * R_int
    const terminalVoltage = Math.max(0, openCircuitVoltage - currentAmps * packInternalResistance);
    this.lastTerminalVoltage = terminalVoltage;
    const powerWatts = terminalVoltage * currentAmps;


    const isLow = percentage < 20.0;
    const isCritical = percentage < 8.0;

    return {
      capacityMah: this.capacityMah,
      remainingMah: Math.round(this.remainingMah),
      percentage: Math.round(percentage * 10) / 10,
      cellCount: this.cellCount,
      openCircuitVoltage: Math.round(openCircuitVoltage * 100) / 100,
      terminalVoltage: Math.round(terminalVoltage * 100) / 100,
      currentAmps: Math.round(currentAmps * 10) / 10,
      powerWatts: Math.round(powerWatts * 10) / 10,
      temperatureC: this.temperatureC,
      isLow,
      isCritical,
    };
  }

  /**
   * Available thrust multiplier (1.0 down to 0.4 when battery is depleted)
   */
  public getThrustAuthority(): number {
    // True voltage sag limits motor RPM. Thrust ~ RPM^2 ~ Voltage^2
    const maxVoltage = 4.2 * this.cellCount;
    // Hard cutoff at 3.0V per cell
    const cutoffVoltage = 3.0 * this.cellCount;
    
    if (this.lastTerminalVoltage <= cutoffVoltage) {
      return 0.0; // ESCs shut down
    }
    
    // Calculate authority based on voltage sag. 
    // At full 16.8V (4S) = 1.0 authority. At 14.0V = (14/16.8)^2 = 0.69 authority.
    const voltageRatio = this.lastTerminalVoltage / maxVoltage;
    let auth = voltageRatio * voltageRatio;
    
    // Add soft limit if battery capacity is absolutely dead
    const frac = this.remainingMah / this.capacityMah;
    if (frac <= 0.05) {
       auth *= (frac / 0.05);
    }
    
    return Math.max(0.0, Math.min(1.0, auth));
  }
}
