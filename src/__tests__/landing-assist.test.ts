/**
 * DronePilot - Phase F Precision Landing Assist FSM & Safety Verification Suite
 * Includes Non-Finite Guarding, Instant Manual Override, and Freshness Watchdog.
 */

import { LandingAssistController } from "../lib/vision/landing-assist-fsm";
import { FlightInput, TelemetryState } from "../lib/simulation/types";
import { VisionDetectionResult } from "../lib/vision/browser-inference";

function createMockTelemetry(altitude = 15.0, velY = 0.0): TelemetryState {
  return {
    altitude,
    position: { x: 0, y: altitude, z: 0 },
    velocity: { x: 0, y: velY, z: 0 },
    rotation: { pitch: 0, roll: 0, yaw: 0 },
    groundSpeed: 0,
    verticalSpeed: velY,
    heading: 0,
    batteryLevel: 90,
    batteryVoltage: 15.8,
    flightTimeSeconds: 10,
    flightMode: "HOVER",
    isArmed: true,
    rotorRpmPercent: 65,
    distanceFromHome: 0,
    flightPath: [],
    motorOutputs: [0.65, 0.65, 0.65, 0.65],
    isCrashed: false,
  };
}

function createMockInput(overrides: Partial<FlightInput> = {}): FlightInput {
  return {
    throttle: 0,
    pitch: 0,
    roll: 0,
    yaw: 0,
    hoverHold: true,
    reset: false,
    cameraToggle: false,
    ...overrides,
  };
}

function createMockDetection(
  isDetected = true,
  confidence = 0.85,
  u = 0.5,
  v = 0.5,
  timestampMs?: number
): VisionDetectionResult {
  const ts = timestampMs ?? Date.now();
  return {
    status: isDetected ? "DETECTED" : "NO_TARGET",
    confidence,
    isDetected,
    center: { u, v, pixelX: u * 224, pixelY: v * 224 },
    bbox: { xMin: Math.max(0, u - 0.15), yMin: Math.max(0, v - 0.15), xMax: Math.min(1, u + 0.15), yMax: Math.min(1, v + 0.15) },
    predictedScene: "Field",
    sceneConfidence: 0.9,
    latencyMs: 18,
    timestampMs: ts,
    captureTimestampMs: ts - 18,
  };
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

async function runTests() {
  console.log("\n=== RUNNING PHASE F HARDENED LANDING ASSIST FSM & SAFETY SUITE ===\n");

  let passed = 0;

  // Test 1: Initial state is DISABLED
  {
    const controller = new LandingAssistController();
    const rawInput = createMockInput();
    const telem = createMockTelemetry();
    const det = createMockDetection(true, 0.9, 0.5, 0.5);

    const out = controller.step(rawInput, telem, det, 0.05);
    assert(controller.getState() === "DISABLED", "Initial state is strictly DISABLED");
    assert(out.pitch === 0 && out.roll === 0, "Zero guidance commands issued when DISABLED");
    assert(controller.getIsEnabled() === false, "getIsEnabled() is false on initialization");
    passed += 3;
  }

  // Test 2: Enabling transitions to SEARCHING
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    assert(controller.getState() === "SEARCHING", "Enabling controller transitions to SEARCHING state");
    assert(controller.getIsEnabled() === true, "getIsEnabled() returns true after enabling");
    passed += 2;
  }

  // Test 3: Weak confidence does not trigger acquisition
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const rawInput = createMockInput();
    const telem = createMockTelemetry();
    const weakDet = createMockDetection(true, 0.40, 0.5, 0.5); // Under 0.65 threshold

    controller.step(rawInput, telem, weakDet, 0.05);
    assert(controller.getState() === "SEARCHING", "Confidence below 0.65 threshold stays in SEARCHING state");
    passed++;
  }

  // Test 4: Confident detection triggers acquisition and alignment
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const rawInput = createMockInput();
    const telem = createMockTelemetry();
    const strongDet = createMockDetection(true, 0.90, 0.70, 0.30); // Target at right (+X) and forward (-Z)

    // Step across verification window (250ms)
    controller.step(rawInput, telem, strongDet, 0.10);
    controller.step(rawInput, telem, strongDet, 0.10);
    controller.step(rawInput, telem, strongDet, 0.10);

    assert(
      controller.getState() === "ALIGNING" || controller.getState() === "TARGET_ACQUIRED",
      "Stable confident detection transitions to terminal tracking"
    );
    passed++;
  }

  // Test 5: Sign verification of centering guidance commands
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const rawInput = createMockInput();
    const telem = createMockTelemetry();
    
    // Target is to the right (u = 0.70 > 0.5) and forward (v = 0.30 < 0.5)
    const offsetDet = createMockDetection(true, 0.95, 0.70, 0.30);

    // Warm up acquisition
    for (let i = 0; i < 4; i++) controller.step(rawInput, telem, offsetDet, 0.1);

    const guidedInput = controller.step(rawInput, telem, offsetDet, 0.05);

    // Camera coordinate convention checks:
    // u > 0.5 -> Target is to aircraft right -> Command positive roll (bank right)
    assert(guidedInput.roll > 0, "Target right (u=0.70) commands positive roll correction (bank right)");
    // v < 0.5 -> Target is forward of drone -> Command forward pitch correction (pitch < 0 in DronePilot input convention)
    assert(guidedInput.pitch < 0, "Target forward (v=0.30) commands forward pitch correction (pitch < 0)");

    // Conservative safety limits check
    assert(Math.abs(guidedInput.roll) <= 0.15, "Roll command is clamped within conservative safety limit (<= 0.15)");
    assert(Math.abs(guidedInput.pitch) <= 0.15, "Pitch command is clamped within conservative safety limit (<= 0.15)");
    passed += 4;
  }

  // Test 6: Centered target transitions to DESCENDING with controlled sink rate
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const rawInput = createMockInput();
    const telem = createMockTelemetry(10.0);
    const centeredDet = createMockDetection(true, 0.95, 0.50, 0.50); // Perfectly centered

    // Step to acquire and center
    for (let i = 0; i < 5; i++) controller.step(rawInput, telem, centeredDet, 0.1);

    assert(controller.getState() === "DESCENDING", "Centered target transitions to DESCENDING state");

    const descInput = controller.step(rawInput, telem, centeredDet, 0.05);
    assert(descInput.throttle < 0, "DESCENDING state commands gentle downward throttle offset (-0.15)");
    passed += 2;
  }

  // Test 7: Target loss timeout triggers ABORT_OR_GO_AROUND
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const rawInput = createMockInput();
    const telem = createMockTelemetry(10.0);
    const centeredDet = createMockDetection(true, 0.95, 0.50, 0.50);

    for (let i = 0; i < 5; i++) controller.step(rawInput, telem, centeredDet, 0.1);

    // Suddenly lose detection (target occluded or drone drifts out of view)
    const lostDet = createMockDetection(false, 0.1, 0.5, 0.5);
    // Step for 900ms (exceeding 800ms TARGET_LOSS_TIMEOUT)
    for (let i = 0; i < 9; i++) controller.step(rawInput, telem, lostDet, 0.1);

    assert(controller.getState() === "ABORT_OR_GO_AROUND", "Target lost for > 800ms triggers ABORT_OR_GO_AROUND safely");
    passed++;
  }

  // Test 8: F3 Hardened Manual Override — Disables assistance immediately
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(8.0);
    const centeredDet = createMockDetection(true, 0.95, 0.50, 0.50);

    // Acquire and descend
    for (let i = 0; i < 5; i++) controller.step(createMockInput(), telem, centeredDet, 0.1);
    assert(controller.getState() === "DESCENDING", "Controller in active descent prior to override");

    // Pilot applies stick input
    const manualStick = createMockInput({ pitch: 0.55 });
    const overrideOut = controller.step(manualStick, telem, centeredDet, 0.05);

    assert(controller.getState() === "DISABLED", "Manual override immediately transitions state to DISABLED");
    assert(controller.getIsEnabled() === false, "Manual override immediately sets isEnabled to false");
    assert(overrideOut.pitch === 0.55, "Manual pilot command remains 100% authoritative and unaltered");
    passed += 3;
  }

  // Test 9: F3 Centering sticks afterward does not reactivate assistance
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(8.0);
    const centeredDet = createMockDetection(true, 0.95, 0.50, 0.50);

    for (let i = 0; i < 5; i++) controller.step(createMockInput(), telem, centeredDet, 0.1);

    // Override
    controller.step(createMockInput({ roll: -0.40 }), telem, centeredDet, 0.05);

    // Next frames: pilot centers sticks back to 0
    const centeredSticks = createMockInput({ pitch: 0, roll: 0, throttle: 0 });
    const afterOut = controller.step(centeredSticks, telem, centeredDet, 0.05);

    assert(controller.getState() === "DISABLED", "Centering sticks keeps controller in DISABLED state");
    assert(controller.getIsEnabled() === false, "Assistance remains disengaged after centering sticks");
    assert(afterOut.pitch === 0 && afterOut.roll === 0 && afterOut.throttle === 0, "No residual AI guidance commands emitted after stick release");
    passed += 3;
  }

  // Test 10: F3 No delayed AI command or go-around emitted
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(8.0);
    const centeredDet = createMockDetection(true, 0.95, 0.50, 0.50);

    for (let i = 0; i < 5; i++) controller.step(createMockInput(), telem, centeredDet, 0.1);
    controller.step(createMockInput({ throttle: 0.30 }), telem, centeredDet, 0.05);

    // Simulate 3 seconds passing with centered sticks
    let allZero = true;
    for (let i = 0; i < 30; i++) {
      const out = controller.step(createMockInput(), telem, centeredDet, 0.1);
      if (out.pitch !== 0 || out.roll !== 0 || out.throttle !== 0) {
        allZero = false;
      }
    }
    assert(allZero, "Zero delayed AI commands across 3.0s window after override");
    passed++;
  }

  // Test 11: F3 Explicit reactivation is strictly required
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(8.0);
    const centeredDet = createMockDetection(true, 0.95, 0.50, 0.50);

    controller.step(createMockInput({ pitch: 0.4 }), telem, centeredDet, 0.05);
    assert(controller.getIsEnabled() === false, "Controller is disabled after override");

    // Explicit opt-in
    controller.setEnabled(true);
    assert(controller.getIsEnabled() === true, "Explicit opt-in re-enables controller");
    assert(controller.getState() === "SEARCHING", "Re-enabled controller resets to SEARCHING state");
    passed += 3;
  }

  // Test 12: F2 Non-finite confidence (NaN/Infinity) rejected
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);
    
    // Inject NaN confidence
    const nanDet = createMockDetection(true, NaN, 0.5, 0.5);
    const out = controller.step(createMockInput(), telem, nanDet, 0.05);

    assert(controller.getState() === "SEARCHING", "NaN confidence prevents target acquisition (stays SEARCHING)");
    assert(Number.isFinite(out.pitch) && Number.isFinite(out.roll) && Number.isFinite(out.throttle), "Outputs are strictly finite despite NaN confidence");
    passed += 2;
  }

  // Test 13: F2 Non-finite center coordinates (NaN / Inf) rejected safely
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);
    
    // Warm up to ALIGNING with valid target
    const validDet = createMockDetection(true, 0.95, 0.70, 0.30);
    for (let i = 0; i < 5; i++) controller.step(createMockInput(), telem, validDet, 0.1);
    assert(controller.getState() === "ALIGNING", "Controller in ALIGNING state");

    // Corrupt center coordinates to NaN and Infinity
    const corruptedDet: VisionDetectionResult = {
      ...validDet,
      center: { u: NaN, v: Infinity, pixelX: NaN, pixelY: Infinity },
    };

    const out = controller.step(createMockInput(), telem, corruptedDet, 0.05);
    assert(Number.isFinite(out.pitch) && out.pitch === 0, "Corrupted center results in finite zero pitch command");
    assert(Number.isFinite(out.roll) && out.roll === 0, "Corrupted center results in finite zero roll command");
    assert(Number.isFinite(out.throttle) && out.throttle === 0, "Corrupted center results in finite zero throttle command");
    passed += 4;
  }

  // Test 14: F2 Malformed bounding box rejected as invalid target
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    const malformedBoxDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      bbox: { xMin: 0.8, yMin: 0.8, xMax: 0.2, yMax: 0.2 }, // Inverted box: xMin > xMax
    };

    controller.step(createMockInput(), telem, malformedBoxDet, 0.05);
    assert(controller.getState() === "SEARCHING", "Inverted bounding box rejected (stays SEARCHING)");
    passed++;
  }

  // Test 15: F2 Inference status INVALID or ERROR rejected
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    const invalidStatusDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      status: "INVALID",
      invalidReason: "Model output tensor dimensions insufficient",
    };

    controller.step(createMockInput(), telem, invalidStatusDet, 0.05);
    assert(controller.getState() === "SEARCHING", "INVALID status detection rejected (stays SEARCHING)");
    passed++;
  }

  // Test 16: F2 Non-finite telemetry (NaN altitude) handled safely
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const badTelem = createMockTelemetry(NaN, 0.0);
    const validDet = createMockDetection(true, 0.95, 0.5, 0.5);

    const out = controller.step(createMockInput(), badTelem, validDet, 0.05);
    assert(Number.isFinite(out.pitch) && Number.isFinite(out.roll) && Number.isFinite(out.throttle), "NaN altitude telemetry yields strictly finite control commands");
    passed++;
  }

  // Test 17: F4 Inference Freshness Watchdog — Stale detection rejected
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    const baseClock = 1000000;
    // Frame is 500ms old (> 350ms MAX_DETECTION_AGE_MS)
    const staleDet = createMockDetection(true, 0.95, 0.5, 0.5, baseClock - 500);

    controller.step(createMockInput(), telem, staleDet, 0.05, baseClock);
    assert(controller.getState() === "SEARCHING", "Stale detection (age 500ms > 350ms) rejected, remains in SEARCHING");
    passed++;
  }

  // Test 18: F4 Stale detection halts descent immediately
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    let simClock = 2000000;
    const freshCentered = () => createMockDetection(true, 0.95, 0.5, 0.5, simClock);

    // Step into DESCENDING state
    for (let i = 0; i < 5; i++) {
      controller.step(createMockInput(), telem, freshCentered(), 0.1, simClock);
      simClock += 100;
    }
    assert(controller.getState() === "DESCENDING", "Controller entered DESCENDING state");

    // Sudden pipeline freeze: frame timestamp stops updating while simulation clock advances by 400ms
    const frozenFrame = createMockDetection(true, 0.95, 0.5, 0.5, simClock - 450);
    const frozenOut = controller.step(createMockInput(), telem, frozenFrame, 0.05, simClock);

    assert(frozenOut.throttle === 0, "Stale frame during descent cancels downward descent bias (throttle clamped to 0)");
    assert(frozenOut.hoverHold === true, "Stale frame enforces level hover hold");
    passed += 3;
  }

  // Test 19: F4 Sustained stale detection triggers ABORT_OR_GO_AROUND
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    let simClock = 3000000;
    const freshCentered = () => createMockDetection(true, 0.95, 0.5, 0.5, simClock);

    for (let i = 0; i < 5; i++) {
      controller.step(createMockInput(), telem, freshCentered(), 0.1, simClock);
      simClock += 100;
    }

    // Advance clock 1500ms with frozen detection timestamp (350ms freshness threshold + 800ms loss timeout = 1150ms)
    const frozenTimestamp = simClock;
    for (let i = 0; i < 15; i++) {
      simClock += 100;
      const staleFrame = createMockDetection(true, 0.95, 0.5, 0.5, frozenTimestamp);
      controller.step(createMockInput(), telem, staleFrame, 0.1, simClock);
    }

    assert(controller.getState() === "ABORT_OR_GO_AROUND", "Sustained stale detection (> 800ms) triggers ABORT_OR_GO_AROUND safely");
    passed++;
  }

  // Test 20: Touchdown verification confirms landing
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const centeredDet = createMockDetection(true, 0.95, 0.50, 0.50);

    // At ground level (h = 0.05m, resting velY = 0)
    const groundTelem = createMockTelemetry(0.05, 0.0);

    // Push into descent & touchdown verify
    for (let i = 0; i < 5; i++) controller.step(createMockInput(), createMockTelemetry(0.12), centeredDet, 0.1);
    controller.step(createMockInput(), groundTelem, centeredDet, 0.1);

    assert(controller.getState() === "COMPLETE", "Touching ground surface confirms touchdown and transitions to COMPLETE");
    passed++;
  }

  // Test 21: Fix 1 — Fresh image processed quickly (age 60ms <= 350ms accepted)
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);
    const baseClock = 5000000;
    const captureMs = baseClock - 60;
    const completionMs = baseClock - 10;

    const freshDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: completionMs,
      captureTimestampMs: captureMs,
    };

    // Step with current decision clock at baseClock
    const out = controller.step(createMockInput(), telem, freshDet, 0.05, baseClock);
    assert(controller.getLastAcceptedCaptureTimestampMs() === captureMs, "Fresh detection (60ms age <= 350ms) accepted and updates lastAcceptedCaptureTimestampMs");
    assert(controller.getLastAcceptedCompletionTimestampMs() === completionMs, "lastAcceptedCompletionTimestampMs correctly recorded");
    assert(controller.getTimeSinceLastSuccessfulDetectionMs(baseClock) === 10, "timeSinceLastSuccessfulDetectionMs measures time since completion");
    assert(out.hoverHold === true, "Fresh frame maintains active guidance / hover hold");
    passed += 4;
  }

  // Test 22: Fix 1 — Image older than 350ms when inference completes (slow 420ms inference rejected immediately)
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    let simClock = 6000000;
    const freshCentered = () => ({
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: simClock - 10,
      captureTimestampMs: simClock - 30,
    });

    // Advance into DESCENDING state
    for (let i = 0; i < 5; i++) {
      controller.step(createMockInput(), telem, freshCentered(), 0.1, simClock);
      simClock += 100;
    }
    assert(controller.getState() === "DESCENDING", "Controller reached DESCENDING state");

    const acceptedCaptureBeforeSlow = controller.getLastAcceptedCaptureTimestampMs();

    // Now a slow inference completes: capture occurred 420ms ago (> 350ms watchdog threshold)
    const slowDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: simClock,
      captureTimestampMs: simClock - 420,
    };

    const out = controller.step(createMockInput(), telem, slowDet, 0.05, simClock);
    assert(out.throttle === 0, "Slow inference (age 420ms > 350ms) rejected immediately, descent throttle clamped to 0");
    assert(out.pitch === 0 && out.roll === 0, "Zero guidance tilt commands issued on stale inference");
    assert(out.hoverHold === true, "Level hover hold maintained on stale inference");
    assert(controller.getLastAcceptedCaptureTimestampMs() === acceptedCaptureBeforeSlow, "Stale detection does NOT update lastAcceptedCaptureTimestampMs");
    passed += 4;
  }

  // Test 23: Fix 1 — Slow inference result returning after a newer detection (sequence integrity guard)
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    const baseClock = 7000000;

    // Frame 1 captured at baseClock - 100, completed at baseClock - 50
    const frame1: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: baseClock - 50,
      captureTimestampMs: baseClock - 100,
    };
    controller.step(createMockInput(), telem, frame1, 0.05, baseClock - 50);
    assert(controller.getLastAcceptedCaptureTimestampMs() === baseClock - 100, "Frame 1 accepted");

    // Frame 2 captured at baseClock - 20, completed at baseClock
    const frame2: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: baseClock,
      captureTimestampMs: baseClock - 20,
    };
    controller.step(createMockInput(), telem, frame2, 0.05, baseClock);
    assert(controller.getLastAcceptedCaptureTimestampMs() === baseClock - 20, "Frame 2 accepted with newer capture time");

    // Frame 3 arrives late! Captured at baseClock - 60 (older than Frame 2's capture), finished at baseClock + 10
    const lateFrame: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.8, 0.8), // Offset target center
      timestampMs: baseClock + 10,
      captureTimestampMs: baseClock - 60, // Out of order!
    };
    const outLate = controller.step(createMockInput(), telem, lateFrame, 0.05, baseClock + 10);
    assert(controller.getLastAcceptedCaptureTimestampMs() === baseClock - 20, "Late out-of-order frame rejected, lastAcceptedCaptureTimestampMs preserved");
    assert(outLate.pitch === 0 && outLate.roll === 0, "Zero guidance issued from out-of-order frame");
    passed += 4;
  }

  // Test 24: Fix 1 — Missing, non-finite, or inconsistent capture timestamps fail safely
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);
    const clock = 8000000;

    // Subtest A: undefined capture timestamp
    const noCaptureDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: clock - 10,
      captureTimestampMs: undefined,
    };
    const outA = controller.step(createMockInput(), telem, noCaptureDet, 0.05, clock);
    assert(outA.pitch === 0 && outA.roll === 0, "Undefined capture timestamp rejected safely");
    assert(controller.getLastAcceptedCaptureTimestampMs() === 0, "Undefined capture timestamp not accepted");

    // Subtest B: NaN capture timestamp
    const nanCaptureDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: clock - 10,
      captureTimestampMs: NaN,
    };
    const outB = controller.step(createMockInput(), telem, nanCaptureDet, 0.05, clock);
    assert(outB.pitch === 0 && outB.roll === 0, "NaN capture timestamp rejected safely");

    // Subtest C: Inconsistent timestamps (capture occurred AFTER completion)
    const invertedDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: clock - 50,
      captureTimestampMs: clock - 10, // Inconsistent: capture > completion
    };
    const outC = controller.step(createMockInput(), telem, invertedDet, 0.05, clock);
    assert(outC.pitch === 0 && outC.roll === 0, "Inconsistent capture > completion timestamp rejected safely");

    // Subtest D: Future capture timestamp (capture occurred in future relative to decision clock)
    const futureDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: clock + 500,
      captureTimestampMs: clock + 400, // Future!
    };
    const outD = controller.step(createMockInput(), telem, futureDet, 0.05, clock);
    assert(outD.pitch === 0 && outD.roll === 0, "Future capture timestamp rejected safely");
    assert(controller.getLastAcceptedCaptureTimestampMs() === 0, "No invalid timestamps accepted into state");
    passed += 6;
  }

  // Test 25: Fix 1 — Target loss while inference is running (immediate descent cancellation, hover hold, abort after 800ms)
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    let simClock = 9000000;
    const freshCentered = () => ({
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: simClock - 10,
      captureTimestampMs: simClock - 30,
    });

    // Advance to DESCENDING state
    for (let i = 0; i < 5; i++) {
      controller.step(createMockInput(), telem, freshCentered(), 0.1, simClock);
      simClock += 100;
    }
    assert(controller.getState() === "DESCENDING", "Controller in DESCENDING state");

    // Target lost frame (e.g. helipad obscured or drone drifted)
    const lostDet: VisionDetectionResult = {
      ...createMockDetection(false, 0.1, 0.5, 0.5),
      timestampMs: simClock - 10,
      captureTimestampMs: simClock - 30,
      isDetected: false,
      status: "NO_TARGET",
    };

    const outLost = controller.step(createMockInput(), telem, lostDet, 0.05, simClock);
    assert(outLost.throttle === 0, "Target loss immediately cancels descent (throttle clamped to 0)");
    assert(outLost.pitch === 0 && outLost.roll === 0, "Guidance tilt commands zeroed during target loss");
    assert(outLost.hoverHold === true, "Level hover hold maintained during target loss");

    // Step beyond 800ms target loss timeout
    for (let i = 0; i < 9; i++) {
      simClock += 100;
      controller.step(createMockInput(), telem, {
        ...lostDet,
        timestampMs: simClock - 10,
        captureTimestampMs: simClock - 30,
      }, 0.1, simClock);
    }

    assert(controller.getState() === "ABORT_OR_GO_AROUND", "Target lost for > 800ms transitions safely to ABORT_OR_GO_AROUND");
    passed += 5;
  }

  // Test 26: Fix 1 — Manual override while inference is running (immediate disable, late return does not re-enable)
  {
    const controller = new LandingAssistController();
    controller.setEnabled(true);
    const telem = createMockTelemetry(10.0);

    let simClock = 10000000;
    const freshCentered = () => ({
      ...createMockDetection(true, 0.95, 0.5, 0.5),
      timestampMs: simClock - 10,
      captureTimestampMs: simClock - 30,
    });

    // Step into DESCENDING
    for (let i = 0; i < 5; i++) {
      controller.step(createMockInput(), telem, freshCentered(), 0.1, simClock);
      simClock += 100;
    }
    assert(controller.getState() === "DESCENDING", "Controller active in DESCENDING");

    // Pilot applies manual pitch stick input
    const manualInput = createMockInput({ pitch: 0.35 });
    const outManual = controller.step(manualInput, telem, freshCentered(), 0.05, simClock);

    assert(controller.getState() === "DISABLED", "Manual stick input immediately forces state to DISABLED");
    assert(controller.getIsEnabled() === false, "Landing assist isEnabled immediately flipped to false");
    assert(outManual.pitch === 0.35, "Pilot manual stick command passed through unhindered");

    // Subsequent late or fresh inference result arrives — controller must NOT re-engage
    simClock += 100;
    const lateResultDet: VisionDetectionResult = {
      ...createMockDetection(true, 0.98, 0.5, 0.5),
      timestampMs: simClock - 5,
      captureTimestampMs: simClock - 25,
    };
    const outSubsequent = controller.step(createMockInput(), telem, lateResultDet, 0.05, simClock);
    assert(controller.getState() === "DISABLED", "Late inference arrival cannot re-enable assist (remains DISABLED)");
    assert(controller.getIsEnabled() === false, "isEnabled remains strictly false");
    assert(outSubsequent.pitch === 0 && outSubsequent.roll === 0, "No guidance issued while disabled");
    passed += 6;
  }

  console.log(`\nTEST SUMMARY: ${passed} PASSED, 0 FAILED\n`);
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
