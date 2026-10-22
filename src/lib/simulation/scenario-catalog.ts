import { TrainingScenarioDef } from "./scenario-types";

export const SCENARIO_CATALOG: TrainingScenarioDef[] = [
  {
    id: "scen-01-hover",
    title: "Scenario 1: Stable Hover",
    description: "Learn how the aircraft maintains stable hover equilibrium in calm conditions.",
    learningObjective: "Understand thrust equilibrium and stabilization.",
    briefing: {
      initialConditions: "Calm atmosphere. Standard payload.",
      whatToObserve: "Notice the flight controller automatically adjusting thrust and micro-attitude corrections to maintain position.",
      availableControls: "Throttle, Pitch, Roll, Yaw",
    },
    environmentSetup: { preset: "normal", windSpeed: 0, turbulence: 0 },
    aircraftSetup: { payloadKg: 0, batteryPercent: 100 },
    objectives: [
      {
        id: "obj-hover-1",
        title: "Maintain Hover Stability",
        description: "Hold altitude within 1m and limit tilt to 10° for 15 seconds.",
        type: "STABILITY",
        condition: { altTolerance: 1.0, maxTiltDeg: 10, minDuration: 15 }
      }
    ],
    debriefTopics: [
      "Altitude stability requires continuous thrust adjustment.",
      "A multirotor is inherently unstable and requires constant flight controller intervention."
    ]
  },
  {
    id: "scen-02-altitude",
    title: "Scenario 2: Altitude Control",
    description: "Demonstrate controlled altitude changes without oscillating.",
    learningObjective: "Understand how thrust changes affect vertical motion.",
    briefing: {
      initialConditions: "Calm atmosphere. Hovering at 2m.",
      whatToObserve: "Observe how increasing throttle causes vertical acceleration, while constant throttle at hover requires exact weight-matching thrust.",
      availableControls: "Throttle only",
    },
    environmentSetup: { preset: "normal", windSpeed: 0 },
    aircraftSetup: { payloadKg: 0 },
    objectives: [
      {
        id: "obj-alt-1",
        title: "Controlled Climb",
        description: "Climb to 10m and hold within 2m for 10 seconds.",
        type: "ALTITUDE",
        condition: { targetAltitude: 10, altTolerance: 2.0, minDuration: 10 }
      }
    ],
    debriefTopics: [
      "Climbing requires thrust > weight.",
      "Holding altitude requires thrust = weight."
    ]
  },
  {
    id: "scen-03-directional",
    title: "Scenario 3: Directional Control",
    description: "Understand pitch, roll, and resulting aircraft motion.",
    learningObjective: "Understand how tilting the thrust vector creates lateral acceleration.",
    briefing: {
      initialConditions: "Calm atmosphere. Ground level.",
      whatToObserve: "Observe how pitching forward directs thrust backwards, causing forward acceleration.",
      availableControls: "Throttle, Pitch, Roll, Yaw",
    },
    environmentSetup: { preset: "normal", windSpeed: 0 },
    aircraftSetup: {},
    objectives: [
      {
        id: "obj-dir-1",
        title: "Displacement",
        description: "Displace the aircraft 15 meters from the start position.",
        type: "NAVIGATION",
        condition: { targetDistance: 15, minDuration: 5 }
      }
    ],
    debriefTopics: [
      "Horizontal movement requires sacrificing some vertical thrust component.",
      "The flight controller must increase total throttle when banked."
    ]
  },
  {
    id: "scen-04-crosswind",
    title: "Scenario 4: Crosswind Compensation",
    description: "Fly the aircraft in a high crosswind environment.",
    learningObjective: "Understand how environmental wind creates disturbance and corrective attitude.",
    briefing: {
      initialConditions: "High crosswind (8 m/s).",
      whatToObserve: "Notice the wind pushing the aircraft. To maintain position, the aircraft must lean continuously into the wind.",
      availableControls: "Throttle, Pitch, Roll, Yaw",
    },
    environmentSetup: { preset: "windy", windSpeed: 8, windDirection: 90 },
    aircraftSetup: {},
    objectives: [
      {
        id: "obj-wind-1",
        title: "Counter Drift",
        description: "Maintain hover in crosswind with minimal ground drift for 10 seconds.",
        type: "STABILITY",
        condition: { minWind: 5, maxDriftVelocity: 2.0, minDuration: 10 }
      }
    ],
    debriefTopics: [
      "Wind creates aerodynamic drag on the airframe.",
      "Countering drag requires continuous corrective tilt."
    ]
  },
  {
    id: "scen-05-payload",
    title: "Scenario 5: Payload Effect",
    description: "Experiment with heavy payload mass.",
    learningObjective: "Understand how increased mass changes hover thrust and power demand.",
    briefing: {
      initialConditions: "Calm atmosphere. 2.5kg payload attached.",
      whatToObserve: "Observe the higher baseline throttle required to hover. Notice the slower acceleration due to increased inertia.",
      availableControls: "Throttle, Pitch, Roll, Yaw",
    },
    environmentSetup: { preset: "normal", windSpeed: 0 },
    aircraftSetup: { payloadKg: 2.5 },
    objectives: [
      {
        id: "obj-pay-1",
        title: "Heavy Hover",
        description: "Maintain hover at 5m with payload for 10 seconds.",
        type: "OBSERVATION",
        condition: { minPayload: 2.0, targetAltitude: 5, altTolerance: 2, minDuration: 10 }
      }
    ],
    debriefTopics: [
      "Force = Mass * Acceleration. Higher mass requires higher thrust force.",
      "Inertia increases braking distance."
    ]
  },
  {
    id: "scen-06-motor-fail",
    title: "Scenario 6: Motor Failure",
    description: "Observe an asymmetric thrust scenario.",
    learningObjective: "Understand asymmetric thrust and resulting attitude disturbance.",
    briefing: {
      initialConditions: "Calm atmosphere. Motor 1 will fail during flight.",
      whatToObserve: "Watch the aircraft lose attitude control and begin a rapid descent due to unrecoverable asymmetric torque.",
      availableControls: "Throttle, Pitch, Roll, Yaw",
    },
    environmentSetup: { preset: "normal", windSpeed: 0 },
    aircraftSetup: { motorHealth: { 0: 0.0 } },
    objectives: [
      {
        id: "obj-fail-1",
        title: "Observe Failure",
        description: "Observe the aircraft's physical response to a disabled motor.",
        type: "RECOVERY",
        condition: { motorIndex: 0, minDuration: 5 }
      }
    ],
    debriefTopics: [
      "Multirotors rely entirely on balanced motor lift.",
      "Loss of one motor creates extreme yaw torque and loss of total lift."
    ]
  },
  {
    id: "scen-07-battery",
    title: "Scenario 7: Battery Awareness",
    description: "Experience flight under severe voltage sag.",
    learningObjective: "Understand electrical load and available thrust authority.",
    briefing: {
      initialConditions: "Battery starting at 12%.",
      whatToObserve: "Attempt to climb rapidly. Notice that peak thrust is electronically limited due to sagging terminal voltage.",
      availableControls: "Throttle, Pitch, Roll, Yaw",
    },
    environmentSetup: { preset: "normal", windSpeed: 0 },
    aircraftSetup: { batteryPercent: 12 },
    objectives: [
      {
        id: "obj-batt-1",
        title: "Observe Sag limits",
        description: "Attempt a climb. Maintain flight for 15 seconds under low power.",
        type: "OBSERVATION",
        condition: { minDuration: 15 }
      }
    ],
    debriefTopics: [
      "Internal battery resistance causes voltage to drop under heavy load.",
      "Flight controllers restrict max throttle to prevent total system brownout."
    ]
  },
  {
    id: "scen-08-landing",
    title: "Scenario 8: Precision Landing",
    description: "Approach and land inside a designated landing zone.",
    learningObjective: "Understand controlled descent and positional stability.",
    briefing: {
      initialConditions: "Calm atmosphere. Ground effect active.",
      whatToObserve: "Carefully manage descent rate to avoid settling with power. Keep lateral corrections extremely small.",
      availableControls: "Throttle, Pitch, Roll, Yaw",
    },
    environmentSetup: { preset: "normal", windSpeed: 0 },
    aircraftSetup: {},
    objectives: [
      {
        id: "obj-land-1",
        title: "Land Safely",
        description: "Land the aircraft securely on the terrain without crashing.",
        type: "LANDING",
        condition: { minDuration: 1 } // Engine detects `telemetry.isLanded`
      }
    ],
    debriefTopics: [
      "Descent rate must be carefully managed.",
      "Ground effect causes floating near the surface."
    ]
  },
  {
    id: "scen-bridge-inspect",
    title: "Mission: Bridge Inspection",
    description: "Navigate to a structural target in high winds while carrying a heavy payload.",
    learningObjective: "Mastering aggressive counter-pitch and momentum management when heavily loaded in turbulence.",
    briefing: {
      initialConditions: "Winds are severe (18m/s). Payload is heavily biased (+3.5kg).",
      whatToObserve: "The drone will aggressively drift. Observe how the heavy mass makes stopping difficult (inertia).",
      availableControls: "Full controls. Autopilot is available but may struggle with wind."
    },
    environmentSetup: {
      preset: "storm",
      windSpeed: 18.0,
      turbulence: 0.8
    },
    aircraftSetup: {
      payloadKg: 3.5
    },
    objectives: [
      {
        id: "obj-bi-nav",
        title: "Displace 150 meters",
        description: "Fly 150 meters away from the launch pad to reach the inspection zone.",
        type: "NAVIGATION",
        condition: {
          targetDistance: 150.0,
          minDuration: 5.0
        }
      },
      {
        id: "obj-bi-hover",
        title: "Station Keep",
        description: "Hold your position against the wind for 10 seconds.",
        type: "STABILITY",
        condition: {
          maxDriftVelocity: 2.0,
          maxTiltDeg: 45.0,
          minDuration: 10.0
        }
      }
    ],
    debriefTopics: [
      "Inertia Management with Heavy Payloads",
      "Using aggressive pitch to fight high-speed winds",
      "Autopilot limitations in chaotic turbulence"
    ]
  },
  {
    id: "scen-emergency-rth",
    title: "Mission: Emergency Motor Failure",
    description: "A bird strike has destroyed Motor 4. Recover the aircraft and land safely.",
    learningObjective: "Learning asymmetric thrust handling and emergency controlled descent.",
    briefing: {
      initialConditions: "Hovering at 50m. Motor 4 instantly fails (0% health).",
      whatToObserve: "The drone will violently pitch/roll toward the dead motor. The flight controller will attempt to compensate but lose altitude.",
      availableControls: "Full controls. Expect severe control lag and yaw spinning."
    },
    environmentSetup: {
      preset: "normal"
    },
    aircraftSetup: {
      motorHealth: { 3: 0.0 }
    },
    objectives: [
      {
        id: "obj-em-survive",
        title: "Survive the failure",
        description: "Maintain control for 5 seconds without crashing.",
        type: "OBSERVATION",
        condition: {
          minDuration: 5.0
        }
      },
      {
        id: "obj-em-land",
        title: "Emergency Landing",
        description: "Bring the drone down to the ground in one piece.",
        type: "LANDING",
        condition: {
          minDuration: 2.0
        }
      }
    ],
    debriefTopics: [
      "Vortex Ring State and uncontrolled descent",
      "Asymmetric thrust physics",
      "Trading altitude for stability"
    ]
  }
];
