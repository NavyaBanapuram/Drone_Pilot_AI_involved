// ==========================================================
// DRONE PILOT — EDUCATIONAL PARAMETER DICTIONARY (PHASE 4)
// Technically accurate aeronautical explanations for student training
// ==========================================================

export interface EducationalTooltip {
  title: string;
  explanation: string;
  aviationPrinciple?: string;
  unit?: string;
}

export const EDUCATIONAL_TOOLTIPS: Record<string, EducationalTooltip> = {
  // --- Motors ---
  nominalRpm: {
    title: "Nominal Motor RPM",
    explanation:
      "The normal continuous rotational speed of the motor at cruise hover. Higher RPM produces greater propeller thrust but accelerates electrical current draw and heat generation.",
    aviationPrinciple: "Thrust scales approximately with RPM squared (T ∝ RPM²).",
    unit: "RPM (Revolutions Per Minute)",
  },
  maxRpm: {
    title: "Maximum Motor RPM",
    explanation:
      "The hard rotational velocity ceiling of the brushless stator/rotor assembly under full throttle. Running motors continuously near maximum RPM causes thermal saturation and reduces motor life.",
    aviationPrinciple: "Determines peak collective lift during emergency punch-outs and climb phases.",
    unit: "RPM",
  },
  kvRating: {
    title: "Motor KV Rating (RPM/Volt)",
    explanation:
      "The theoretical RPM the motor spins for every 1.0 Volt applied without load. Lower KV motors spin larger propellers with high torque, while high KV motors spin smaller propellers at blistering speeds.",
    aviationPrinciple: "High torque vs high speed trade-off fundamental to multirotor sizing.",
    unit: "RPM/V",
  },
  motorPower: {
    title: "Motor Peak Power",
    explanation:
      "Maximum electrical power the motor windings can dissipate without melting insulation. Power equals Voltage multiplied by Current (P = V × I).",
    aviationPrinciple: "Total aircraft power determines maximum all-up weight capability.",
    unit: "Watts (W)",
  },
  motorEfficiency: {
    title: "Motor Electrical Efficiency",
    explanation:
      "The percentage of electrical power converted into useful mechanical rotational torque rather than lost as heat.",
    aviationPrinciple: "Quality brushless outrunners operate between 75% and 88% peak efficiency.",
    unit: "%",
  },

  // --- Propellers ---
  propDiameter: {
    title: "Propeller Diameter",
    explanation:
      "The diameter of the circular disc swept by the propeller tips. Larger discs displace more air mass per revolution, dramatically improving hover efficiency (disk loading).",
    aviationPrinciple: "Lower disk loading (large prop on light craft) yields longer hover endurance.",
    unit: "Inches",
  },
  propPitch: {
    title: "Propeller Pitch",
    explanation:
      "The theoretical distance the propeller would advance through a solid medium in one revolution. High pitch yields higher top horizontal speed; low pitch yields sharper throttle response and hover stability.",
    aviationPrinciple: "Fine pitch for agile acrobatics/hover; coarse pitch for rapid forward cruising.",
    unit: "Inches per revolution",
  },
  bladeCount: {
    title: "Propeller Blade Count",
    explanation:
      "2-blade props are aerodynamically most efficient. 3-blade props offer smoother flight, reduced disc diameter for compact frames, and higher grip in high-speed turns at a slight efficiency penalty.",
    aviationPrinciple: "Fewer blades avoid turbulent wake vortices from preceding blades.",
  },

  // --- Battery ---
  cellCount: {
    title: "Battery Cell Count (Series S)",
    explanation:
      "The number of 3.7V nominal lithium cells wired in series. 4S provides 14.8V nominal, while 6S provides 22.2V. Higher voltage allows motors to produce equivalent power with lower current (amps), reducing resistive heating (I²R losses).",
    aviationPrinciple: "P = V × I. Higher voltage permits thinner wiring and cooler ESC operation.",
    unit: "S (Series Cells)",
  },
  batteryCapacity: {
    title: "Battery Capacity",
    explanation:
      "The total electrical charge stored in the pack. Increasing capacity provides more flight energy, but the added battery mass eventually encounters diminishing returns in flight duration.",
    aviationPrinciple: "Breguet endurance theorem: Flight time depends on energy density and lift-to-weight ratio.",
    unit: "mAh (Milliampere-hours)",
  },
  dischargeC: {
    title: "Continuous Discharge Rating (C-Rating)",
    explanation:
      "A measure of how rapidly the battery can safely discharge relative to its capacity. A 5000mAh pack with a 30C rating can continuously supply 150 Amps without voltage collapse or thermal damage.",
    aviationPrinciple: "Insufficient C-rating causes severe voltage sag under rapid throttle application.",
    unit: "C",
  },

  // --- Airframe & Mass ---
  dryMass: {
    title: "Airframe Dry Mass",
    explanation:
      "Mass of the bare structural frame, motors, wiring, and avionics, excluding battery and optional mission payloads.",
    unit: "kg",
  },
  payloadMass: {
    title: "Payload Mass",
    explanation:
      "Mass of mission-specific gear (gimbal cameras, LiDAR scanners, agricultural spray tanks). Additional payload directly increases all-up weight, shifting the hover throttle higher.",
    aviationPrinciple: "Every extra gram of payload requires continuous aerodynamic lift to sustain.",
    unit: "kg",
  },
  thrustToWeight: {
    title: "Thrust-to-Weight Ratio (TWR)",
    explanation:
      "The ratio of total collective motor thrust to total aircraft weight. A TWR of 2.0:1 means the drone can produce twice its weight in lift, hovering at approximately 50% throttle with ample control authority.",
    aviationPrinciple: "TWR < 1.3 causes sluggish recovery in wind; TWR > 2.5 enables aggressive maneuvers.",
    unit: "Ratio (e.g. 2.1:1)",
  },

  // --- Avionics & Sensors ---
  imu: {
    title: "Inertial Measurement Unit (IMU)",
    explanation:
      "Contains 3-axis gyroscopes and 3-axis accelerometers measuring angular velocity and linear acceleration. Runs at high frequencies (200Hz+) to maintain self-leveling attitude stabilization.",
    aviationPrinciple: "The sensory core of all multirotor flight controllers.",
  },
  barometer: {
    title: "Barometric Pressure Altimeter",
    explanation:
      "Measures atmospheric air pressure to calculate relative altitude above ground. Highly responsive for vertical altitude hold loops, though sensitive to wind gusts and propeller downwash.",
    unit: "hPa / Pascals",
  },
  gps: {
    title: "GNSS / GPS Satellite Positioning",
    explanation:
      "Constellation receiver calculating horizontal position and ground speed. Enables autonomous position hold, return-to-home (RTH), and waypoint mission execution.",
    unit: "Hz update rate",
  },
  compass: {
    title: "3-Axis Magnetometer (Digital Compass)",
    explanation:
      "Measures the Earth's magnetic field to provide absolute magnetic heading (yaw). Crucial for GPS navigation and preventing toilet-bowling drift.",
    unit: "Degrees (0-360°)",
  },
};
