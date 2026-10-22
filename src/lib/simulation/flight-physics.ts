// ==========================================================
// DRONE PILOT — FLIGHT PHYSICS ENGINE (MASTER SIMULATION PHASE)
// Deterministic 6-DoF Multirotor Aerodynamic & Dynamic Solver
// Integrates Motor Mixing, LiPo Battery Sag, Environmental
// Wind Forces, Payload Mass, and Ground/Obstacle Collision.
// ==========================================================

import {
  DroneDefinition,
  FlightInput,
  TelemetryState,
  FlightMode,
  EnvironmentState,
  CrashState,
  PhysicsDebugTelemetry,
} from "./types";
import { MotorMixer } from "./motor-mixer";
import { BatteryModel } from "./battery-model";
import { EnvironmentModel } from "./environment-model";
import { checkObstacleCollision } from "./obstacles";

export class FlightPhysicsEngine {
  public def: DroneDefinition;
  public battery: BatteryModel;
  public environment: EnvironmentModel;

  // Rigid Body State
  public posX = 0;
  public posY = 1.445; // resting on top of raised helipad platform
  public posZ = 0;

  public velX = 0;
  public velY = 0;
  public velZ = 0;

  public pitch = 0; // tilt along lateral axis (radians)
  public roll = 0;  // tilt along longitudinal axis (radians)
  public yaw = 0;   // compass heading (radians)

  public pitchRate = 0;
  public rollRate = 0;
  public yawRate = 0;

  // Accelerations for debug telemetry
  public accelX = 0;
  public accelY = 0;
  public accelZ = 0;

  // Aerodynamic Forces for debug
  public windForceX = 0;
  public windForceY = 0;
  public windForceZ = 0;
  public dragForceX = 0;
  public dragForceY = 0;
  public dragForceZ = 0;
  public totalThrust = 0;

  // System State
  public isArmed = false;
  public flightTime = 0.0;
  public isHoverMode = true;
  public groundLevel = 1.445;
  public targetAltitude = 1.445;
  public isAutoLanding = false;
  public payloadMass = 0.0; // kg

  // Runtime experiment controls: health/failure and command multipliers (0.0 to 1.0)
  public motorHealth: number[] = [1, 1, 1, 1, 1, 1, 1, 1];
  public motorOverrides: Array<number | null> = [null, null, null, null, null, null, null, null];

  // Phase 5: Avionics Sensor Health & Fault States
  public sensorHealth = {
    gps: true,
    imu: true,
    baro: true,
    compass: true,
  };
  public turbulenceFactor = 0.0;

  // Motor outputs [0.0 - 1.0]
  public motorOutputs: number[] = [0, 0, 0, 0];
  public rotorRpm = 0;
  public elevationQueryFn?: (x: number, z: number) => number;

  // Crash State
  public crashState: CrashState | null = null;
  public isCeilingLimitReached = false;
  public isGroundLimitReached = false;

  // Home / Takeoff Coordinates for Return-to-Home (RTL)
  public homeX = 0;
  public homeY = 1.445;
  public homeZ = 0;

  // Commercial UAS Fail-Safe: Return-To-Home (RTH / RTL)
  public isRtlActive = false;
  public rtlStage: "CLIMB" | "TRANSIT" | "DESCENT" | "LANDED" = "CLIMB";
  public rtlClearanceAltitudeAgl = 20.0; // 20m safe transit altitude above ground

  // 3D Geo-Fence Containment Envelope (Civil Aviation Part 107 standard)
  public geoFenceMaxRadius = 1000.0; // 1000m radius limit from home
  public geoFenceMaxAltitudeAgl = 120.0; // 120m (400ft) FAA ceiling limit
  public isGeoFenceWarning = false;
  public isGeoFenceBreached = false;

  // Breadcrumbs path history
  private breadcrumbs: Array<{ x: number; z: number }> = [{ x: 0, z: 0 }];
  private lastBreadcrumbTime = 0;

  constructor(definition: DroneDefinition) {
    this.def = definition;
    this.battery = new BatteryModel(definition.batteryCapacity, definition.batteryCells || 4);
    this.environment = new EnvironmentModel();
    this.reset();
  }

  public setDefinition(def: DroneDefinition) {
    this.def = def;
    this.battery = new BatteryModel(def.batteryCapacity, def.batteryCells || 4);
  }

  public setPayloadMass(kg: number) {
    if (!Number.isFinite(kg)) return;
    this.payloadMass = Math.max(0, Math.min(this.def.payloadCapacity * 1.5, kg));
  }

  public setMotorHealth(motorIndex: number, health: number) {
    if (motorIndex >= 0 && motorIndex < this.motorHealth.length && Number.isFinite(health)) {
      this.motorHealth[motorIndex] = Math.max(0, Math.min(1.0, health));
    }
  }

  public setMotorOverride(motorIndex: number, override: number | null) {
    if (motorIndex >= 0 && motorIndex < this.motorOverrides.length && (override === null || Number.isFinite(override))) {
      this.motorOverrides[motorIndex] = override !== null ? Math.max(0, Math.min(1.0, override)) : null;
    }
  }

  public setSensorHealth(sensors: Partial<{ gps: boolean; imu: boolean; baro: boolean; compass: boolean }>) {
    this.sensorHealth = { ...this.sensorHealth, ...sensors };
  }

  public setTurbulence(turbulence: number) {
    this.turbulenceFactor = Math.max(0, Math.min(1.0, turbulence));
  }

  public setEnvironment(env: EnvironmentState) {
    this.environment.setState(env);
    this.battery.setTemperature(env.temperature);
  }

  public resetCrash() {
    this.crashState = null;
  }

  public reset(spawnX = 0, spawnY?: number, spawnZ = 0, spawnYaw = 0) {
    if (spawnY !== undefined) {
      this.groundLevel = spawnY;
    } else if (this.elevationQueryFn) {
      this.groundLevel = this.elevationQueryFn(spawnX, spawnZ) + 0.245;
    } else {
      this.groundLevel = 1.445;
    }

    this.posX = spawnX;
    this.posY = this.groundLevel;
    this.posZ = spawnZ;
    this.yaw = spawnYaw;

    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;

    this.pitch = 0;
    this.roll = 0;

    this.pitchRate = 0;
    this.rollRate = 0;
    this.yawRate = 0;

    this.accelX = 0;
    this.accelY = 0;
    this.accelZ = 0;

    this.isArmed = false;
    this.flightTime = 0.0;
    this.isHoverMode = true;
    this.targetAltitude = this.groundLevel;
    this.isAutoLanding = false;
    this.rotorRpm = 0;
    this.motorOutputs = new Array(this.def.motorCount).fill(0);
    this.crashState = null;
    this.isCeilingLimitReached = false;
    this.isGroundLimitReached = false;
    this.homeX = spawnX;
    this.homeY = this.groundLevel;
    this.homeZ = spawnZ;
    this.isRtlActive = false;
    this.rtlStage = "CLIMB";
    this.isGeoFenceWarning = false;
    this.isGeoFenceBreached = false;

    this.breadcrumbs = [{ x: Math.round(spawnX), z: Math.round(spawnZ) }];
    this.lastBreadcrumbTime = 0;
  }

  public triggerAutoLand() {
    if (this.posY > this.groundLevel + 0.05 && !this.crashState) {
      this.isAutoLanding = !this.isAutoLanding;
      if (this.isAutoLanding) this.isRtlActive = false;
    }
  }

  public triggerRTL() {
    if (this.crashState || !this.isArmed) return;
    if (this.isRtlActive) {
      this.isRtlActive = false;
      this.isAutoLanding = false;
      this.isHoverMode = true;
      this.targetAltitude = this.posY;
    } else {
      this.isRtlActive = true;
      this.isAutoLanding = false;
      this.isHoverMode = true;
      const currentAgl = Math.max(0, this.posY - this.groundLevel);
      if (currentAgl < this.rtlClearanceAltitudeAgl) {
        this.rtlStage = "CLIMB";
        this.targetAltitude = this.groundLevel + this.rtlClearanceAltitudeAgl;
      } else {
        this.rtlStage = "TRANSIT";
        this.targetAltitude = this.posY;
      }
    }
  }

  public getMotorOutputs(): number[] {
    return [...this.motorOutputs];
  }

  /**
   * Main 6-DoF Physics Step
   */
  public update(input: FlightInput, dt: number): TelemetryState {
    const clampedDt = Math.min(dt, 0.05);

    if (input.reset) {
      this.reset();
    }

    // Post-Crash Tumbling Physics
    if (this.crashState?.isCrashed) {
      // Still apply gravity and momentum
      this.velY -= 9.81 * clampedDt;
      this.posX += this.velX * clampedDt;
      this.posY += this.velY * clampedDt;
      this.posZ += this.velZ * clampedDt;
      
      this.pitch += this.pitchRate * clampedDt;
      this.roll += this.rollRate * clampedDt;
      this.yaw += this.yawRate * clampedDt;
      
      // Dynamic ground elevation query for tumbling
      let surfaceElevation = 0.0;
      if (this.elevationQueryFn) {
        surfaceElevation = Math.max(0.0, this.elevationQueryFn(this.posX, this.posZ));
      }
      this.groundLevel = surfaceElevation + 0.245;

      if (this.posY <= this.groundLevel) {
        this.posY = this.groundLevel;
        if (this.velY < -0.5) {
          // Bounce
          this.velY = Math.abs(this.velY) * 0.4;
          this.velX *= 0.7;
          this.velZ *= 0.7;
          this.pitchRate *= 0.6;
          this.rollRate *= 0.6;
          this.yawRate *= 0.6;
        } else {
          // Settle
          this.velY = 0;
          this.velX *= 0.8;
          this.velZ *= 0.8;
          this.pitchRate *= 0.8;
          this.rollRate *= 0.8;
          this.yawRate *= 0.8;
        }
      }
      return this.generateTelemetry();
    }

    // Dynamic ground elevation query
    let surfaceElevation = 0.0;
    if (this.elevationQueryFn) {
      surfaceElevation = Math.max(0.0, this.elevationQueryFn(this.posX, this.posZ));
    }
    this.groundLevel = surfaceElevation + 0.245;

    // Hard floor clamp: drone can NEVER penetrate below terrain or water surface
    if (this.posY < this.groundLevel) {
      this.posY = this.groundLevel;
      if (this.velY < 0) this.velY = 0;
    }

    const onGround = this.posY <= this.groundLevel + 0.02;

    // Ground limit advisory: if pilot commands throttle down while already touching ground
    if (onGround && input.throttle < -0.05) {
      this.isGroundLimitReached = true;
    } else {
      this.isGroundLimitReached = false;
    }

    // Auto-arm on throttle or stick input
    if (!this.isArmed) {
      if (input.throttle > 0.1 || Math.abs(input.pitch) > 0.1 || Math.abs(input.roll) > 0.1 || Math.abs(input.yaw) > 0.1) {
        this.isArmed = true;
      }
    }

    if (this.isAutoLanding) {
      if (Math.abs(input.throttle) > 0.2 || Math.abs(input.pitch) > 0.2 || Math.abs(input.roll) > 0.2) {
        this.isAutoLanding = false;
      }
    }

    // Pilot Manual Override of Return-to-Home
    if (this.isRtlActive) {
      if (Math.abs(input.throttle) > 0.25 || Math.abs(input.pitch) > 0.25 || Math.abs(input.roll) > 0.25) {
        this.isRtlActive = false;
        this.isHoverMode = true;
        this.targetAltitude = this.posY;
      }
    }

    // Autonomous Low-Battery Return-to-Home Fail-safe (<= 20% state of charge)
    if (this.isArmed && !onGround && !this.crashState && !this.isRtlActive && !this.isAutoLanding) {
      if (this.battery.getPercentage() <= 20.0) {
        this.isRtlActive = true;
        this.isHoverMode = true;
        const currentAgl = Math.max(0, this.posY - this.groundLevel);
        if (currentAgl < this.rtlClearanceAltitudeAgl) {
          this.rtlStage = "CLIMB";
          this.targetAltitude = this.groundLevel + this.rtlClearanceAltitudeAgl;
        } else {
          this.rtlStage = "TRANSIT";
          this.targetAltitude = this.posY;
        }
      }
    }

    // ----------------------------------------------------
    // 1. MASS, WEIGHT & HOVER EQUILIBRIUM
    // ----------------------------------------------------
    const g = 9.81; // m/s^2
    const totalMass = this.def.mass + this.payloadMass;
    const hoverWeight = totalMass * g; // Newtons

    // ----------------------------------------------------
    // 2. MOTOR MIXING & COMMAND DISPATCH
    // ----------------------------------------------------
    let commandedThrottle = 0;

    if (this.isArmed) {
      this.flightTime += clampedDt;

      if (this.isRtlActive) {
        const dx = this.homeX - this.posX;
        const dz = this.homeZ - this.posZ;
        const distToHome = Math.hypot(dx, dz);
        const currentAgl = Math.max(0, this.posY - this.groundLevel);
        const targetTransitAlt = this.homeY + this.rtlClearanceAltitudeAgl;

        if (this.rtlStage === "CLIMB") {
          // Stage 1: Climb to safe clearance altitude
          if (this.posY < targetTransitAlt - 0.4) {
            this.velY += (2.2 - this.velY) * (clampedDt * 4.5);
            this.velX *= 0.82;
            this.velZ *= 0.82;
            commandedThrottle = (hoverWeight / this.def.maximumThrust) * 1.15;
          } else {
            this.rtlStage = "TRANSIT";
          }
        } else if (this.rtlStage === "TRANSIT") {
          // Stage 2: Transit horizontally toward Home takeoff coordinates
          if (distToHome > 1.8) {
            const transitSpeed = Math.min(7.0, Math.max(1.8, distToHome * 0.45));
            const targetVx = (dx / distToHome) * transitSpeed;
            const targetVz = (dz / distToHome) * transitSpeed;
            this.velX += (targetVx - this.velX) * (clampedDt * 2.8);
            this.velZ += (targetVz - this.velZ) * (clampedDt * 2.8);

            // Maintain safe transit altitude
            const altDiff = targetTransitAlt - this.posY;
            this.velY += (altDiff * 1.8 - this.velY) * (clampedDt * 3.5);
            commandedThrottle = (hoverWeight / this.def.maximumThrust);
          } else {
            // Arrived over home origin
            this.rtlStage = "DESCENT";
          }
        } else if (this.rtlStage === "DESCENT") {
          // Stage 3: Controlled vertical auto-land over home origin
          this.velX *= 0.82;
          this.velZ *= 0.82;
          const targetDescentSpeed = currentAgl > 3.0 ? -1.3 : -0.55;
          this.velY += (targetDescentSpeed - this.velY) * (clampedDt * 4.5);
          commandedThrottle = (hoverWeight / this.def.maximumThrust) * 0.90;
        }
      } else if (this.isAutoLanding) {
        const currentAlt = Math.max(0, this.posY - this.groundLevel);
        const targetDescentSpeed = currentAlt > 3.0 ? -1.4 : -0.65;
        this.velY += (targetDescentSpeed - this.velY) * (clampedDt * 5.0);
        this.velX *= 0.88;
        this.velZ *= 0.88;
        commandedThrottle = (hoverWeight / this.def.maximumThrust) * 0.92;
      } else if (this.isHoverMode) {
        // Tilt thrust compensation: auto-boosts collective thrust when pitched/rolled
        // so that Ty = T * cos(pitch) * cos(roll) == mg, maintaining level altitude
        const cosTilt = Math.max(0.40, Math.cos(this.pitch) * Math.cos(this.roll));
        const tiltCompensation = 1.0 / cosTilt;
        const baseHoverThrottle = (hoverWeight / this.def.maximumThrust) * tiltCompensation;

        if (Math.abs(input.throttle) > 0.05) {
          // Pilot is commanding manual climb or descent
          const verticalDelta = input.throttle * (input.throttle > 0 ? (1.0 - (hoverWeight / this.def.maximumThrust)) * 0.85 : 0.45);
          commandedThrottle = baseHoverThrottle + verticalDelta;
          this.targetAltitude = this.posY;
        } else if (!onGround) {
          // Closed-loop altitude hold: locks altitude when moving forward/backward/sideways
          if (this.targetAltitude < this.groundLevel + 0.1) {
            this.targetAltitude = this.posY;
          }
          const altError = this.targetAltitude - this.posY;
          // PD altitude regulator
          const rawPGain = this.def.altitudeHoldPGain ?? 3.5;
          const rawDGain = this.def.altitudeHoldDGain ?? 2.8;
          const pGain = Math.max(0.5, Math.min(8.0, rawPGain));
          const dGain = Math.max(0.5, Math.min(8.0, rawDGain));
          const altCorrection = ((altError * pGain - this.velY * dGain) * totalMass) / this.def.maximumThrust;
          commandedThrottle = baseHoverThrottle + Math.max(-0.30, Math.min(0.45, altCorrection));
        } else {
          commandedThrottle = baseHoverThrottle * 0.5;
          this.targetAltitude = this.posY;
        }
      } else {
        commandedThrottle = Math.max(0, (input.throttle + 1) / 2);
      }
    }

    // Apply battery authority (voltage sag throttles max output)
    const thrustAuth = this.battery.getThrustAuthority();
    commandedThrottle *= thrustAuth;

    const forwardX = -Math.sin(this.yaw);
    const forwardZ = -Math.cos(this.yaw);
    const rightX = Math.cos(this.yaw);
    const rightZ = -Math.sin(this.yaw);

    let effPitch = this.isAutoLanding ? 0 : input.pitch;
    let effRoll = this.isAutoLanding ? 0 : input.roll;

    if (this.isRtlActive) {
      if (this.rtlStage === "TRANSIT") {
        const localVelForward = this.velX * forwardX + this.velZ * forwardZ;
        const localVelRight = this.velX * rightX + this.velZ * rightZ;
        effPitch = Math.max(-0.6, Math.min(0.6, -localVelForward * 0.12));
        effRoll = Math.max(-0.6, Math.min(0.6, -localVelRight * 0.12));
      } else {
        effPitch = 0;
        effRoll = 0;
      }
    } else if (this.isHoverMode && !onGround && this.sensorHealth.gps) {
      const isStickNeutral = Math.abs(input.pitch) < 0.04 && Math.abs(input.roll) < 0.04;
      if (isStickNeutral) {
        const localVelForward = this.velX * forwardX + this.velZ * forwardZ;
        const localVelRight = this.velX * rightX + this.velZ * rightZ;
        effPitch = Math.max(-1.0, Math.min(1.0, -localVelForward * 0.16));
        effRoll = Math.max(-1.0, Math.min(1.0, -localVelRight * 0.16));
      }
    }

    // Mix commands into individual motors
    this.motorOutputs = MotorMixer.mix(
      {
        throttle: commandedThrottle,
        pitch: effPitch,
        roll: effRoll,
        yaw: input.yaw,
      },
      this.def.type,
      this.def.motors
    );

    // Phase 5: Apply individual motor health degradation & manual RPM/throttle overrides
    for (let i = 0; i < this.motorOutputs.length; i++) {
      const h = this.motorHealth[i] !== undefined ? this.motorHealth[i] : 1.0;
      const override = this.motorOverrides[i] !== undefined ? this.motorOverrides[i] : null;
      const commandMultiplier = override !== null ? override : 1.0;
      // Overrides are multipliers, preserving the mixer/controller command while
      // allowing a learner to reduce one motor within physical output limits.
      this.motorOutputs[i] = this.motorOutputs[i] * commandMultiplier * Math.max(0, h);
    }

    // Phase 5: Calculate physical asymmetric torque from unequal motor thrusts
    let asymTorqueRoll = 0;
    let asymTorquePitch = 0;
    const maxThrustPerMotor = this.def.maximumThrust / Math.max(1, this.def.motorCount);

    for (let i = 0; i < this.motorOutputs.length; i++) {
      const mDef = this.def.motors[i];
      if (mDef) {
        const mThrust = Math.pow(this.motorOutputs[i], 2) * maxThrustPerMotor;
        // Motor on +X produces left roll (-roll), on -X produces right roll (+roll)
        asymTorqueRoll += -mDef.position.x * mThrust;
        // Motor on +Z produces pitch down (-pitch), on -Z produces pitch up (+pitch)
        asymTorquePitch += mDef.position.z * mThrust;
      }
    }
    const rawRollPert = (asymTorqueRoll / Math.max(0.1, this.def.inertia.roll)) * 0.02;
      const asymRollPerturbation = Math.max(-0.25, Math.min(0.25, rawRollPert));
    const rawPitchPert = (asymTorquePitch / Math.max(0.1, this.def.inertia.pitch)) * 0.02;
      const asymPitchPerturbation = Math.max(-0.25, Math.min(0.25, rawPitchPert));

    // Sum collective thrust
    let sumThrustFactor = 0;
    for (let i = 0; i < this.motorOutputs.length; i++) {
      sumThrustFactor += this.motorOutputs[i];
    }
    const avgThrottle = this.motorOutputs.length > 0 ? sumThrustFactor / this.motorOutputs.length : 0;
    
    // Phase 1 Polish: Ground Effect Simulation
    const agl = Math.max(0, this.posY - this.groundLevel);
    let geMultiplier = 1.0;
    if (agl < 1.2 && !this.crashState) {
       // Ground effect boosts thrust by up to 25% when very close to the ground
       geMultiplier = 1.0 + (0.25 * Math.pow(1.0 - (agl / 1.2), 2));
    }
    
    this.totalThrust = avgThrottle * this.def.maximumThrust * geMultiplier;

    // ----------------------------------------------------
    // 3. ELECTRICAL BATTERY DRAIN (OHM'S LAW + MOTOR CURRENT)
    // ----------------------------------------------------
    const motorCount = this.def.motorCount;
    const maxAmpsPerMotor = 12.0; // typical 4S brushless motor draw
    let totalCurrentAmps = 0.8; // avionics baseline

    if (this.isArmed) {
      for (let i = 0; i < motorCount; i++) {
        totalCurrentAmps += 0.4 + Math.pow(this.motorOutputs[i], 1.8) * maxAmpsPerMotor;
      }
    }
    this.battery.update(totalCurrentAmps, clampedDt);

    // Update rotor RPM telemetry
    const targetRpm = onGround && input.throttle <= 0 ? 20 : avgThrottle * 100;
    this.rotorRpm += (targetRpm - this.rotorRpm) * (clampedDt * 8.0);

    // ----------------------------------------------------
    // 4. ATTITUDE (PITCH, ROLL, YAW) WITH ASYMMETRIC TORQUE & SENSOR FAULTS
    // ----------------------------------------------------
    const targetYawRate = -input.yaw * 2.4;
    this.yawRate += (targetYawRate - this.yawRate) * (clampedDt * 10.0);
    this.yaw += this.yawRate * clampedDt;

    if (this.yaw > Math.PI * 2) this.yaw -= Math.PI * 2;
    if (this.yaw < 0) this.yaw += Math.PI * 2;

    // Dynamic tilt authority: Reduced for cinematic professional smoothness
    const tiltMultiplier = this.isHoverMode ? 1.0 : 1.15;
    const targetPitch = effPitch * this.def.maxTiltAngle * tiltMultiplier + asymPitchPerturbation;
    const targetRoll = effRoll * this.def.maxTiltAngle * tiltMultiplier + asymRollPerturbation;

    const tiltSpeed = 14.0;
    this.pitch += (targetPitch - this.pitch) * (clampedDt * tiltSpeed);
    this.roll += (targetRoll - this.roll) * (clampedDt * tiltSpeed);

    // Phase 5: IMU Degradation / Gyro Noise Perturbation
    if (!this.sensorHealth.imu && !onGround) {
      const imuNoisePitch = Math.sin(this.flightTime * 7.5) * 0.06 + Math.cos(this.flightTime * 13.2) * 0.03;
      const imuNoiseRoll = Math.cos(this.flightTime * 6.8) * 0.06 + Math.sin(this.flightTime * 11.9) * 0.03;
      this.pitch += imuNoisePitch * clampedDt * 8.0;
      this.roll += imuNoiseRoll * clampedDt * 8.0;
    }    // Phase 5: Atmospheric Turbulence Attitude Disturbance
    const baseTurbulence = this.environment.getState().turbulence || 0;
    // Map high wind speeds to severe physical turbulence
    const windTurbulence = (this.environment.getState().windSpeed / 30.0) * 0.45; 
    const turb = baseTurbulence + this.turbulenceFactor + windTurbulence;
    if (turb > 0.05 && !onGround) {
      const turbPitch = (Math.sin(this.flightTime * 9.3) + Math.cos(this.flightTime * 17.1) * 0.5) * (turb * 0.14);
      const turbRoll = (Math.cos(this.flightTime * 8.7) + Math.sin(this.flightTime * 15.4) * 0.5) * (turb * 0.14);
      this.pitch += turbPitch * clampedDt * 6.0;
      this.roll += turbRoll * clampedDt * 6.0;
    }

    // Phase 5: Barometer Failure Altitude Hunting
    if (!this.sensorHealth.baro && this.isHoverMode && !onGround) {
      this.targetAltitude += Math.sin(this.flightTime * 0.9) * (clampedDt * 1.8);
    }

    // ----------------------------------------------------
    // 5. ENVIRONMENTAL AERODYNAMIC FORCES (WIND & DRAG)
    // ----------------------------------------------------
    const windVec = this.environment.getInstantaneousWind(clampedDt);
    const airDensity = this.environment.getAirDensity();

    // Relative airspeed: V_rel = V_drone - V_wind
    const relVx = this.velX - windVec.x;
    const relVy = this.velY - windVec.y;
    const relVz = this.velZ - windVec.z;

    // Phase 2: True Aerodynamic Drag based on Tilt Projection
    // When tilted, the large top plate and rotors act like a sail, drastically increasing wind resistance.
    const tiltExposedArea = Math.max(0.15, Math.abs(Math.sin(this.pitch)) + Math.abs(Math.sin(this.roll)));
    const verticalExposedArea = Math.max(0.15, Math.abs(Math.cos(this.pitch)) * Math.abs(Math.cos(this.roll)));
    
    const baseArea = this.def.drag.linear * 0.55;
    const aeroFactorHorizontal = 0.5 * airDensity * (baseArea * (1.0 + 3.5 * tiltExposedArea));
    const aeroFactorVertical = 0.5 * airDensity * (baseArea * (1.0 + 4.5 * verticalExposedArea));

    this.dragForceX = -relVx * Math.abs(relVx) * aeroFactorHorizontal;
    this.dragForceY = -relVy * Math.abs(relVy) * aeroFactorVertical;
    this.dragForceZ = -relVz * Math.abs(relVz) * aeroFactorHorizontal;

    this.windForceX = windVec.x * Math.abs(windVec.x) * aeroFactorHorizontal;
    this.windForceY = windVec.y * Math.abs(windVec.y) * aeroFactorVertical;
    this.windForceZ = windVec.z * Math.abs(windVec.z) * aeroFactorHorizontal;    // ----------------------------------------------------
    // 6. THRUST FORCES IN WORLD FRAME
    // ----------------------------------------------------
    // Forward and Right vectors already calculated above

    const thrustWorldX = (forwardX * Math.sin(this.pitch) + rightX * Math.sin(this.roll)) * this.totalThrust;
    const thrustWorldZ = (forwardZ * Math.sin(this.pitch) + rightZ * Math.sin(this.roll)) * this.totalThrust;
    const thrustWorldY = this.totalThrust * Math.cos(this.pitch) * Math.cos(this.roll);

    // Total Accelerations: a = F_net / m
    this.accelX = (thrustWorldX + this.dragForceX) / totalMass;
    this.accelY = (thrustWorldY - hoverWeight + this.dragForceY) / totalMass;
    this.accelZ = (thrustWorldZ + this.dragForceZ) / totalMass;

    // Integrate Velocities
    this.velX += this.accelX * clampedDt;
    this.velY += this.accelY * clampedDt;
    this.velZ += this.accelZ * clampedDt;

    // Integrate Positions
    this.posX += this.velX * clampedDt;
    this.posY += this.velY * clampedDt;
    this.posZ += this.velZ * clampedDt;

    // Dynamic ground elevation query at new coordinates
    if (this.elevationQueryFn) {
      this.groundLevel = Math.max(0.0, this.elevationQueryFn(this.posX, this.posZ)) + 0.245;
    }

    // Absolute hard ground/water floor clamp - zero penetration
    if (this.posY < this.groundLevel) {
      this.posY = this.groundLevel;
      if (this.velY < 0) this.velY = 0;
    }

    // Enforce strict flight ceiling (250m MSL)
    const MAX_FLIGHT_CEILING = 250.0;
    if (this.posY >= MAX_FLIGHT_CEILING) {
      this.posY = MAX_FLIGHT_CEILING;
      if (this.velY > 0) this.velY = 0;
      if (input.throttle > 0.05) {
        this.isCeilingLimitReached = true;
      } else {
        this.isCeilingLimitReached = false;
      }
    } else {
      this.isCeilingLimitReached = false;
    }

    // ----------------------------------------------------
    // 7. GROUND & OBSTACLE COLLISION DETECTION
    // ----------------------------------------------------
    // Check 3D Building, Skyscraper, Bridge, Windmill & Tower Collisions
    const obsHit = checkObstacleCollision(this.posX, this.posY, this.posZ, 0.55);
    if (obsHit) {
      const impactSpeed = Math.max(2.0, Math.sqrt(this.velX * this.velX + this.velY * this.velY + this.velZ * this.velZ));
      const kineticEnergy = 0.5 * totalMass * impactSpeed * impactSpeed;
      const objectLabel = obsHit.type === "skyscraper" || obsHit.type === "building" || obsHit.type === "warehouse"
        ? "building"
        : obsHit.type;

      this.posY = Math.max(this.groundLevel, this.posY);
      this.crashState = {
        isCrashed: true,
        impactSpeedKmh: Math.round(impactSpeed * 3.6 * 10) / 10,
        impactSpeedMs: Math.round(impactSpeed * 10) / 10,
        impactLocation: { x: this.posX, y: this.posY, z: this.posZ },
        kineticEnergyJoules: Math.round(kineticEnergy),
        primaryCause: `You have crashed into a ${objectLabel}! (${obsHit.name})`,
        impactNormal: { x: 0, y: 1, z: 0 },
        timestamp: Date.now(),
      };

      this.velX = 0;
      this.velY = 0;
      this.velZ = 0;
      this.isArmed = false;
      return this.generateTelemetry();
    }

    if (this.posY <= this.groundLevel) {
      this.posY = this.groundLevel;
      if (this.velY < 0) this.velY = 0;
      const impactSpeed = Math.sqrt(this.velX * this.velX + this.velY * this.velY + this.velZ * this.velZ);
      const tiltAngleDeg = Math.max(Math.abs(this.pitch), Math.abs(this.roll)) * (180 / Math.PI);

      // Crash Criteria: Hard impact (> 6.2 m/s) or extreme tilt (> 42°)
      if (impactSpeed > 6.2 || (impactSpeed > 3.0 && tiltAngleDeg > 42)) {
        const kineticEnergy = 0.5 * totalMass * impactSpeed * impactSpeed;
        let cause = "You have crashed into the ground! (Excessive vertical descent rate)";
        if (tiltAngleDeg > 42) cause = `You have crashed into the terrain! (Loss of control at ${tiltAngleDeg.toFixed(0)}° bank angle)`;
        else if (Math.abs(this.velX) + Math.abs(this.velZ) > 5.0) cause = "You have crashed into the terrain! (High-speed horizontal impact)";

        this.crashState = {
          isCrashed: true,
          impactSpeedKmh: Math.round(impactSpeed * 3.6 * 10) / 10,
          impactSpeedMs: Math.round(impactSpeed * 10) / 10,
          impactLocation: { x: this.posX, y: this.groundLevel, z: this.posZ },
          kineticEnergyJoules: Math.round(kineticEnergy),
          primaryCause: cause,
          impactNormal: { x: 0, y: 1, z: 0 },
          timestamp: Date.now(),
        };

        this.velX = 0;
        this.velY = 0;
        this.velZ = 0;
        this.isArmed = false;
        return this.generateTelemetry();
      }

      // Normal Touchdown
      this.posY = this.groundLevel;
      if (this.velY < 0) this.velY = 0;
      this.velX *= 0.88;
      this.velZ *= 0.88;
      this.pitch *= 0.85;
      this.roll *= 0.85;

      if (this.isAutoLanding) {
        this.isAutoLanding = false;
        this.isArmed = false;
      }
      if (this.isRtlActive) {
        this.isRtlActive = false;
        this.rtlStage = "LANDED";
        this.isArmed = false;
      }
      if (input.throttle < -0.6) {
        this.isArmed = false;
      }
    }

    // ----------------------------------------------------
    // 8. 3D GEO-FENCE CONTAINMENT (FAA PART 107 COMPLIANCE)
    // ----------------------------------------------------
    const currentAgl = Math.max(0, this.posY - this.groundLevel);
    // 1. Vertical Ceiling Fence (120m AGL)
    if (currentAgl >= this.geoFenceMaxAltitudeAgl) {
      this.posY = this.groundLevel + this.geoFenceMaxAltitudeAgl;
      if (this.velY > 0) this.velY = 0;
      this.isCeilingLimitReached = true;
    } else {
      this.isCeilingLimitReached = false;
    }

    // 2. Horizontal Radius Fence (1000m from Home)
    const distFromHome = Math.hypot(this.posX - this.homeX, this.posZ - this.homeZ);
    if (distFromHome >= this.geoFenceMaxRadius * 0.88) {
      this.isGeoFenceWarning = true;
    } else {
      this.isGeoFenceWarning = false;
    }

    if (distFromHome >= this.geoFenceMaxRadius) {
      this.isGeoFenceBreached = true;
      // Active soft-boundary deceleration and containment pushback towards home
      const normX = (this.posX - this.homeX) / distFromHome;
      const normZ = (this.posZ - this.homeZ) / distFromHome;
      this.posX = this.homeX + normX * this.geoFenceMaxRadius;
      this.posZ = this.homeZ + normZ * this.geoFenceMaxRadius;
      this.velX *= -0.3;
      this.velZ *= -0.3;
    } else {
      this.isGeoFenceBreached = false;
    }

    // Island Airspace Boundary Constraints (2000m x 1800m island)
    const maxBound = 1180.0;
    if (Math.abs(this.posX) > maxBound) {
      this.posX = Math.sign(this.posX) * maxBound;
      this.velX *= -0.3;
    }
    if (Math.abs(this.posZ) > maxBound) {
      this.posZ = Math.sign(this.posZ) * maxBound;
      this.velZ *= -0.3;
    }

    // Breadcrumbs tracking
    if (this.flightTime - this.lastBreadcrumbTime > 0.5) {
      const last = this.breadcrumbs[this.breadcrumbs.length - 1];
      const dist = last ? Math.hypot(this.posX - last.x, this.posZ - last.z) : 999;
      if (dist > 2.5) {
        this.breadcrumbs.push({ x: Math.round(this.posX * 10) / 10, z: Math.round(this.posZ * 10) / 10 });
        if (this.breadcrumbs.length > 250) {
          this.breadcrumbs.shift();
        }
        this.lastBreadcrumbTime = this.flightTime;
      }
    }

    return this.generateTelemetry();
  }

  public generateTelemetry(): TelemetryState {
    const horizontalSpeedMs = Math.hypot(this.velX, this.velZ);
    const groundSpeedKmh = Math.round(horizontalSpeedMs * 3.6 * 10) / 10;
    const altitudeMeters = Math.max(0, Math.round((this.posY - this.groundLevel) * 10) / 10);
    const altitudeMsl = Math.round(this.posY * 10) / 10;
    const verticalSpeedMs = Math.round(this.velY * 10) / 10;
    const headingDeg = Math.round((((this.yaw * 180) / Math.PI) % 360 + 360) % 360);
    const distFromHome = Math.round(Math.hypot(this.posX - this.homeX, this.posZ - this.homeZ) * 10) / 10;

    let flightMode: FlightMode = "HOVER";
    if (this.crashState?.isCrashed) {
      flightMode = "LANDED";
    } else if (this.posY <= this.groundLevel + 0.05 && Math.abs(horizontalSpeedMs) < 0.2) {
      flightMode = "LANDED";
    } else if (this.isRtlActive) {
      flightMode = "RTH";
    } else if (this.isAutoLanding) {
      flightMode = "AUTO LAND";
    } else if (!this.isHoverMode) {
      flightMode = "MANUAL";
    }

    const battState = this.battery.update(0, 0);

    return {
      position: { x: this.posX, y: this.posY, z: this.posZ },
      velocity: { x: this.velX, y: this.velY, z: this.velZ },
      rotation: { pitch: this.pitch, roll: this.roll, yaw: this.yaw },
      altitude: altitudeMeters,
      altitudeMsl,
      groundSpeed: groundSpeedKmh,
      verticalSpeed: verticalSpeedMs,
      heading: headingDeg,
      batteryLevel: Math.round(battState.percentage),
      batteryVoltage: battState.terminalVoltage,
      batteryCurrentAmps: battState.currentAmps,
      batteryPowerWatts: Math.round(battState.powerWatts),
      flightTimeSeconds: Math.floor(this.flightTime),
      flightMode,
      isArmed: this.isArmed && !this.crashState?.isCrashed,
      rotorRpmPercent: Math.round(this.rotorRpm),
      motorOutputs: [...this.motorOutputs],
      motorHealths: [...this.motorHealth.slice(0, this.def.motorCount)],
      motorRpms: this.motorOutputs.map((o) => Math.round(o * 12000)),
      distanceFromHome: distFromHome,
      flightPath: this.breadcrumbs,
      payloadMassKg: this.payloadMass,
      totalMassKg: Math.round((this.def.mass + this.payloadMass) * 100) / 100,
      isCrashed: !!this.crashState?.isCrashed,
      isCeilingLimitReached: this.isCeilingLimitReached,
      isGroundLimitReached: this.isGroundLimitReached,
      isRtlActive: this.isRtlActive,
      rtlStage: this.rtlStage,
      isGeoFenceWarning: this.isGeoFenceWarning,
      isGeoFenceBreached: this.isGeoFenceBreached,
      sensorHealth: { ...this.sensorHealth },
      windVector: {
        speedMs: this.environment.getState().windSpeed,
        directionDeg: this.environment.getState().windDirection,
        gustMs: this.environment.getState().windGust,
      },
      ambientTemperatureC: this.environment.getState().temperature,
    };
  }

  public getDebugTelemetry(): PhysicsDebugTelemetry {
    const totalMass = this.def.mass + this.payloadMass;
    const weightNewtons = totalMass * 9.81;
    const battState = this.battery.update(0, 0);

    return {
      dryMass: this.def.mass,
      payloadMass: this.payloadMass,
      totalMass: Math.round(totalMass * 100) / 100,
      weightNewtons: Math.round(weightNewtons * 10) / 10,
      totalThrustNewtons: Math.round(this.totalThrust * 10) / 10,
      thrustToWeightRatio: weightNewtons > 0 ? Math.round((this.totalThrust / weightNewtons) * 100) / 100 : 0, maxThrustToWeightRatio: weightNewtons > 0 ? (this.def.maximumThrust / weightNewtons) : 0,
      motorOutputs: this.motorOutputs.map((o) => Math.round(o * 1000) / 1000),
      accel: {
        x: Math.round(this.accelX * 100) / 100,
        y: Math.round(this.accelY * 100) / 100,
        z: Math.round(this.accelZ * 100) / 100,
      },
      vel: {
        x: Math.round(this.velX * 100) / 100,
        y: Math.round(this.velY * 100) / 100,
        z: Math.round(this.velZ * 100) / 100,
      },
      windForce: {
        x: Math.round(this.windForceX * 10) / 10,
        y: Math.round(this.windForceY * 10) / 10,
        z: Math.round(this.windForceZ * 10) / 10,
      },
      dragForce: {
        x: Math.round(this.dragForceX * 10) / 10,
        y: Math.round(this.dragForceY * 10) / 10,
        z: Math.round(this.dragForceZ * 10) / 10,
      },
      batteryPowerWatts: Math.round(battState.powerWatts),
      groundElevationMsl: Math.round(this.groundLevel * 10) / 10,
      radarAgl: Math.max(0, Math.round((this.posY - this.groundLevel) * 10) / 10),
    };
  }

  /**
   * Field Repair & In-Place Drone Revive
   * Restores airframe, clears crash state, stabilizes attitude, and locks hover altitude right on the spot.
   */
  public revive(targetX?: number, targetY?: number, targetZ?: number): TelemetryState {
    this.crashState = null;
    if (targetX !== undefined) this.posX = targetX;
    if (targetZ !== undefined) this.posZ = targetZ;

    const ground = this.elevationQueryFn ? this.elevationQueryFn(this.posX, this.posZ) : 1.2;
    let safeY = targetY !== undefined ? Math.max(targetY, ground + 2.0) : Math.max(this.posY + 1.5, ground + 2.0);

    // If colliding with an obstacle, step upwards until clear of obstacle bounding volume
    for (let attempts = 0; attempts < 10; attempts++) {
      const obs = checkObstacleCollision(this.posX, safeY, this.posZ, 0.65);
      if (!obs) break;
      safeY = obs.box.maxY + 2.5; // Clear rooftop / structure
    }

    this.posY = safeY;
    this.velX = 0;
    this.velY = 0;
    this.velZ = 0;
    this.pitch = 0;
    this.roll = 0;
    this.pitchRate = 0;
    this.rollRate = 0;
    this.yawRate = 0;

    this.isArmed = true;
    this.isHoverMode = true;
    this.targetAltitude = this.posY;
    this.motorOutputs = [0.65, 0.65, 0.65, 0.65];
    return this.generateTelemetry();
  }
}



