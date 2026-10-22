// ==========================================================
// DRONE PILOT — EDUCATIONAL CAUSE & EFFECT ENGINE (PHASE 5)
// Detects real-time simulation dynamics and generates
// aerospace educational feedback for pilots & engineers
// ==========================================================

import { EducationalEvent, TelemetryState, EnvironmentState } from "./types";

export class EducationalEventEngine {
  private eventHistory: EducationalEvent[] = [];
  private lastTriggerTimes: Record<string, number> = {};
  private onEventListener?: (event: EducationalEvent) => void;

  // Previous state trackers for edge detection
  private prevMotorHealths: number[] = [1, 1, 1, 1, 1, 1, 1, 1];
  private prevGpsHealthy = true;
  private prevBaroHealthy = true;
  private prevBatteryLevel = 100;
  private prevWindSpeed = 2.0;
  private prevPayloadMass = 0.0;

  constructor(listener?: (event: EducationalEvent) => void) {
    this.onEventListener = listener;
  }

  public setListener(listener: (event: EducationalEvent) => void) {
    this.onEventListener = listener;
  }

  public getHistory(): EducationalEvent[] {
    return [...this.eventHistory];
  }

  public clearHistory() {
    this.eventHistory = [];
  }

  /**
   * Evaluates simulation state every telemetry update frame.
   * Debounces identical events (e.g. at most once every 6 seconds per category).
   */
  public evaluate(
    telemetry: TelemetryState,
    env: EnvironmentState,
    motorHealths: number[],
    sensorHealth: { gps: boolean; imu: boolean; baro: boolean; compass: boolean },
    payloadMass: number
  ) {
    const now = Date.now();

    // -----------------------------------------------------------
    // 1. MOTOR DEGRADATION / FAILURE EVENT
    // -----------------------------------------------------------
    for (let i = 0; i < motorHealths.length; i++) {
      const current = motorHealths[i];
      const prev = this.prevMotorHealths[i] !== undefined ? this.prevMotorHealths[i] : 1.0;

      if (prev >= 0.8 && current < 0.7) {
        const motorLabel = `M${i + 1}`;
        const severity = current <= 0.1 ? "critical" : "warning";
        const dropPercent = Math.round((1.0 - current) * 100);

        this.emitEvent({
          id: `motor-${i}-${now}`,
          title: current <= 0.1 ? `PROPULSION FAILURE: ${motorLabel} STOPPED` : `MOTOR DEGRADATION: ${motorLabel} (-${dropPercent}%)`,
          message: `${motorLabel} output reduced to ${Math.round(current * 100)}%. Asymmetric thrust vector active.`,
          whatHappened: `Motor ${i + 1} operating capacity reduced by ${dropPercent}% (now delivering ${Math.round(current * 100)}% nominal output).`,
          whyItHappened: `Propulsion degradation injected (simulating bearing friction, overheating ESC, or damaged rotor blade).`,
          whatEffectItCaused: `Net rolling/pitching torque induced on airframe. Flight controller increased RPM on opposing motors to compensate, increasing total current draw.`,
          recommendedAction: `Counter with opposite cyclic stick input, reduce forward translation speed, and perform an immediate controlled landing on the nearest level surface.`,
          severity: severity === "critical" ? "error" : "warning",
          timestamp: now,
        });
      }
    }
    this.prevMotorHealths = [...motorHealths];

    // -----------------------------------------------------------
    // 2. GPS NAVIGATION BLACKOUT / ATTI MODE
    // -----------------------------------------------------------
    if (this.prevGpsHealthy && !sensorHealth.gps) {
      this.emitEvent({
        id: `gps-loss-${now}`,
        title: "AVIONICS: GPS SIGNAL LOSS (ATTI MODE)",
        message: "Satellite lock lost. Flight controller reverted to Attitude (ATTI) mode. Position hold inactive.",
        whatHappened: "GPS navigation receiver went offline. Ground-relative velocity feedback is no longer available to the flight controller.",
        whyItHappened: "Simulated satellite signal loss or antenna failure.",
        whatEffectItCaused: "Automatic position braking is disabled. Releasing control sticks will NOT hold the drone stationary; the aircraft will drift with ambient wind vectors.",
        recommendedAction: "Pilot must actively steer against wind drift using visual references. Plan an approach to landing using landmark navigation.",
        severity: "warning",
        timestamp: now,
      });
    } else if (!this.prevGpsHealthy && sensorHealth.gps) {
      this.emitEvent({
        id: `gps-restored-${now}`,
        title: "AVIONICS: GPS SIGNAL RESTORED",
        message: "Satellite constellation acquired. Automated GPS Position Hold re-engaged.",
        whatHappened: "GPS receiver re-acquired 3D fix and RTK positioning locks.",
        whyItHappened: "Signal cleared or sensor failure cleared.",
        whatEffectItCaused: "Active position braking and automated hover-hold restored.",
        recommendedAction: "Resume normal mission trajectory.",
        severity: "success",
        timestamp: now,
      });
    }
    this.prevGpsHealthy = sensorHealth.gps;

    // -----------------------------------------------------------
    // 3. BAROMETER FAILURE / ALTITUDE HOLD
    // -----------------------------------------------------------
    if (this.prevBaroHealthy && !sensorHealth.baro) {
      this.emitEvent({
        id: `baro-loss-${now}`,
        title: "AVIONICS: BAROMETER MALFUNCTION",
        message: "Barometric pressure sensor offline. Automated altitude hold precision degraded.",
        whatHappened: "Static pressure transducer failure detected.",
        whyItHappened: "Simulated port blockage or sensor bus disconnect.",
        whatEffectItCaused: "Altitude hold loop experiences vertical drift oscillations. Collective throttle requires manual operator monitoring.",
        recommendedAction: "Monitor Radar AGL telemetry directly and maintain altitude manually with throttle collective.",
        severity: "warning",
        timestamp: now,
      });
    }
    this.prevBaroHealthy = sensorHealth.baro;

    // -----------------------------------------------------------
    // 4. BATTERY DYNAMICS (LOW & CRITICAL THRESHOLDS)
    // -----------------------------------------------------------
    if (this.prevBatteryLevel >= 20 && telemetry.batteryLevel < 20 && telemetry.batteryLevel > 8) {
      this.emitEvent({
        id: `battery-low-${now}`,
        title: "POWER SYSTEM: LOW BATTERY (19% SOC)",
        message: "Battery state of charge below 20%. Voltage sag will restrict maximum climb acceleration.",
        whatHappened: "Battery capacity reached reserve threshold (under 20% nominal energy).",
        whyItHappened: "Continuous motor discharge during flight.",
        whatEffectItCaused: "Cell open-circuit voltage dropped below 3.68V/cell. High-throttle maneuvers induce deeper voltage sag, triggering propulsion derating.",
        recommendedAction: "Cease high-power climb maneuvers, steer toward home helipad, and prepare for recovery.",
        severity: "warning",
        timestamp: now,
      });
    } else if (this.prevBatteryLevel >= 8 && telemetry.batteryLevel <= 8) {
      this.emitEvent({
        id: `battery-critical-${now}`,
        title: "EMERGENCY: CRITICAL BATTERY DEPLETION (<=8%)",
        message: "Battery level critical. Terminal voltage entering cell cutoff territory.",
        whatHappened: "Battery energy nearly depleted. Cell chemistry entering low-voltage kneepoint.",
        whyItHappened: "Continued flight past reserve margins.",
        whatEffectItCaused: "Severe power limiting active. Aircraft may no longer maintain hover equilibrium. Forced auto-land or brownout imminent.",
        recommendedAction: "Execute immediate touchdown on the closest surface.",
        severity: "error",
        timestamp: now,
      });
    }
    this.prevBatteryLevel = telemetry.batteryLevel;

    // -----------------------------------------------------------
    // 5. HIGH WIND AERODYNAMIC DRAG
    // -----------------------------------------------------------
    if (this.prevWindSpeed < 10.0 && env.windSpeed >= 12.0) {
      this.emitEvent({
        id: `high-wind-${now}`,
        title: `AERODYNAMICS: HIGH CROSSWIND (${env.windSpeed.toFixed(1)} m/s)`,
        message: `High ambient wind detected (${Math.round(env.windSpeed * 3.6)} km/h). Airframe experiencing lateral drag.`,
        whatHappened: `Ambient wind velocity increased to ${env.windSpeed.toFixed(1)} m/s from heading ${env.windDirection}°.`,
        whyItHappened: `Meteorological environment change or highland ridge wind exposure.`,
        whatEffectItCaused: `Aerodynamic drag force F_drag = 0.5 * rho * v^2 * Cd * A opposes flight direction. The drone must tilt significantly into the wind to generate horizontal counter-thrust, increasing motor RPM and battery current draw.`,
        recommendedAction: `Limit maximum groundspeed when flying downwind. Compensate with extra crab angle on runway approaches.`,
        severity: "info",
        timestamp: now,
      });
    }
    this.prevWindSpeed = env.windSpeed;

    // -----------------------------------------------------------
    // 6. PAYLOAD MASS OVERWEIGHT
    // -----------------------------------------------------------
    if (this.prevPayloadMass < 3.0 && payloadMass >= 4.5) {
      this.emitEvent({
        id: `payload-heavy-${now}`,
        title: `MASS PROPERTIES: HEAVY PAYLOAD EQUIPPED (+${payloadMass.toFixed(1)} kg)`,
        message: `Aircraft mass increased. Hover throttle equilibrium increased.`,
        whatHappened: `Equipped payload mass increased by ${payloadMass.toFixed(1)} kg.`,
        whyItHappened: `Industrial agricultural spray tank or survey sensor pod mounted.`,
        whatEffectItCaused: `Total aircraft weight W = (m_dry + m_battery + m_payload) * g is elevated. Hover throttle shifted upward to maintain vertical equilibrium, reducing climb headroom and shortening flight duration.`,
        recommendedAction: `Smooth throttle inputs to avoid abrupt voltage sag. Allow longer stopping distances due to increased airframe inertia.`,
        severity: "info",
        timestamp: now,
      });
    }
    this.prevPayloadMass = payloadMass;
  }

  private emitEvent(event: EducationalEvent) {
    const categoryKey = event.title.split(":")[0] || event.title;
    const lastTime = this.lastTriggerTimes[categoryKey] || 0;

    // Debounce 4 seconds per major category
    if (Date.now() - lastTime < 4000) {
      return;
    }
    this.lastTriggerTimes[categoryKey] = Date.now();

    this.eventHistory.unshift(event);
    if (this.eventHistory.length > 30) {
      this.eventHistory.pop();
    }

    if (this.onEventListener) {
      this.onEventListener(event);
    }
  }
}
