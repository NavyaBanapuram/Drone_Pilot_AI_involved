# DRONE PILOT — 6-DoF Physics, Aerodynamics & Forensics Engine

## 1. Mathematical Equations of Motion (6-DoF Rigid Body)

The DRONE PILOT simulation core models a multirotor unmanned aerial vehicle (UAV) as a 6-Degree-of-Freedom rigid body subject to aerodynamic, gravitational, propulsive, and ground-interaction forces.

### 1.1 Linear Equations of Motion
$$\sum \vec{F} = m \cdot \frac{d\vec{v}}{dt}$$

$$\vec{F}_{\text{total}} = \vec{F}_{\text{thrust}} + \vec{F}_{\text{gravity}} + \vec{F}_{\text{drag}} + \vec{F}_{\text{wind}} + \vec{F}_{\text{ground}}$$

Where:
* **Collective Thrust Vector**:
  $$\vec{F}_{\text{thrust}} = \mathbf{R}(\phi, \theta, \psi) \cdot \begin{bmatrix} 0 \\ T_{\text{collective}} \\ 0 \end{bmatrix}$$
  $\mathbf{R}$ is the 3D rotation matrix composed of roll ($\phi$), pitch ($\theta$), and yaw ($\psi$).
* **Gravity**:
  $$\vec{F}_{\text{gravity}} = \begin{bmatrix} 0 \\ -m \cdot g \\ 0 \end{bmatrix}, \quad g = 9.81 \,\text{m/s}^2$$
  Total mass $m = m_{\text{dry}} + m_{\text{payload}}$.
* **Aerodynamic Drag**:
  $$\vec{F}_{\text{drag}} = -\frac{1}{2} \cdot \rho(T) \cdot C_d \cdot A \cdot |\vec{v}_{\text{rel}}| \cdot \vec{v}_{\text{rel}}$$
  Where $\vec{v}_{\text{rel}} = \vec{v}_{\text{drone}} - \vec{v}_{\text{wind}}$.
* **Ground Effect Thrust Augmentation**:
  When operating in ground effect (altitude $h < 2 \cdot R_{\text{rotor}}$):
  $$T_{\text{effective}} = T \cdot \left[ 1 - \frac{R^2}{16 h^2} \right]^{-1}$$

---

## 2. Geometric Motor Mixer Architecture

The motor mixer decouples the flight controller commands (Throttle $T$, Pitch $P$, Roll $R$, Yaw $Y$) into individual motor commanded throttles $u_i \in [0.0, 1.0]$.

### 2.1 Quadcopter (X Configuration)
$$\begin{bmatrix} u_1 \\ u_2 \\ u_3 \\ u_4 \end{bmatrix} = \begin{bmatrix} 1 & -1 & -1 & -1 \\ 1 & 1 & 1 & -1 \\ 1 & -1 & 1 & 1 \\ 1 & 1 & -1 & 1 \end{bmatrix} \begin{bmatrix} T \\ P \\ R \\ Y \end{bmatrix}$$

### 2.2 Hexacopter ($60^\circ$ Radial Configuration)
Motors are arrayed at angles $\theta_i = \{30^\circ, 90^\circ, 150^\circ, 210^\circ, 270^\circ, 330^\circ\}$:
$$u_i = T + P \cdot \cos(\theta_i) + R \cdot \sin(\theta_i) + Y \cdot d_i$$

### 2.3 Headroom Desaturation
When any motor command exceeds $1.0$, the mixer priority system reduces collective throttle to prevent attitude control authority loss.

---

## 3. Electrochemical LiPo Battery Model (`src/lib/simulation/battery-model.ts`)

Rather than a simplistic linear timer, the aircraft battery employs an equivalent-circuit electrochemical cell model:

1. **Open-Circuit Voltage ($V_{\text{oc}}$)**:
   $$V_{\text{cell}}(SoC) = 3.27 + 0.93 \cdot SoC - 0.20 \cdot e^{-15 \cdot SoC}$$
2. **Terminal Voltage Sag ($V_{\text{term}}$)**:
   $$V_{\text{term}} = V_{\text{oc}} - I_{\text{draw}} \cdot R_{\text{int}}(T)$$
   Where internal resistance increases at cold temperatures:
   $$R_{\text{int}}(T) = R_0 \cdot \left( 1 + 0.025 \cdot (20 - T) \right)$$
3. **Thrust Authority Derating**:
   When terminal voltage drops below $3.3\text{V/cell}$, the flight controller limits maximum collective throttle to preserve avionics bus stability.

---

## 4. Atmospheric & Meteorological Engine (`src/lib/simulation/environment-model.ts`)

1. **Air Density vs Temperature**:
   $$\rho(T) = \frac{p_0}{R_{\text{specific}} \cdot (T + 273.15)}, \quad R_{\text{specific}} = 287.05 \,\text{J/(kg}\cdot\text{K)}$$
2. **Turbulent Wind Vector**:
   $$\vec{v}_{\text{wind}}(t) = \vec{v}_{\text{base}} + \vec{A}_{\text{gust}} \cdot \sin(\omega_1 t) \cdot \cos(\omega_2 t)$$

---

## 5. Crash Investigation & Forensics System

Upon obstacle or terrain impact ($v_y < -3.5\text{m/s}$ or $v_{\text{horiz}} > 14\text{m/s}$ at $h = 0$):
* **Kinetic Energy of Impact**:
  $$E_k = \frac{1}{2} \cdot m_{\text{total}} \cdot |\vec{v}_{\text{impact}}|^2 \quad (\text{Joules})$$
* **Primary Incident Taxonomy**:
  * **CFIT**: Controlled Flight Into Terrain.
  * **Vortex Ring State (VRS)**: Steep descent into own rotor wash ($v_{\text{down}} > 4.5\text{m/s}$).
  * **Wind Shear Loss of Authority**: Crosswind velocity exceeded roll authority limit.
  * **Critical Voltage Depletion**: Low LiPo voltage sag triggered forced descent.
