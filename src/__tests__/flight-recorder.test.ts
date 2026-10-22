// ==========================================================
// DRONE PILOT — FLIGHT RECORDER & STANDARDIZED TELEMETRY TEST SUITE
// Verifies flightRunId uniqueness, monotonic sequences, schema fidelity,
// variable motor channels (up to 8), physics-based landing assessment,
// and standardized CSV & JSON export formats.
// ==========================================================

import {
  FlightRecorder,
  TELEMETRY_CSV_HEADERS,
  formatFrameToCSVRow,
} from "../lib/simulation/flight-recorder";
import { TelemetryState, ReplayFrame } from "../lib/simulation/types";

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passCount++;
  } else {
    console.error(`  ✕ FAIL: ${testName}${detail ? ` — ${detail}` : ""}`);
    failCount++;
  }
}

function createMockTelemetry(overrides: Partial<TelemetryState> = {}): TelemetryState {
  return {
    position: { x: 10.5, y: 15.2, z: -4.3 },
    velocity: { x: 1.2, y: -0.4, z: 0.8 },
    acceleration: { x: 0.1, y: -0.05, z: 0.08 },
    rotation: { pitch: 0.05, roll: -0.02, yaw: 1.57 },
    altitude: 15.2,
    altitudeMsl: 16.4,
    groundSpeed: 18.5,
    verticalSpeed: -0.4,
    heading: 90,
    batteryLevel: 94.5,
    batteryVoltage: 16.12,
    batteryCurrentAmps: 18.4,
    batteryPowerWatts: 296.6,
    batteryRemainingMah: 4725,
    flightTimeSeconds: 12.5,
    flightMode: "HOVER",
    isArmed: true,
    rotorRpmPercent: 62,
    motorOutputs: [0.62, 0.61, 0.63, 0.62],
    distanceFromHome: 11.3,
    flightPath: [{ x: 0, z: 0 }, { x: 10.5, z: -4.3 }],
    ...overrides,
  };
}

export function runFlightRecorderTests() {
  console.log("\n=== RUNNING FLIGHT RECORDER & STANDARDIZED TELEMETRY TESTS ===\n");

  const recorder = new FlightRecorder();

  // ----------------------------------------------------------
  // Test 1: Unique flightRunId Generation
  // ----------------------------------------------------------
  const id1 = recorder.getFlightRunId();
  assert(
    typeof id1 === "string" && id1.startsWith("run_") && id1.length >= 10,
    "Generates valid unique flightRunId on instantiation",
    `Received: ${id1}`
  );

  recorder.reset();
  const id2 = recorder.getFlightRunId();
  assert(
    id1 !== id2 && id2.startsWith("run_"),
    "Generates distinct new flightRunId on reset()",
    `id1: ${id1}, id2: ${id2}`
  );

  // ----------------------------------------------------------
  // Test 2: Monotonic Sequence Numbers & Timestamps
  // ----------------------------------------------------------
  recorder.setFlightContext({
    droneName: "Training Quadcopter",
    airframeType: "quadcopter",
    targetHelipadId: "training-alpha",
  });

  for (let i = 0; i < 5; i++) {
    const telem = createMockTelemetry({
      flightTimeSeconds: i * 0.05,
      altitude: 10 + i * 0.2,
    });
    recorder.recordFrame(telem, 0.05);
  }

  const frames = recorder.getFrames();
  assert(frames.length === 5, "Captures expected number of sample frames", `Count: ${frames.length}`);

  let sequencesMonotonic = true;
  let timesMonotonic = true;
  for (let i = 0; i < frames.length; i++) {
    if (frames[i].sequenceNumber !== i) sequencesMonotonic = false;
    if (i > 0 && frames[i].timeSeconds <= frames[i - 1].timeSeconds) timesMonotonic = false;
  }

  assert(
    sequencesMonotonic,
    "Sequence numbers start at 0 and increment strictly monotonically",
    `Sequences: ${frames.map((f) => f.sequenceNumber).join(", ")}`
  );
  assert(
    timesMonotonic,
    "Simulation timestamps progress monotonically without regression",
    `Times: ${frames.map((f) => f.timeSeconds).join(", ")}`
  );

  // ----------------------------------------------------------
  // Test 3: Telemetry Schema & Electrical Properties Capture
  // ----------------------------------------------------------
  const sampleFrame = frames[0];
  assert(
    sampleFrame.flightRunId === id2 &&
      sampleFrame.airframeType === "quadcopter" &&
      sampleFrame.targetHelipadId === "training-alpha" &&
      sampleFrame.batteryVoltage === 16.12 &&
      sampleFrame.batteryCurrentAmps === 18.4 &&
      sampleFrame.batteryPowerWatts === 296.6 &&
      sampleFrame.batteryRemainingMah === 4725 &&
      sampleFrame.acceleration?.x === 0.1,
    "Telemetry frame captures full context, electrical dynamics, and kinematics"
  );

  // ----------------------------------------------------------
  // Test 4: Variable Motor Counts (4, 6, and 8 Motors)
  // ----------------------------------------------------------
  // Quadcopter (4 motors)
  const quadFrame: ReplayFrame = {
    timeSeconds: 1.0,
    position: { x: 0, y: 1, z: 0 },
    rotation: { pitch: 0, roll: 0, yaw: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    motorOutputs: [0.55, 0.55, 0.55, 0.55],
    batteryLevel: 98,
    altitudeAgl: 1.0,
    groundSpeedKmh: 0,
    flightMode: "HOVER",
  };
  const quadRow = formatFrameToCSVRow(quadFrame);
  const motorCountIdx = TELEMETRY_CSV_HEADERS.indexOf("Motor_Count");
  const m1Idx = TELEMETRY_CSV_HEADERS.indexOf("Motor_1_Throttle_Pct");
  const m4Idx = TELEMETRY_CSV_HEADERS.indexOf("Motor_4_Throttle_Pct");
  const m5Idx = TELEMETRY_CSV_HEADERS.indexOf("Motor_5_Throttle_Pct");
  const m8Idx = TELEMETRY_CSV_HEADERS.indexOf("Motor_8_Throttle_Pct");

  assert(
    quadRow[motorCountIdx] === "4" &&
      quadRow[m1Idx] === "55.0" &&
      quadRow[m4Idx] === "55.0" &&
      quadRow[m5Idx] === "" &&
      quadRow[m8Idx] === "",
    "Quadcopter CSV row formats 4 motors and leaves channels 5-8 as empty strings"
  );

  // Octacopter (8 motors)
  const octaFrame: ReplayFrame = {
    ...quadFrame,
    motorOutputs: [0.6, 0.61, 0.62, 0.63, 0.64, 0.65, 0.66, 0.67],
  };
  const octaRow = formatFrameToCSVRow(octaFrame);
  assert(
    octaRow[motorCountIdx] === "8" &&
      octaRow[m1Idx] === "60.0" &&
      octaRow[m5Idx] === "64.0" &&
      octaRow[m8Idx] === "67.0",
    "Octacopter CSV row populates all 8 motor channels accurately"
  );

  // ----------------------------------------------------------
  // Test 5: Distinction Between Measured Zero and Missing Data
  // ----------------------------------------------------------
  const zeroFrame: ReplayFrame = {
    timeSeconds: 0.0,
    position: { x: 0, y: 0, z: 0 },
    rotation: { pitch: 0, roll: 0, yaw: 0 },
    velocity: { x: 0, y: 0, z: 0 },
    motorOutputs: [0, 0, 0, 0],
    batteryLevel: 100,
    altitudeAgl: 0.0,
    groundSpeedKmh: 0.0,
    flightMode: "MANUAL",
    // Notice: altitudeMsl, batteryVoltage, batteryCurrentAmps, batteryPowerWatts omitted
  };
  const zeroRow = formatFrameToCSVRow(zeroFrame);
  const posXIdx = TELEMETRY_CSV_HEADERS.indexOf("Position_X_M");
  const mslIdx = TELEMETRY_CSV_HEADERS.indexOf("Altitude_MSL_M");
  const voltIdx = TELEMETRY_CSV_HEADERS.indexOf("Battery_Voltage_V");

  assert(
    zeroRow[posXIdx] === "0.00" && zeroRow[m1Idx] === "0.0" && zeroRow[mslIdx] === "" && zeroRow[voltIdx] === "",
    "Clearly distinguishes measured zero (0.00 / 0.0) from omitted/unmodeled fields (\"\")"
  );

  // ----------------------------------------------------------
  // Test 6: Standardized CSV Header Integrity
  // ----------------------------------------------------------
  assert(
    TELEMETRY_CSV_HEADERS.length === 36 &&
      TELEMETRY_CSV_HEADERS[0] === "Flight_Run_ID" &&
      TELEMETRY_CSV_HEADERS[1] === "Sequence_Number" &&
      TELEMETRY_CSV_HEADERS[2] === "Time_Seconds" &&
      TELEMETRY_CSV_HEADERS[35] === "Event_Marker",
    "TELEMETRY_CSV_HEADERS conforms to complete standardized 36-column schema",
    `Length: ${TELEMETRY_CSV_HEADERS.length}`
  );

  const csvOutput = recorder.exportToCSV();
  const csvLines = csvOutput.trim().split("\n");
  assert(
    csvLines.length === 6 && csvLines[0] === TELEMETRY_CSV_HEADERS.join(","),
    "exportToCSV outputs valid RFC-compliant CSV with matching header line and row count"
  );

  // ----------------------------------------------------------
  // Test 7: Structured JSON Export Fidelity
  // ----------------------------------------------------------
  const jsonOutput = recorder.exportToJSON("Training Quadcopter");
  let parsedJson: any = null;
  try {
    parsedJson = JSON.parse(jsonOutput);
  } catch (err) {
    parsedJson = null;
  }

  assert(
    parsedJson !== null &&
      parsedJson.metadata?.flightRunId === id2 &&
      parsedJson.metadata?.droneName === "Training Quadcopter" &&
      parsedJson.metadata?.targetHelipadId === "training-alpha" &&
      Array.isArray(parsedJson.frames) &&
      parsedJson.frames.length === 5,
    "exportToJSON generates valid parseable JSON matching schema metadata and frame array"
  );

  // ----------------------------------------------------------
  // Test 8: Physics-Grounded Landing Evaluation
  // ----------------------------------------------------------
  // Case A: Catastrophic crash
  const crashReport = recorder.generateAnalysis("Training Quadcopter", {
    isCrashed: true,
    impactSpeedKmh: 48.2,
    impactSpeedMs: 13.4,
    impactLocation: { x: 10, y: 0, z: -4 },
    kineticEnergyJoules: 112.5,
    impactNormal: { x: 0, y: 1, z: 0 },
    primaryCause: "High-speed vertical ground impact.",
    timestamp: Date.now(),
  });
  assert(crashReport.landingQuality === "CRASH", "Evaluates crash state as CRASH");

  // Case B: Debriefed while airborne (not yet landed)
  const airborneRecorder = new FlightRecorder();
  airborneRecorder.recordFrame(createMockTelemetry({ altitude: 25.0, velocity: { x: 2, y: 0, z: 2 } }), 0.05);
  const airborneReport = airborneRecorder.generateAnalysis("Airborne Drone", null);
  assert(
    airborneReport.landingQuality === "SMOOTH" && airborneReport.whatHappened.includes("airborne at 25.0m AGL"),
    "Accurately recognizes in-flight debrief without claiming completed touchdown"
  );

  // Case C: Precision soft touchdown (sub-0.6 m/s, minimal drift, level attitude)
  const softRecorder = new FlightRecorder();
  softRecorder.recordFrame(
    createMockTelemetry({
      altitude: 0.1,
      velocity: { x: 0.1, y: -0.3, z: 0.1 },
      groundSpeed: 0.5,
      rotation: { pitch: 0.01, roll: 0.01, yaw: 0 },
    }),
    0.05
  );
  const softReport = softRecorder.generateAnalysis("Soft Drone", null);
  assert(softReport.landingQuality === "PERFECT", "Evaluates stabilized soft touchdown as PERFECT");

  // Case D: Hard descent rate (>2.0 m/s touchdown)
  const hardRecorder = new FlightRecorder();
  hardRecorder.recordFrame(
    createMockTelemetry({
      altitude: 0.1,
      velocity: { x: 0, y: -2.8, z: 0 },
      groundSpeed: 2.0,
      rotation: { pitch: 0.02, roll: 0.02, yaw: 0 },
    }),
    0.05
  );
  const hardReport = hardRecorder.generateAnalysis("Hard Drone", null);
  assert(hardReport.landingQuality === "HARD", "Evaluates high sink-rate touchdown as HARD");

  // ----------------------------------------------------------
  // Test 9: Circular Buffer Retention & Memory Bounding
  // ----------------------------------------------------------
  const smallBufferRecorder = new FlightRecorder();
  // Record 6005 frames to test maxFrames (6000) ceiling
  for (let i = 0; i < 6005; i++) {
    smallBufferRecorder.recordFrame(createMockTelemetry({ flightTimeSeconds: i * 0.05 }), 0.05);
  }
  const boundedFrames = smallBufferRecorder.getFrames();
  assert(
    boundedFrames.length === 6000 && boundedFrames[0].timeSeconds > 0,
    "Enforces FIFO sliding-window limit to prevent unbounded memory growth",
    `Frames count: ${boundedFrames.length}`
  );

  console.log(`\nTEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED\n`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runFlightRecorderTests();
