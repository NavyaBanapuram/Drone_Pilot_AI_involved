// ==========================================================
// DRONE PILOT — DIGITAL TWIN CONFIGURATION VALIDATOR (PHASE 4)
// Multi-rule aeronautical safety & compatibility evaluation
// ==========================================================

import {
  DroneDigitalTwinConfiguration,
  DigitalTwinValidationResult,
  ValidationIssue,
} from "@/types/drone-digital-twin";

export function validateDroneDigitalTwin(
  config: DroneDigitalTwinConfiguration
): DigitalTwinValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const infos: ValidationIssue[] = [];

  // --------------------------------------------------------
  // 0. NAN / INFINITY SAFETY
  // --------------------------------------------------------
  const checkNaN = (obj: any, path: string) => {
    if (obj === null || obj === undefined) return;
    if (typeof obj === 'number') {
      if (Number.isNaN(obj) || !Number.isFinite(obj)) {
        errors.push({
          code: "INVALID_NUMBER",
          field: path,
          severity: "ERROR",
          message: `Value at ${path} is invalid (NaN or Infinity).`,
          educationalFixAdvice: "Ensure all physical parameters are valid numbers."
        });
      }
    } else if (typeof obj === 'object') {
      for (const key in obj) {
        checkNaN(obj[key], path ? `${path}.${key}` : key);
      }
    }
  };
  checkNaN(config, "");

  // --------------------------------------------------------
  // 1. MOTOR & AIRFRAME COMPATIBILITY
  // --------------------------------------------------------
  if (!config.motors || config.motors.length === 0) {
    errors.push({
      code: "NO_MOTORS",
      field: "motors",
      severity: "ERROR",
      message: "Aircraft has no propulsion motors configured.",
      educationalFixAdvice: "Add motors matching your airframe geometry (e.g. 4 for quadcopter).",
    });
  } else if (config.motors.length !== config.airframe.motorCount) {
    errors.push({
      code: "MOTOR_COUNT_MISMATCH",
      field: "airframe.motorCount",
      severity: "ERROR",
      message: `Motor count (${config.motors.length}) does not match airframe specification (${config.airframe.motorCount}).`,
      educationalFixAdvice: "Reconfigure motors or change airframe category to maintain aerodynamic balance.",
    });
  }

  // Check individual motor RPM limits
  config.motors.forEach((m, idx) => {
    if (m.maxRpm <= m.minRpm) {
      errors.push({
        code: "INVALID_MOTOR_RPM_RANGE",
        field: `motors[${idx}].maxRpm`,
        severity: "ERROR",
        message: `Motor ${m.motorId} max RPM (${m.maxRpm}) must be greater than min RPM (${m.minRpm}).`,
      });
    }
    if (m.nominalRpm > m.maxRpm) {
      warnings.push({
        code: "NOMINAL_EXCEEDS_MAX_RPM",
        field: `motors[${idx}].nominalRpm`,
        severity: "WARNING",
        message: `Motor ${m.motorId} nominal hover RPM (${m.nominalRpm}) exceeds maximum rated RPM (${m.maxRpm}).`,
      });
    }
  });

  // --------------------------------------------------------
  // 2. PROPELLER & AIRFRAME CLEARANCE
  // --------------------------------------------------------
  if (config.propeller) {
    const propDiaMm = config.propeller.diameterInches * 25.4;
    // Estimated max allowed prop size is ~48% of diagonal for quadcopter
    const maxClearanceMm = (config.airframe.frameDiagonalMm / 2) * 1.15;
    if (propDiaMm > maxClearanceMm) {
      warnings.push({
        code: "PROPELLER_FRAME_CLEARANCE",
        field: "propeller.diameterInches",
        severity: "WARNING",
        message: `Propeller diameter (${config.propeller.diameterInches}") may clip adjacent propellers or the central fuselage on a ${config.airframe.frameDiagonalMm}mm frame.`,
        educationalFixAdvice: "Reduce propeller diameter or increase arm length.",
      });
    }
    if (config.propeller.diameterInches <= 0 || config.propeller.pitchInches <= 0) {
      errors.push({
        code: "INVALID_PROP_DIMENSIONS",
        field: "propeller",
        severity: "ERROR",
        message: "Propeller diameter and pitch must be strictly positive numbers.",
      });
    }
  }

  // --------------------------------------------------------
  // 3. ELECTRICAL: BATTERY & ESC VOLTAGE COMPATIBILITY
  // --------------------------------------------------------
  if (!config.battery || config.battery.capacityMah <= 0) {
    errors.push({
      code: "MISSING_BATTERY_CAPACITY",
      field: "battery.capacityMah",
      severity: "ERROR",
      message: "Battery capacity must be greater than 0 mAh.",
      educationalFixAdvice: "Specify a valid battery capacity (e.g. 5000 mAh).",
    });
  } else {
    const vNominal = config.battery.nominalVoltageV;
    const esc = config.esc;
    if (esc) {
      if (vNominal > esc.voltageMaxV) {
        warnings.push({
          code: "BATTERY_OVERVOLTAGE_ESC",
          field: "battery.nominalVoltageV",
          severity: "WARNING",
          message: `Battery voltage (${vNominal}V) exceeds ESC maximum rated voltage (${esc.voltageMaxV}V). High risk of electrical blowout.`,
          educationalFixAdvice: "Use a lower series cell count (e.g. 4S instead of 6S) or upgrade ESC voltage rating.",
        });
      }
      if (vNominal < esc.voltageMinV) {
        warnings.push({
          code: "BATTERY_UNDERVOLTAGE_ESC",
          field: "battery.nominalVoltageV",
          severity: "WARNING",
          message: `Battery voltage (${vNominal}V) is below ESC minimum operating threshold (${esc.voltageMinV}V).`,
        });
      }
    }
  }

  // --------------------------------------------------------
  // 4. PAYLOAD & MASS CONSTRAINTS
  // --------------------------------------------------------
  if (config.airframe.dryMassKg <= 0) {
    errors.push({
      code: "INVALID_DRY_MASS",
      field: "airframe.dryMassKg",
      severity: "ERROR",
      message: "Airframe dry mass must be greater than zero.",
    });
  }

  const payloadMass = config.payload?.enabled ? (config.payload.massKg || 0) : 0;
  if (payloadMass > config.airframe.maxPayloadKg) {
    errors.push({
      code: "PAYLOAD_EXCEEDS_MAX_CAPACITY",
      field: "payload.massKg",
      severity: "ERROR",
      message: `Active payload mass (${payloadMass} kg) exceeds airframe structural payload limit (${config.airframe.maxPayloadKg} kg).`,
      educationalFixAdvice: "Reduce payload mass or select a heavy-duty airframe.",
    });
  }

  const totalMass = config.massProperties?.totalMassKg ?? 0;
  if (totalMass <= 0) {
    errors.push({
      code: "INVALID_TOTAL_MASS",
      field: "massProperties.totalMassKg",
      severity: "ERROR",
      message: "Calculated total all-up weight is zero or negative.",
    });
  }

  // --------------------------------------------------------
  // 5. THRUST-TO-WEIGHT AUTHORITY (TAKEOFF SAFETY)
  // --------------------------------------------------------
  const twr = config.performance?.thrustToWeightRatio ?? 0;
  if (twr < 1.0) {
    errors.push({
      code: "CANNOT_LIFT_OFF",
      field: "performance.thrustToWeightRatio",
      severity: "ERROR",
      message: `Thrust-to-Weight ratio is ${twr}:1 (< 1.0:1). Aircraft does not produce sufficient collective thrust to overcome gravity.`,
      educationalFixAdvice: "Increase motor RPM, use larger propellers, or reduce aircraft payload mass.",
    });
  } else if (twr < 1.25) {
    warnings.push({
      code: "MARGINAL_THRUST_AUTHORITY",
      field: "performance.thrustToWeightRatio",
      severity: "WARNING",
      message: `Thrust-to-Weight ratio is marginal (${twr}:1). Aircraft will struggle with vertical climb and wind recovery. Recommended TWR >= 1.8:1.`,
    });
  }

  // --------------------------------------------------------
  // 6. AVIONICS & SENSORS
  // --------------------------------------------------------
  if (!config.flightController || !config.flightController.controllerType) {
    errors.push({
      code: "NO_FLIGHT_CONTROLLER",
      field: "flightController",
      severity: "ERROR",
      message: "No Flight Controller specified. Aircraft cannot be stabilized.",
    });
  } else {
    const { altitudeHoldPGain, altitudeHoldDGain } = config.flightController;
    if (altitudeHoldPGain !== undefined && (altitudeHoldPGain < 0.5 || altitudeHoldPGain > 8.0)) {
      warnings.push({
        code: "UNSTABLE_PID_P_GAIN",
        field: "flightController.altitudeHoldPGain",
        severity: "WARNING",
        message: `Altitude Hold P-Gain (${altitudeHoldPGain}) is outside the safe envelope [0.5 - 8.0]. Oscillations or sluggishness may occur.`,
      });
    }
    if (altitudeHoldDGain !== undefined && (altitudeHoldDGain < 0.5 || altitudeHoldDGain > 8.0)) {
      warnings.push({
        code: "UNSTABLE_PID_D_GAIN",
        field: "flightController.altitudeHoldDGain",
        severity: "WARNING",
        message: `Altitude Hold D-Gain (${altitudeHoldDGain}) is outside the safe envelope [0.5 - 8.0]. Oscillations or sluggishness may occur.`,
      });
    }
  }

  const imu = config.sensors?.find((s) => s.type === "IMU");
  if (!imu || !imu.enabled) {
    warnings.push({
      code: "IMU_OFFLINE",
      field: "sensors.IMU",
      severity: "WARNING",
      message: "IMU sensor is disabled or missing. Self-leveling stabilization unavailable.",
      educationalFixAdvice: "Enable the IMU for stabilized flight control.",
    });
  }

  const baro = config.sensors?.find((s) => s.type === "BAROMETER");
  if (!baro || !baro.enabled) {
    infos.push({
      code: "BARO_DISABLED",
      field: "sensors.BAROMETER",
      severity: "INFO",
      message: "Barometer is offline. Altitude hold will rely solely on GNSS.",
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    infos,
  };
}
