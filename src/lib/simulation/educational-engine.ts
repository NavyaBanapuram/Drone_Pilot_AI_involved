// ==========================================================
// DRONE PILOT — LIVE EDUCATIONAL SITUATION GUIDANCE ENGINE
// Evaluates real-time physics telemetry to identify aerodynamic
// situations and explains them: EVENT -> CAUSE -> EFFECT -> ACTION
// ==========================================================

import { EducationalEvent, TelemetryState, EnvironmentState } from "./types";

export class EducationalEngine {
  private lastEmitTime: Record<string, number> = {};
  private cooldownSeconds = 12.0;

  /**
   * Analyzes current simulation frame and returns high-priority educational advisory if triggered.
   */
  public evaluate(
    telemetry: TelemetryState,
    env: EnvironmentState,
    payloadKg = 0
  ): EducationalEvent | null {
    const now = Date.now();

    const canEmit = (key: string) => {
      const last = this.lastEmitTime[key] || 0;
      return (now - last) / 1000 > this.cooldownSeconds;
    };

    const emit = (key: string, event: Omit<EducationalEvent, "id" | "timestamp">): EducationalEvent => {
      this.lastEmitTime[key] = now;
      return {
        ...event,
        id: key + "_" + Math.floor(now / 1000),
        timestamp: now,
      };
    };

    // 1. Crosswind Drift Detection
    const horizontalSpeed = Math.hypot(telemetry.velocity.x, telemetry.velocity.z);
    if (env.windSpeed > 5.0 && telemetry.altitude > 2.0 && horizontalSpeed > 1.2 && canEmit("crosswind")) {
      return emit("crosswind", {
        title: "CROSSWIND DRIFT DETECTED",
        message: "Lateral wind force is pushing the aircraft off its intended hover track.",
        cause: "Ambient crosswind of " + env.windSpeed.toFixed(1) + " m/s exerting drag on airframe.",
        effect: "Aircraft drifting sideways at " + (horizontalSpeed * 3.6).toFixed(1) + " km/h.",
        recommendedAction: "Apply gentle roll stick into the wind or switch to Hover Assist.",
        severity: "warning",
      });
    }

    // 2. High Payload Hover Demand
    if (payloadKg > 0.5 && telemetry.altitude > 1.0 && canEmit("payload_mass")) {
      return emit("payload_mass", {
        title: "PAYLOAD INERTIA ENGAGED",
        message: "Added payload mass increases required hover thrust and braking distance.",
        cause: "Carrying +" + payloadKg.toFixed(1) + " kg external payload.",
        effect: "Hover requires higher throttle equilibrium; acceleration response dampened.",
        recommendedAction: "Anticipate braking earlier when approaching landing pads.",
        severity: "info",
      });
    }

    // 3. Low Battery & Voltage Sag Warning
    if (telemetry.batteryLevel <= 20 && telemetry.batteryLevel > 8 && canEmit("low_battery")) {
      return emit("low_battery", {
        title: "LOW BATTERY RESERVE",
        message: "Battery state-of-charge has reached the 20% reserve threshold.",
        cause: "Prolonged motor current draw has depleted electrochemical cell capacity.",
        effect: "Terminal voltage is sagging; maximum climb authority will begin decreasing.",
        recommendedAction: "Begin descent and navigate toward the nearest registered helipad.",
        severity: "warning",
      });
    }

    // 4. Critical Battery Brownout Hazard
    if (telemetry.batteryLevel <= 8 && telemetry.isArmed && canEmit("critical_battery")) {
      return emit("critical_battery", {
        title: "CRITICAL VOLTAGE BROWNOUT",
        message: "Battery is nearly exhausted (< 8%). Forced descent active.",
        cause: "Cell voltage has reached critical cutoff (3.2V/cell).",
        effect: "Flight controller is throttling motor power to prevent in-flight inverter shutdown.",
        recommendedAction: "Execute immediate emergency touchdown on any clear terrain.",
        severity: "error",
      });
    }

    // 5. Rapid Descent / Vortex Ring State Hazard
    if (telemetry.verticalSpeed < -4.5 && telemetry.altitude > 8.0 && canEmit("rapid_descent")) {
      return emit("rapid_descent", {
        title: "HIGH SINK RATE WARNING",
        message: "Aircraft descending too rapidly into its own turbulent rotor downwash.",
        cause: "Vertical descent speed exceeds safe limits (-" + Math.abs(telemetry.verticalSpeed).toFixed(1) + " m/s).",
        effect: "Risk of settling with power (Vortex Ring State), causing sudden loss of lift.",
        recommendedAction: "Pitch forward (W) to enter clean air while increasing collective thrust.",
        severity: "warning",
      });
    }

    // 6. Excessive Banking / Attitude Instability
    const tiltDeg = Math.max(Math.abs(telemetry.rotation.pitch), Math.abs(telemetry.rotation.roll)) * (180 / Math.PI);
    if (tiltDeg > 35 && telemetry.altitude > 2.0 && canEmit("attitude_tilt")) {
      return emit("attitude_tilt", {
        title: "STEEP BANK ANGLE",
        message: "Aircraft tilt angle exceeds recommended aerodynamic stability limits.",
        cause: "Pitch or roll commanded beyond " + tiltDeg.toFixed(0) + "°.",
        effect: "Vertical component of total thrust is severely reduced; altitude loss likely.",
        recommendedAction: "Release cyclic stick to allow auto-leveling stabilization.",
        severity: "warning",
      });
    }

    return null;
  }
}
