/**
 * DronePilot - Pre-Touchdown Sink Rate Deterministic Test Suite
 * 
 * Verifies accurate measurement of pre-touchdown sink rate:
 * 1. Touchdown with a known nonzero downward velocity.
 * 2. Touchdown with zero vertical velocity.
 * 3. Abort or no-touchdown trial (never silently replaced with zero).
 * 4. Post-contact velocity clamped to zero while pre-contact sink rate is nonzero.
 * 5. Sign conversion under DronePilot coordinate convention (+Y up, downward-positive sink rate).
 */

import { TouchdownDetector } from "../lib/simulation/touchdown-detector";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  ❌ FAIL: ${message}`);
    throw new Error(message);
  } else {
    console.log(`  ✓ PASS: ${message}`);
  }
}

export function runTouchdownDetectorUnitTests() {
  console.log("\n=== RUNNING PRE-TOUCHDOWN SINK RATE DETERMINISTIC TEST SUITE ===\n");

  let passed = 0;

  // Test 1: Touchdown with a known nonzero downward velocity
  {
    console.log("[Test 1/5] Touchdown with known nonzero downward velocity...");
    const detector = new TouchdownDetector(0.55, 0.80);
    const preState = { posY: 1.465, velY: -0.45, groundLevel: 1.445 };
    const physics = { posY: 1.445, velY: 0.0, accelY: 0.0, groundLevel: 1.445 };

    const contact = detector.afterStep(preState, physics, 5.0, 0.02);
    assert(contact === true, "Detector identifies surface contact transition");
    const m = detector.getMetrics();
    assert(m.status === "TOUCHDOWN_MEASURED", "Status is TOUCHDOWN_MEASURED");
    assert(m.preContactSinkRateMs === 0.45, "Pre-contact sink rate accurately measures +0.45 m/s");
    assert(m.preContactVelocityYMs === -0.45, "Pre-contact velocity preserves -0.45 m/s in +Y up coordinate system");
    assert(m.isWithinAcceptanceLimit === true, "0.45 m/s is within the 0.80 m/s acceptance threshold");
    passed += 5;
  }

  // Test 2: Touchdown with zero vertical velocity
  {
    console.log("[Test 2/5] Touchdown with zero vertical velocity...");
    const detector = new TouchdownDetector(0.55, 0.80);
    const preState = { posY: 1.446, velY: 0.0, groundLevel: 1.445 };
    const physics = { posY: 1.445, velY: 0.0, accelY: 0.0, groundLevel: 1.445 };

    const contact = detector.afterStep(preState, physics, 6.2, 0.02);
    assert(contact === true, "Zero-velocity touchdown detected");
    const m = detector.getMetrics();
    assert(m.status === "TOUCHDOWN_MEASURED", "Status is TOUCHDOWN_MEASURED");
    assert(m.preContactSinkRateMs === 0.0, "Pre-contact sink rate is exactly 0.00 m/s");
    assert(m.preContactVelocityYMs === 0.0, "Pre-contact vertical velocity is exactly 0.00 m/s");
    assert(m.isWithinAcceptanceLimit === true, "Zero vertical velocity touchdown is within threshold");
    passed += 5;
  }

  // Test 3: Abort or no-touchdown trial
  {
    console.log("[Test 3/5] Abort or no-touchdown trial (never replaced with zero)...");
    const detector = new TouchdownDetector(0.55, 0.80);
    const preState = { posY: 12.0, velY: -0.10, groundLevel: 1.445 };
    const physics = { posY: 12.0, velY: 0.0, accelY: 0.0, groundLevel: 1.445 };

    const contact = detector.afterStep(preState, physics, 2.5, 0.02);
    assert(contact === false, "No contact while airborne at 12m");
    assert(detector.hasContact() === false, "hasContact() returns false");

    const finalized = detector.finalize("SAFE_ABORT");
    assert(finalized.status === "ABORTED", "Status is explicitly set to ABORTED");
    assert(finalized.preContactSinkRateMs === null, "Pre-contact sink rate is null (never silently replaced with zero)");
    assert(finalized.preContactVelocityYMs === null, "Pre-contact velocity is null on aborted trial");
    assert(finalized.touchdownTimeSeconds === null, "Touchdown time is null when no touchdown occurs");
    assert(finalized.isWithinAcceptanceLimit === null, "isWithinAcceptanceLimit is null when no contact occurs");

    // Also verify NO_TOUCHDOWN for rejection outcomes
    const detectorRejection = new TouchdownDetector(0.55, 0.80);
    const rejFinal = detectorRejection.finalize("SAFE_REJECTION");
    assert(rejFinal.status === "NO_TOUCHDOWN", "Status is NO_TOUCHDOWN on target rejection");
    assert(rejFinal.preContactSinkRateMs === null, "Rejection sink rate is null");
    passed += 9;
  }

  // Test 4: Post-contact velocity is zero while pre-contact sink rate is nonzero
  {
    console.log("[Test 4/5] Post-contact velocity clamped to zero while pre-contact sink rate is nonzero...");
    const detector = new TouchdownDetector(0.55, 0.80);
    const preState = { posY: 1.480, velY: -0.62, groundLevel: 1.445 };
    // Collision handling in physics engine clamps velY to 0
    const physics = { posY: 1.445, velY: 0.0, accelY: 0.0, groundLevel: 1.445 };

    detector.afterStep(preState, physics, 8.4, 0.02);
    const m = detector.getMetrics();

    assert(m.preContactSinkRateMs === 0.62, "Pre-contact sink rate captures nonzero 0.62 m/s");
    assert(m.postContactVelocityYMs === 0.0, "Post-contact velocity captures 0.00 m/s from physics collision clamp");
    assert(m.preContactSinkRateMs !== m.postContactVelocityYMs, "Pre-contact sink rate is distinct from post-contact velocity");
    assert(m.commandedDescentRateMs === 0.55, "Commanded descent rate (0.55 m/s) stored separately");
    assert(m.acceptanceThresholdMs === 0.80, "Acceptance threshold (0.80 m/s) stored separately");
    passed += 5;
  }

  // Test 5: Sign conversion under DronePilot coordinate convention (+Y up, sink rate downward-positive)
  {
    console.log("[Test 5/5] Sign conversion under coordinate convention (+Y up, sink rate downward-positive)...");
    const detectorA = new TouchdownDetector(0.55, 0.80);
    // Case A: Descending at 0.52 m/s (velY = -0.52 m/s)
    const preA = { posY: 1.455, velY: -0.52, groundLevel: 1.445 };
    const physA = { posY: 1.445, velY: 0.0, accelY: 0.0, groundLevel: 1.445 };
    detectorA.afterStep(preA, physA, 1.0, 0.02);
    const mA = detectorA.getMetrics();
    assert(mA.preContactVelocityYMs === -0.52, "Negative velY (-0.52 m/s) represents downward direction in +Y up convention");
    assert(mA.preContactSinkRateMs === 0.52, "Downward-positive sink rate converts -velY to +0.52 m/s");

    // Case B: Ascending / climbing drone (+Y velocity)
    const detectorB = new TouchdownDetector(0.55, 0.80);
    const preB = { posY: 1.446, velY: 0.30, groundLevel: 1.445 };
    const physB = { posY: 1.445, velY: 0.0, accelY: 0.0, groundLevel: 1.445 };
    detectorB.afterStep(preB, physB, 1.0, 0.02);
    const mB = detectorB.getMetrics();
    assert(mB.preContactVelocityYMs === 0.30, "Positive velY (+0.30 m/s) represents upward climb");
    assert(mB.preContactSinkRateMs === -0.30, "Sink rate for climb is negative (-0.30 m/s)");
    passed += 4;
  }

  console.log(`\nTEST SUMMARY: ${passed} PASSED, 0 FAILED\n`);
}

if (import.meta.url === `file://${process.argv[1]}`.replace(/\\/g, "/") || process.argv[1]?.endsWith("touchdown-sink-rate.test.ts")) {
  runTouchdownDetectorUnitTests();
}
