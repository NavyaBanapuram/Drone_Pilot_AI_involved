# DRONE PILOT — SIMULATION ARCHITECTURE SPECIFICATION (PHASE 5)

## 1. Executive Summary & Core Philosophy

Drone Pilot is an **Interactive Drone Simulator + Digital-Twin Educational Platform**.
The simulator operates on the foundational principle of **cause-and-effect physical fidelity**:
* Every parameter configured in the Phase 4 Digital Twin has direct mathematical consequences in the Phase 5 runtime simulation.
* Atmospheric changes (wind vector, temperature, rain, turbulence) apply physical aerodynamic drag, requiring controller compensation, altering motor RPMs, and increasing electrical battery consumption.
* Mechanical faults (motor degradation, ESC failure) produce real asymmetric torque forces that physically destabilize the aircraft attitude.
* Avionics sensor failures (GPS loss, Barometer drift, IMU gyro noise) degrade autonomous flight-controller loops into manual backup states (ATTI mode).
* An automated **Educational Cause-and-Effect Event Engine** explains what occurred, why it occurred, the physical effect it caused, and recommended pilot action in real time.

---

## 2. End-to-End Simulation Architecture Pipeline

```
┌────────────────────────────────────────────────────────┐
│   Phase 4 Digital Twin Configuration Specification     │
│   (Identity, Airframe, Motors, Battery, Sensors, AUW)  │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│               Adapter & Translation Layer              │
│   digitalTwinToDroneDefinition & Mass Reconciliation   │
└───────────────────────────┬────────────────────────────┘
                            │
                            ▼
┌────────────────────────────────────────────────────────┐
│             FlightPhysicsEngine (6-DoF)                │
│   • Multi-Rotor Motor Mixing & Individual Health       │
│   • Net Asymmetric Rolling & Pitching Torques          │
│   • Aerodynamic Wind Vector & Dynamic Drag             │
│   • Closed-Loop Hover Assist / Altitude Hold           │
│   • GPS Position Braking vs. ATTI Wind Drift           │
│   • Battery Voltage Sag & Current Consumption          │
│   • Hard Terrestrial Collision Detection               │
└───────────────────────────┬────────────────────────────┘
                            │
         ┌──────────────────┴──────────────────┐
         ▼                                     ▼
┌─────────────────────────┐         ┌─────────────────────────┐
│  3D Visual World Scene  │         │  Avionics Telemetry HUD │
│  • ModularDrone Mesh    │         │  • Multi-Channel HUD    │
│  • Rotor Spin RPM       │         │  • Fault Benchmark      │
│  • Downwash Particles   │         │  • Scenario Presets     │
│  • Three.js Heightfield │         │  • Digital Twin State   │
└─────────────────────────┘         └────────────┬────────────┘
                                                 │
                                                 ▼
                                    ┌─────────────────────────┐
                                    │  Educational Event Log  │
                                    │  • WHAT happened        │
                                    │  • WHY it occurred      │
                                    │  • PHYSICAL consequence │
                                    │  • RECOMMENDED action   │
                                    └─────────────────────────┘
```

---

## 3. Subsystem Mathematical Models

### 3.1 Propulsion & Motor Simulation
* **Individual Motors**: $n$ rotors ($n \in \{4, 6, 8\}$) positioned at relative airframe vectors $\mathbf{p}_i = (x_i, y_i, z_i)$.
* **Motor Capacity & Health**: Each motor has a health coefficient $h_i \in [0.0, 1.0]$.
* **Effective Thrust**:
  $$T_i = (u_i \times h_i)^2 \times T_{\max,\text{motor}}$$
  where $u_i \in [0.0, 1.0]$ is the commanded throttle output from the motor mixer.
* **Physical Asymmetric Torque**:
  Unequal motor thrusts induce net torques about the aircraft center of gravity:
  $$\tau_{\text{roll}} = \sum_{i=1}^n -x_i \cdot T_i$$
  $$\tau_{\text{pitch}} = \sum_{i=1}^n z_i \cdot T_i$$
  $$\Delta \theta_{\text{roll}} = \frac{\tau_{\text{roll}}}{I_{\text{roll}}} \cdot \Delta t$$
  $$\Delta \theta_{\text{pitch}} = \frac{\tau_{\text{pitch}}}{I_{\text{pitch}}} \cdot \Delta t$$
  Degrading Motor 3 to 45% naturally induces left roll instability. The flight controller's PID loop increases opposite motor RPMs, elevating average throttle and driving higher battery discharge.

### 3.2 Mass & Payload Properties
* **Total All-Up-Weight (AUW)**:
  $$m_{\text{total}} = m_{\text{dry}} + m_{\text{battery}} + m_{\text{payload}}$$
  $$W_{\text{hover}} = m_{\text{total}} \times g \quad (g = 9.81\,\text{m/s}^2)$$
* **Hover Throttle Equilibrium**:
  $$\text{Throttle}_{\text{hover}} = \frac{W_{\text{hover}}}{T_{\max,\text{total}}} \times \frac{1}{\cos(\theta_{\text{pitch}}) \cos(\theta_{\text{roll}})}$$
* Increasing payload from $0\,\text{kg}$ to $6.5\,\text{kg}$ shifts hover throttle from ~38% to ~72%, decreases climb acceleration, increases braking distance, and accelerates battery consumption.

### 3.3 Electrochemical Battery Model (Ohm's Law & Voltage Sag)
* **Energy Drain**:
  $$Q_{\text{drained}} = \int I(t)\,dt \quad (\text{mAh})$$
  $$\text{SOC} = \frac{Q_{\text{nominal}} - Q_{\text{drained}}}{Q_{\text{nominal}}} \times 100\%$$
* **Open-Circuit Voltage Curve**:
  $$V_{\text{oc}}(\text{SOC}) = \begin{cases}
  [3.60 + (\text{SOC} - 0.1)^{0.75} \times 0.60] \times n_{\text{cells}}, & \text{SOC} > 0.1 \\
  [3.25 + (\text{SOC} / 0.1) \times 0.35] \times n_{\text{cells}}, & \text{SOC} \le 0.1
  \end{cases}$$
* **Temperature Derating & Terminal Voltage Sag**:
  $$R_{\text{int}}(T) = R_{\text{nom}} \times [1 + \max(0, 15 - T) \times 0.05]$$
  $$V_{\text{terminal}} = V_{\text{oc}} - I_{\text{total}} \times R_{\text{int}}(T)$$
  $$P_{\text{watts}} = V_{\text{terminal}} \times I_{\text{total}}$$
* **Thresholds**:
  * $\text{SOC} > 20\%$: NOMINAL
  * $8\% < \text{SOC} \le 20\%$: LOW (amber warning, voltage sag advisory)
  * $\text{SOC} \le 8\%$: CRITICAL (thrust authority derated to prevent cell reverse-polarity)
  * $\text{SOC} = 0\%$: DEPLETED (motors cutoff, forced touchdown)

### 3.4 Avionics & Sensor Degradation Modes
1. **GPS (Global Positioning System)**:
   * *Healthy*: Closed-loop automated position hold actively applies counter-thrust braking to lock coordinates when control sticks are centered.
   * *Failed*: Reverts to **ATTI Mode**. Active braking is disabled; the aircraft drifts freely with ambient wind vectors.
2. **IMU (Inertial Measurement Unit)**:
   * *Healthy*: Smooth attitude stabilization.
   * *Degraded*: Injects continuous low-frequency harmonic gyro noise into pitch and roll channels ($\pm 4.5^\circ$), producing airframe wobble.
3. **Barometric Altimeter**:
   * *Healthy*: Closed-loop altitude hold locks AGL/MSL height within $\pm 0.05\,\text{m}$.
   * *Failed*: Static port hunting creates vertical altitude drift ($\pm 1.8\,\text{m}$ oscillation).
4. **Magnetic Compass**:
   * *Healthy*: Absolute heading $0^\circ - 360^\circ$ tracking.
   * *Failed*: Compass telemetry displays uncalibrated status.

### 3.5 Atmospheric & Meteorological Environment
* **Wind Vector**:
  $$\mathbf{v}_{\text{wind}} = \left(v_{\text{speed}} \sin(\psi_{\text{dir}}),\, v_{\text{vertical}},\, v_{\text{speed}} \cos(\psi_{\text{dir}})\right)$$
* **Relative Airspeed & Aerodynamic Drag**:
  $$\mathbf{v}_{\text{rel}} = \mathbf{v}_{\text{drone}} - \mathbf{v}_{\text{wind}}$$
  $$\mathbf{F}_{\text{drag}} = -\frac{1}{2}\,\rho(T)\,C_d\,A\,|\mathbf{v}_{\text{rel}}|\,\mathbf{v}_{\text{rel}}$$
  $$\rho(T) = \frac{P_{\text{standard}}}{R_{\text{specific}} \times (T + 273.15)}$$
* **Atmospheric Turbulence**: Multi-frequency harmonic perturbation shaking pitch and roll attitude proportionally to configured turbulence factor ($0.0 - 1.0$).

---

## 4. World Hydrology & Elevation Architecture

### 4.1 Canonical Elevation Baseline
* **Authoritative Sea Level**: $\text{WORLD\_CONFIG.seaLevel} = 0.0\,\text{m}$ Mean Sea Level (MSL).
* **Terrestrial Floor Rule**: All land areas inside the canonical irregular coastline polygon satisfy:
  $$\text{elevation}(x, z) \ge 0.25\,\text{m} \quad (\text{beaches: } +0.25\,\text{m} \to +2.0\,\text{m};\text{ plains: } \ge +2.2\,\text{m})$$
* **Freshwater Bodies**:
  * Crystal Mountain Lake: Natural mountain reservoir basin at $Y = 8.5\,\text{m}$ MSL.
  * River Corridor: Descends continuously from lake waterfall ($Y = 8.5\,\text{m}$) down to ocean estuary ($Y = 0.18\,\text{m}$).
* **Verified Helipads**: All 20 helipad foundations are mathematically leveled to their exact registered platform elevations:
  * Central Flight Academy Alpha/Bravo: $1.20\,\text{m}$
  * Forest Ranger Station Pad: $5.50\,\text{m}$
  * Mount Apex Weather Station Pad: $48.00\,\text{m}$
  * Valley River Bridge Pad: $10.00\,\text{m}$
  * Downtown Metropolis Vertiport: $2.50\,\text{m}$
  * Harbor Industrial Pad: $1.80\,\text{m}$
  * Pelican Cove Beach Pad: $2.00\,\text{m}$

---

## 5. Educational Cause-and-Effect Event System

Whenever a parameter is manipulated or an operational threshold is crossed, the `EducationalEventEngine` delivers a structured four-part aeronautical debrief:
1. **WHAT HAPPENED**: Specific technical manifestation (e.g. *Motor 3 operating capacity reduced by 55%*).
2. **WHY IT OCCURRED**: Underlying physical or simulated cause (e.g. *Injected propulsion degradation simulating ESC thermal throttling*).
3. **PHYSICAL CONSEQUENCE**: Dynamics impact (e.g. *Asymmetric thrust induced rolling torque; flight controller increased M1/M4 RPM to compensate, driving current draw to 34A*).
4. **RECOMMENDED PILOT ACTION**: Aerospace best practice (e.g. *Counter with right cyclic trim, reduce translation speed, land immediately on nearest pad*).

---

## 6. Preset Training Scenarios

| Scenario ID | Name | Category | Conditions | Learning Outcome |
| :--- | :--- | :--- | :--- | :--- |
| `normal-cruise` | Standard Navigational Cruise | Standard | 2.0 m/s wind, 100% nominal | Baseline hover throttle & symmetric power draw |
| `high-wind-gusts` | High Wind & Severe Turbulence | Environmental | 14.5 m/s wind (315°), 65% turbulence | Crab angles, aerodynamic drag, +45% battery drain |
| `low-battery-emergency` | Critical Battery & Voltage Sag | Emergency | 14% SOC, voltage sag under climb | Ohm's law terminal sag, thrust derating, RTL urgency |
| `motor-degraded` | Motor 3 Asymmetric Degradation | Emergency | Motor 3 at 45% health | Asymmetric rolling torque, opposite motor saturation |
| `gps-loss` | Avionics GPS Loss (ATTI Mode) | Emergency | GPS offline, 6.5 m/s wind | ATTI mode drift, loss of auto-braking, manual piloting |
| `heavy-payload` | Agricultural Spray Payload | Industrial | +6.5 kg payload mass | High AUW hover throttle (~72%), reduced climb rate |

---

## 7. Known Simplifications & Future Roadmap

* **Aerodynamic Simplifications**: Rotor-on-rotor aerodynamic blade vortex interference is modeled via empirical polynomial drag and thrust factors rather than discretized computational fluid dynamics (CFD).
* **Future PX4 / ArduPilot / Gazebo Integration**: The architecture exposes a normalized `FlightInput` and `TelemetryState` interface, designed for direct MAVLink bridge integration with PX4 Software-in-the-Loop (SITL) and Gazebo physics engines in future phases.
