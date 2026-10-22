// ==========================================================
// DRONE PILOT — DIGITAL TWIN AUTOMATED UNIT TESTS (PHASE 4)
// Validates aircraft configuration rules, mass equations, and adapter fidelity
// ==========================================================

import {
  TRAINING_QUADCOPTER_PRESET,
  AGRICULTURAL_QUADCOPTER_PRESET,
  SURVEY_HEXACOPTER_PRESET,
  HEAVY_LIFT_OCTOCOPTER_PRESET,
} from "../lib/digital-twin/digital-twin-presets";
import { validateDroneDigitalTwin } from "../lib/digital-twin/digital-twin-validator";
import {
  calculateMassProperties,
  calculatePerformanceEnvelope,
} from "../lib/digital-twin/mass-calculator";
import { digitalTwinToDroneDefinition } from "../lib/digital-twin/adapter";
import { DroneDigitalTwinConfiguration } from "../types/drone-digital-twin";

function runTests() {
  console.log("=== RUNNING DRONE DIGITAL TWIN VALIDATION TESTS ===\n");
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passCount++;
    } else {
      console.error(`  ✕ FAIL: ${testName}`);
      if (detail) console.error(`    Detail: ${detail}`);
      failCount++;
    }
  }

  // --------------------------------------------------------
  // 1. Factory Presets Validation
  // --------------------------------------------------------
  const vTraining = validateDroneDigitalTwin(TRAINING_QUADCOPTER_PRESET);
  assert(vTraining.valid && vTraining.errors.length === 0, "Training Quadcopter is valid with 0 errors");

  const vAgri = validateDroneDigitalTwin(AGRICULTURAL_QUADCOPTER_PRESET);
  assert(vAgri.valid && vAgri.errors.length === 0, "Agricultural Quadcopter is valid with 0 errors");

  const vSurvey = validateDroneDigitalTwin(SURVEY_HEXACOPTER_PRESET);
  assert(vSurvey.valid && vSurvey.errors.length === 0, "Survey Hexacopter is valid with 0 errors");

  const vHeavy = validateDroneDigitalTwin(HEAVY_LIFT_OCTOCOPTER_PRESET);
  assert(vHeavy.valid && vHeavy.errors.length === 0, "Heavy-Lift Octacopter is valid with 0 errors");

  // --------------------------------------------------------
  // 2. Motor Count Mismatch Rule
  // --------------------------------------------------------
  const badMotorConfig: DroneDigitalTwinConfiguration = JSON.parse(JSON.stringify(TRAINING_QUADCOPTER_PRESET));
  badMotorConfig.motors.pop(); // Remove 1 motor from 4-rotor quad
  const vBadMotors = validateDroneDigitalTwin(badMotorConfig);
  assert(
    !vBadMotors.valid && vBadMotors.errors.some((e) => e.code === "MOTOR_COUNT_MISMATCH"),
    "Rejects configuration when motor array count (3) does not match airframe count (4)"
  );

  // --------------------------------------------------------
  // 3. Missing Battery Capacity Rule
  // --------------------------------------------------------
  const badBatConfig: DroneDigitalTwinConfiguration = JSON.parse(JSON.stringify(TRAINING_QUADCOPTER_PRESET));
  badBatConfig.battery.capacityMah = 0;
  const vBadBat = validateDroneDigitalTwin(badBatConfig);
  assert(
    !vBadBat.valid && vBadBat.errors.some((e) => e.code === "MISSING_BATTERY_CAPACITY"),
    "Rejects configuration when battery capacity is 0 mAh"
  );

  // --------------------------------------------------------
  // 4. Overweight Payload Rule
  // --------------------------------------------------------
  const overweightConfig: DroneDigitalTwinConfiguration = JSON.parse(JSON.stringify(TRAINING_QUADCOPTER_PRESET));
  overweightConfig.payload = {
    id: "p-anvil",
    type: "Custom",
    name: "Heavy Test Load",
    massKg: 5.0, // Airframe limit is 0.8 kg
    attachmentPoint: "Belly Gimbal",
    enabled: true,
  };
  const vOverweight = validateDroneDigitalTwin(overweightConfig);
  assert(
    !vOverweight.valid && vOverweight.errors.some((e) => e.code === "PAYLOAD_EXCEEDS_MAX_CAPACITY"),
    "Rejects configuration when payload mass (5kg) exceeds airframe maximum capacity (0.8kg)"
  );

  // --------------------------------------------------------
  // 5. ESC Overvoltage Warning Rule
  // --------------------------------------------------------
  const overvoltConfig: DroneDigitalTwinConfiguration = JSON.parse(JSON.stringify(TRAINING_QUADCOPTER_PRESET));
  overvoltConfig.battery.nominalVoltageV = 22.2; // 6S battery on 4S ESC (17.4V max)
  const vOvervolt = validateDroneDigitalTwin(overvoltConfig);
  assert(
    vOvervolt.warnings.some((w) => w.code === "BATTERY_OVERVOLTAGE_ESC"),
    "Flags warning when battery voltage exceeds ESC max voltage rating"
  );

  // --------------------------------------------------------
  // 6. Propeller Oversize Warning Rule
  // --------------------------------------------------------
  const bigPropConfig: DroneDigitalTwinConfiguration = JSON.parse(JSON.stringify(TRAINING_QUADCOPTER_PRESET));
  bigPropConfig.propeller.diameterInches = 24.0; // 24" prop on 500mm diagonal frame
  const vBigProp = validateDroneDigitalTwin(bigPropConfig);
  assert(
    vBigProp.warnings.some((w) => w.code === "PROPELLER_FRAME_CLEARANCE"),
    "Flags warning when propeller diameter exceeds arm clearance boundaries"
  );

  // --------------------------------------------------------
  // 7. Mass Properties Summation Consistency
  // --------------------------------------------------------
  const testMassProps = calculateMassProperties(AGRICULTURAL_QUADCOPTER_PRESET);
  const expectedTotal =
    Math.round(
      (testMassProps.dryMassKg +
        testMassProps.batteryMassKg +
        testMassProps.payloadMassKg +
        testMassProps.cameraMassKg) *
        1000
    ) / 1000;
  assert(
    testMassProps.totalMassKg === expectedTotal,
    "Mass calculation engine maintains strict all-up weight summation integrity",
    `Total: ${testMassProps.totalMassKg}, Expected: ${expectedTotal}`
  );

  // --------------------------------------------------------
  // 8. Simulator Adapter Fidelity
  // --------------------------------------------------------
  const def = digitalTwinToDroneDefinition(TRAINING_QUADCOPTER_PRESET);
  assert(
    def.motorCount === 4 &&
      def.motors.length === 4 &&
      def.mass === TRAINING_QUADCOPTER_PRESET.massProperties.dryMassKg &&
      def.maximumThrust === TRAINING_QUADCOPTER_PRESET.performance.totalThrustNewtons,
    "Simulator adapter converts Digital Twin to valid DroneDefinition"
  );

  console.log(`\nTEST SUMMARY: ${passCount} PASSED, ${failCount} FAILED\n`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests();
