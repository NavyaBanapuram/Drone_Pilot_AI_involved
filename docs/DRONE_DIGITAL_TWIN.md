# DRONE PILOT — Drone Digital Twin & Aircraft Configuration Architecture

## 1. Product Direction & Digital Twin Concept

Drone Pilot is an **Interactive Drone Simulator + Digital-Twin Educational Platform**.
The 3km irregular island world serves as the virtual proving ground and simulation laboratory. The primary product is the **Drone Digital Twin**: a canonical, strongly typed, validated representation of an aircraft spanning physical, propulsion, electrical, aerodynamic, avionics, and payload systems.

The digital twin architecture separates the aircraft into two distinct operational layers:
1. **Aircraft Configuration Specification (Static Model)**: What the aircraft *is* (e.g. Configured Maximum RPM = 12,000 RPM, Battery Capacity = 5,000 mAh, Airframe Diagonal = 500 mm).
2. **Aircraft Runtime State (Dynamic Model)**: What the aircraft is *currently doing* during simulation (e.g. Current Commanded RPM = 8,470 RPM, Terminal Voltage = 15.1 V, State of Charge = 74%).

---

## 2. Canonical Digital Twin Data Model

The central typed model is defined in `src/types/drone-digital-twin.ts`:

```
DroneDigitalTwinConfiguration
├── Identity          (ID, Name, Application, Category, Version)
├── Airframe          (Material, Motor Count, Arm Length, Diagonal, Dry Mass, Landing Gear)
├── Motors            (Array of M1...Mn: Pos, Direction CW/CCW, Nominal/Max RPM, KV, Watts)
├── Propeller         (Diameter, Pitch, Blade Count, Material, Mass, Thrust Factor)
├── ESC               (Rated Amps, Burst Amps, Voltage Range, Protocol)
├── Battery           (Chemistry, Series Cells, Nominal V, Capacity mAh, Energy Wh, C-Rating)
├── Flight Controller (Platform, Firmware, Stabilization, GPS Assist, Failsafe)
├── Sensors           (GPS, IMU, Barometer, Compass, Optical Flow, Range Finder)
├── Payload           (Type, Name, Mass, Capacity Liters, Attachment Point)
├── Camera            (Sensor Type, Resolution, FOV, Gimbal Axes, Mass)
├── Communication     (Link Type, Range km, Frequency MHz, TX Power mW)
├── Mass Properties   (Dry Mass, Battery Mass, Payload Mass, Total AUW, Moments of Inertia)
└── Performance       (Max Velocity, Climb Rate, Tilt Limit, TWR, Hover Throttle, Flight Time)
```

---

## 3. Aircraft Components & Subsystem Models

### 3.1 Aircraft Identity & Classification
* **Categories**: Quadcopter (4 rotors), Hexacopter (6 rotors), Octacopter (8 rotors).
* **Applications**: Training & Instruction, Agricultural Crop Care, Topographic Survey, Infrastructure Inspection, Aerial Mapping, Cinema Photography, General Multirotor.
* **Specification Versioning**: Stored with `configurationVersion: "1.0"` for schema migrations.

### 3.2 Airframe Configuration
* **Chassis Materials**: High-Modulus Carbon Fiber, CNC Anodized 6061-T6 Aluminum, Injection-Molded Engineered Polymer.
* **Landing Gear**: Motor-Integrated Angled Struts, Fixed Carbon Skid, Servo-Driven Retractable Landing Gear.
* **Geometric Dimensions**: Arm boom length, diagonal wheelbase, and fuselage bounding box.

### 3.3 Propulsion: Motors, Propellers & ESCs
* **Individual Motors**: Each rotor is modeled independently (`M1`, `M2`, `M3`, `M4`, etc.) with 3D coordinate position `(x, y, z)`, rotational polarity (CW = 1, CCW = -1), nominal hover RPM, and maximum hardware RPM limit.
* **Propellers**: Actuator disc model parameterized by diameter (inches), pitch (inches/rev), blade count (2, 3, or 4), material, and mass.
* **Electronic Speed Controllers (ESC)**: Rated continuous current, burst current (10s), input voltage boundaries, and telemetry protocols (DShot600, DShot300, PWM, CAN).

### 3.4 Electrochemical Battery & Energy Storage
* **Chemistry**: LiPo (Lithium Polymer), Li-Ion (Lithium Ion 21700), Solid State.
* **Series Cell Topology**: 4S (14.8V nominal), 6S (22.2V nominal), up to 14S for heavy industrial lifters.
* **Energy Capacity**: $E_{\text{Wh}} = \frac{V_{\text{nominal}} \times C_{\text{mAh}}}{1000}$.
* **Discharge Capability**: Continuous C-rating and internal resistance ($m\Omega$).

### 3.5 Avionics & Sensor Suite
* **Flight Controller**: Control loop frequency (400Hz+), 6-DoF attitude stabilization loop, GPS position hold assist, and loss-of-link failsafes (RTH, Auto-Land, Hover).
* **Integrated Sensors**:
  * **IMU**: 6-axis gyroscope and accelerometer (200Hz - 500Hz).
  * **Barometer**: Precision barometric altimeter ($\pm 0.05\text{m}$).
  * **GNSS / GPS**: Constellation receiver ($\pm 0.5\text{m}$ standard, $\pm 0.01\text{m}$ RTK).
  * **Magnetometer**: 3-axis digital compass for magnetic heading.
  * **Optical Flow & LiDAR Rangefinder**: Ground-relative positioning over texture.

### 3.6 Mission Payload & Camera Equipment
* **Modular Payloads**: Agricultural liquid spray tanks, topographic survey LiDAR scanners, radiometric thermal pods, or custom scientific cargo.
* **Active Camera Gimbal**: 2-axis or 3-axis gyro-stabilized optical pods with configurable field-of-view and resolution.

---

## 4. Pure Mass & Performance Calculation Engine

Implemented in `src/lib/digital-twin/mass-calculator.ts`:

### 4.1 All-Up Weight (AUW) Summation
$$\text{Total Mass} = \text{Dry Mass} + \text{Battery Mass} + \text{Payload Mass} + \text{Camera Mass}$$

### 4.2 Moments of Inertia Estimation ($kg \cdot m^2$)
Simplified multirotor symmetrical cylinder and arm disc approximation:
$$I_{xx} = I_{yy} = 0.5 \cdot M_{\text{total}} \cdot R_{\text{arm}}^2 \cdot 0.45$$
$$I_{zz} = 0.5 \cdot M_{\text{total}} \cdot R_{\text{arm}}^2 \cdot 0.85$$

### 4.3 Thrust-to-Weight Ratio (TWR)
$$\text{TWR} = \frac{\sum_{i=1}^{N} T_{\text{motor}, i}}{M_{\text{total}} \cdot g}$$
* **TWR $< 1.0$**: Aircraft cannot take off (blocking validation error).
* **TWR $1.0 - 1.25$**: Marginal authority (validation warning).
* **TWR $1.8 - 2.5$**: Optimal commercial multirotor flight envelope.

### 4.4 Hover Endurance Estimation
$$\text{Flight Time (minutes)} = \frac{E_{\text{Wh}} \times 0.82}{P_{\text{hover}}} \times 60$$
where $P_{\text{hover}} \approx M_{\text{total}} \times 145\text{ W/kg}$.

---

## 5. Configuration Validation Engine

Implemented in `src/lib/digital-twin/digital-twin-validator.ts`:

| Rule Code | Severity | Trigger Condition | Educational Guidance |
|---|---|---|---|
| `NO_MOTORS` | **ERROR** | Motors array empty | Add propulsion motors matching airframe. |
| `MOTOR_COUNT_MISMATCH` | **ERROR** | `motors.length !== airframe.motorCount` | Rebalance motor count with airframe. |
| `MISSING_BATTERY_CAPACITY`| **ERROR** | `capacityMah <= 0` | Provide positive battery capacity. |
| `PAYLOAD_EXCEEDS_MAX_CAPACITY` | **ERROR** | `payload.massKg > airframe.maxPayloadKg` | Reduce payload or upgrade airframe. |
| `CANNOT_LIFT_OFF` | **ERROR** | $\text{TWR} < 1.0:1$ | Aircraft cannot overcome gravity. |
| `NO_FLIGHT_CONTROLLER` | **ERROR** | Missing FC definition | Aircraft cannot be stabilized. |
| `BATTERY_OVERVOLTAGE_ESC` | **WARNING** | $V_{\text{bat}} > V_{\text{ESC, max}}$ | Risk of ESC blowout; drop series cells. |
| `PROPELLER_FRAME_CLEARANCE`| **WARNING** | Propeller diameter exceeds arm spacing | Propellers will collide with boom/frame. |
| `IMU_OFFLINE` | **WARNING** | IMU sensor disabled | Self-leveling stabilization offline. |

Configurations with **ERROR** severities are strictly prevented from entering the simulation laboratory.

---

## 6. Persistence & Storage Architecture

Implemented in `src/lib/digital-twin/digital-twin-storage.ts`:
* **Online Mode (Authenticated Firebase)**: Configurations are persisted to Firestore under `users/{userId}/droneConfigurations/{configId}`.
* **Offline / Demo Mode**: Automatic transparent fallback to `localStorage` (`drone_pilot_saved_digital_twins`).
* **Active Aircraft Tracking**: `localStorage.getItem("drone_pilot_active_digital_twin")` ensures the Configurator, Flight Prep, and 3D Simulator share the identical aircraft state.

---

## 7. Simulator & Physics Bridge Pipeline

Implemented in `src/lib/digital-twin/adapter.ts`:

```
[DroneDigitalTwinConfiguration]
              ↓
  digitalTwinToDroneDefinition()
              ↓
      [DroneDefinition]
       ├── ModularDrone 3D Mesh (Dynamically builds 4, 6, or 8 arms & rotors)
       └── FlightPhysicsEngine (Applies configured mass, TWR, tilt limits)
              ↓
  buildRuntimeStateFromTelemetry()
              ↓
 [DroneDigitalTwinRuntimeState]
              ↓
  <DigitalTwinHUD /> (Live In-Flight Motor RPM, Battery Telemetry, Sensors)
```

---

## 8. Preparation for Phase 5 (Physics, Environment & Fault Injection)

Phase 4 establishes the structural, electrical, and avionics data structures so that Phase 5 can hook directly into them without refactoring:
1. **Battery Depletion Model**: Phase 5 will implement Peukert's law, dynamic internal resistance heat generation, and voltage sag under high throttle.
2. **Motor Failure Injection**: The individual motor model (`motors[i].status = "FAILED"`) is fully prepared for asymmetric thrust failure simulations.
3. **Sensor Faults**: Sensors support `"DEGRADED"` and `"OFFLINE"` states for GPS spoofing, gyro drift, and pitot icing scenarios.
4. **Environmental Force Coupling**: High winds and density altitude will dynamically modulate propeller lift and drag equations.
