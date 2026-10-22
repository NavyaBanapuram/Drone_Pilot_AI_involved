import * as THREE from "three";

export interface MotorDef {
  index: number;
  position: { x: number; y: number; z: number };
  direction: 1 | -1;
}

export interface AircraftModelParts {
  rootGroup: THREE.Group;
  propellers: { bladeGroup: THREE.Group; direction: 1 | -1; motorIndex: number }[];
  batteryLeds: THREE.Mesh[];
  tailStrobe: THREE.Mesh | null;
  gimbalGroup: THREE.Group | null;
  cameraPitchGroup: THREE.Group | null;
}

// ------------------------------------------------------------------
// CAMERA FRAMING HELPER
// Returns the approximate bounding radius of the aircraft model
// so the chase camera can frame the correct initial distance.
// ------------------------------------------------------------------
export function getAircraftBoundingRadius(type: "quadcopter" | "hexacopter" | "octacopter"): number {
  // These values correspond to the physical motor-tip-to-motor-tip extents
  // derived from the DroneDefinition motor radii + propeller radius allowance.
  // Quad: motors at r≈0.48m + prop ≈ ~0.23m → span ~0.71m → bounding radius ~0.75m
  // Hexa: motors at r≈0.55m + prop ≈ ~0.26m → span ~0.81m → bounding radius ~0.90m
  // Octa: motors at r≈0.65m + prop ≈ ~0.30m → span ~0.95m → bounding radius ~1.05m
  switch (type) {
    case "hexacopter": return 0.90;
    case "octacopter": return 1.10;
    case "quadcopter":
    default:           return 0.75;
  }
}

// ------------------------------------------------------------------
// PROFESSIONAL AEROSPACE MATERIALS (shared, static — created once)
// ------------------------------------------------------------------
const Materials = {
  // Dark structural carbon fibre chassis
  carbonFiber: new THREE.MeshStandardMaterial({
    color: 0x2a2c33,
    roughness: 0.25,
    metalness: 0.70,
  }),
  // Satin anodized dark alloy (arms, structural tubes)
  darkGraphite: new THREE.MeshStandardMaterial({
    color: 0x3d4149,
    roughness: 0.60,
    metalness: 0.50,
  }),
  // Premium metallic alloy (used for shell/canopy) - Bright Silver as requested
  silverAlloy: new THREE.MeshStandardMaterial({
    color: 0xbfc4cc,
    roughness: 0.30,
    metalness: 0.75,
  }),
  // Mid-grey machined alloy (motor stators, knuckles)
  machinedAlloy: new THREE.MeshStandardMaterial({
    color: 0x8a919e,
    roughness: 0.40,
    metalness: 0.85,
  }),
  // Accent neon glow
  neonCyan: new THREE.MeshStandardMaterial({
    color: 0x00f0ff,
    emissive: 0x00f0ff,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  }),
  // Optical glass / sensor lens
  opticalGlass: new THREE.MeshPhysicalMaterial({
    color: 0x080a0e,
    metalness: 0.90,
    roughness: 0.04,
    transmission: 0.88,
    thickness: 0.05,
    clearcoat: 1.0,
  }),
  // Safety orange accents (front arm stripe, battery latch, prop cap)
  accentOrange: new THREE.MeshStandardMaterial({
    color: 0xff4400,
    emissive: 0xff3300,
    emissiveIntensity: 0.3,
    roughness: 0.40,
    metalness: 0.20,
  }),
  // Rubber vibration dampeners / feet
  rubberPad: new THREE.MeshStandardMaterial({
    color: 0x0e0f11,
    roughness: 0.92,
    metalness: 0.04,
  }),
  // Carbon propeller blades
  propeller: new THREE.MeshStandardMaterial({
    color: 0x141618,
    roughness: 0.38,
    metalness: 0.18,
  }),
  // Anti-collision strobe (white)
  strobe: new THREE.MeshBasicMaterial({ color: 0xffffff }),
  // Battery gauge LEDs
  ledGreen:  new THREE.MeshBasicMaterial({ color: 0x00e676 }),
  ledAmber:  new THREE.MeshBasicMaterial({ color: 0xffa000 }),
  ledRed:    new THREE.MeshBasicMaterial({ color: 0xff1744 }),
  ledOff:    new THREE.MeshStandardMaterial({ color: 0x1a1c20, roughness: 0.8, metalness: 0.1 }),
};

// Export LED materials so ModularDrone can reference them for its battery gauge
export const LedMaterials = {
  green: Materials.ledGreen,
  amber: Materials.ledAmber,
  red:   Materials.ledRed,
  off:   Materials.ledOff,
};

// ------------------------------------------------------------------
// GEOMETRY UTILS
// ------------------------------------------------------------------
function createRoundedRectShape(w: number, l: number, r: number): THREE.Shape {
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -l / 2);
  shape.lineTo( w / 2 - r, -l / 2);
  shape.quadraticCurveTo( w / 2, -l / 2,  w / 2, -l / 2 + r);
  shape.lineTo( w / 2,  l / 2 - r);
  shape.quadraticCurveTo( w / 2,  l / 2,  w / 2 - r,  l / 2);
  shape.lineTo(-w / 2 + r,  l / 2);
  shape.quadraticCurveTo(-w / 2,  l / 2, -w / 2,  l / 2 - r);
  shape.lineTo(-w / 2, -l / 2 + r);
  shape.quadraticCurveTo(-w / 2, -l / 2, -w / 2 + r, -l / 2);
  return shape;
}

// ------------------------------------------------------------------
// GIMBAL & CAMERA (Hexa and Octa)
// ------------------------------------------------------------------
function buildGimbalAndCamera(sc: number): { gimbal: THREE.Group; pitch: THREE.Group } {
  const g = new THREE.Group();

  const yawRing = new THREE.Mesh(new THREE.CylinderGeometry(0.022 * sc, 0.028 * sc, 0.016 * sc, 16), Materials.machinedAlloy);
  yawRing.position.set(0, 0, 0);
  g.add(yawRing);


  // Roll arm
  const rollArm = new THREE.Mesh(new THREE.BoxGeometry(0.05 * sc, 0.009 * sc, 0.009 * sc), Materials.darkGraphite);
  rollArm.position.set(0.02 * sc, -0.018 * sc, 0);
  g.add(rollArm);

  // Roll motor
  const rollMotor = new THREE.Mesh(new THREE.CylinderGeometry(0.013 * sc, 0.013 * sc, 0.01 * sc, 14), Materials.machinedAlloy);
  rollMotor.rotation.z = Math.PI / 2;
  rollMotor.position.set(0.038 * sc, -0.018 * sc, 0);
  g.add(rollMotor);

  // Pitch group (the "camera pod")
  const pitchGroup = new THREE.Group();
  pitchGroup.position.set(0.018 * sc, -0.025 * sc, 0);

  const camBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.038 * sc, 0.028 * sc, 0.050 * sc),
    Materials.darkGraphite
  );
  camBody.position.set(-0.008 * sc, -0.008 * sc, 0.012 * sc);
  pitchGroup.add(camBody);

  const lensBarrel = new THREE.Mesh(
    new THREE.CylinderGeometry(0.013 * sc, 0.013 * sc, 0.014 * sc, 16),
    Materials.machinedAlloy
  );
  lensBarrel.rotation.x = Math.PI / 2;
  lensBarrel.position.set(-0.008 * sc, -0.010 * sc, 0.038 * sc);
  pitchGroup.add(lensBarrel);

  const lensGlass = new THREE.Mesh(new THREE.CircleGeometry(0.011 * sc, 16), Materials.opticalGlass);
  lensGlass.position.set(-0.008 * sc, -0.010 * sc, 0.046 * sc);
  pitchGroup.add(lensGlass);

  g.add(pitchGroup);
  return { gimbal: g, pitch: pitchGroup };
}

// ------------------------------------------------------------------
// UNIFIED FUSELAGE FAMILY BUILDER
// ------------------------------------------------------------------
function buildUnifiedFuselage(
  type: "quadcopter" | "hexacopter" | "octacopter",
  root: THREE.Group
): AircraftModelParts {
  const parts: AircraftModelParts = {
    batteryLeds: [],
    tailStrobe: null,
    gimbalGroup: null,
    cameraPitchGroup: null,
    propellers: [],
    rootGroup: root,
  };

  // All bodies same compact size — only arms/prop positions differ by type
  const sc = 1.0;

  const fuselage = new THREE.Group();

  // ── Body dimensions ──────────────────────────────────────────────
  const bodyW = 0.17 * sc;   // width (X)
  const bodyL = 0.24 * sc;   // length (Z)
  const bodyH = 0.085 * sc;  // height (Y)
  const cR    = 0.022 * sc;  // corner radius

  // 1. STRUCTURAL CHASSIS (carbon fibre box)
  const chassisShape = createRoundedRectShape(bodyW, bodyL, cR);
  const chassisGeo = new THREE.ExtrudeGeometry(chassisShape, {
    depth: bodyH, bevelEnabled: true,
    bevelSegments: 2, steps: 1,
    bevelSize: 0.005 * sc, bevelThickness: 0.005 * sc,
  });
  chassisGeo.center();
  chassisGeo.rotateX(Math.PI / 2);
  const chassis = new THREE.Mesh(chassisGeo, Materials.carbonFiber);
  fuselage.add(chassis);

  // 2. TOP EQUIPMENT SHELL (sleek dark metallic canopy)
  const shellW = bodyW * 0.90;
  const shellL = bodyL * 0.92;
  const shellH = 0.040 * sc;
  const shellShape = createRoundedRectShape(shellW, shellL, cR * 1.5);
  const shellGeo = new THREE.ExtrudeGeometry(shellShape, {
    depth: shellH, bevelEnabled: true,
    bevelSegments: 4, steps: 1,
    bevelSize: 0.015 * sc, bevelThickness: 0.015 * sc,
  });
  shellGeo.center();
  shellGeo.rotateX(Math.PI / 2);
  const shell = new THREE.Mesh(shellGeo, Materials.silverAlloy);
  shell.position.y = bodyH / 2 + shellH / 2 - 0.002;
  shell.castShadow = true;
  fuselage.add(shell);

  // Futuristic neon racing stripes on the canopy
  const stripeGeo = new THREE.BoxGeometry(0.005 * sc, shellH + 0.002, shellL * 0.7);
  const leftStripe = new THREE.Mesh(stripeGeo, Materials.neonCyan);
  leftStripe.position.set(-shellW / 4, shell.position.y + 0.005, 0);
  const rightStripe = new THREE.Mesh(stripeGeo, Materials.neonCyan);
  rightStripe.position.set(shellW / 4, shell.position.y + 0.005, 0);
  fuselage.add(leftStripe, rightStripe);

  // Heat sink vents in silver shell
  for (let i = -1; i <= 1; i++) {
    const vent = new THREE.Mesh(
      new THREE.BoxGeometry(shellW * 0.38, 0.005 * sc, 0.011 * sc),
      Materials.machinedAlloy
    );
    vent.position.set(0, bodyH / 2 + shellH, i * 0.022 * sc);
    fuselage.add(vent);
  }

  // 3. BOTTOM SENSOR / PAYLOAD INTERFACE BAY
  const bayW = bodyW * 0.58;
  const bayL = bodyL * 0.58;
  const bayH = 0.018 * sc;
  const bay = new THREE.Mesh(new THREE.BoxGeometry(bayW, bayH, bayL), Materials.darkGraphite);
  bay.position.y = -bodyH / 2 - bayH / 2;
  fuselage.add(bay);

  // 4. PAYLOAD / CAMERA SYSTEM (type-differentiated)
  if (type === "octacopter") {
    // Heavy payload rail mount (industrial)
    const railW = bodyW * 0.72;
    const railH = 0.018 * sc;
    const railL = bodyL * 0.55;
    const payloadRail = new THREE.Mesh(new THREE.BoxGeometry(railW, railH, railL), Materials.machinedAlloy);
    payloadRail.position.set(0, -bodyH / 2 - bayH - railH / 2, bodyL * 0.05);
    fuselage.add(payloadRail);
    // Payload vibration isolator pucks (4 corners)
    [[-1, -1], [-1, 1], [1, -1], [1, 1]].forEach(([sx, sz]) => {
      const puck = new THREE.Mesh(
        new THREE.CylinderGeometry(0.012 * sc, 0.012 * sc, 0.022 * sc, 12),
        Materials.rubberPad
      );
      puck.position.set(sx * railW * 0.38, -bodyH / 2 - bayH - railH - 0.011 * sc, sz * railL * 0.38);
      fuselage.add(puck);
    });
    // 3-axis gimbal
    const { gimbal, pitch } = buildGimbalAndCamera(sc * 0.85);
    gimbal.position.set(0, -bodyH / 2 - bayH - railH - 0.06 * sc, bodyL * 0.12);
    fuselage.add(gimbal);
    parts.gimbalGroup = gimbal;
    parts.cameraPitchGroup = pitch;
  } else if (type === "hexacopter") {
    // Mapping/survey gimbal
    const { gimbal, pitch } = buildGimbalAndCamera(sc * 0.75);
    gimbal.position.set(0, -bodyH / 2 - bayH - 0.01 * sc, bodyL * 0.10);
    fuselage.add(gimbal);
    parts.gimbalGroup = gimbal;
    parts.cameraPitchGroup = pitch;
  } else {
    // Quadcopter: small fixed FPV nose camera
    const fpvMount = new THREE.Mesh(
      new THREE.BoxGeometry(0.028 * sc, 0.028 * sc, 0.026 * sc),
      Materials.darkGraphite
    );
    fpvMount.position.set(0, -bodyH / 2, bodyL / 2 + 0.002);
    fuselage.add(fpvMount);
    const fpvLens = new THREE.Mesh(new THREE.CircleGeometry(0.009 * sc, 16), Materials.opticalGlass);
    fpvLens.position.set(0, -bodyH / 2, bodyL / 2 + 0.015 * sc);
    fuselage.add(fpvLens);
    // Quad has front orange accent stripe on nose
    const noseTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.030 * sc, 0.006 * sc, 0.008 * sc),
      Materials.accentOrange
    );
    noseTip.position.set(0, -bodyH / 2 + 0.015 * sc, bodyL / 2 - 0.002 * sc);
    fuselage.add(noseTip);
  }

  // 5. REAR BATTERY CARTRIDGE
  const batW = bodyW * 0.68;
  const batL = 0.085 * sc;
  const batH = bodyH * 0.82;
  const batteryPack = new THREE.Mesh(new THREE.BoxGeometry(batW, batH, batL), Materials.darkGraphite);
  batteryPack.position.set(0, 0, -bodyL / 2 - batL / 2 + 0.018 * sc);
  fuselage.add(batteryPack);

  // Battery latch (orange accent)
  const latch = new THREE.Mesh(new THREE.BoxGeometry(batW * 0.38, 0.010 * sc, 0.022 * sc), Materials.accentOrange);
  latch.position.set(0, batH / 2, -bodyL / 2 - batL / 2 + 0.008 * sc);
  fuselage.add(latch);

  // 4-LED Battery Status Gauge
  for (let i = 0; i < 4; i++) {
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(0.014 * sc, 0.005 * sc, 0.007 * sc),
      Materials.ledGreen  // initial state: full green
    );
    led.position.set((-0.028 + i * 0.019) * sc, batH / 2 + 0.002, -bodyL / 2 - batL / 2 + 0.028 * sc);
    fuselage.add(led);
    parts.batteryLeds.push(led);
  }

  // 6. RTK GPS MODULE(S) on top
  const numRtk = type === "quadcopter" ? 1 : 2;
  const rtkPositions = type === "quadcopter"
    ? [{ x: 0 }]
    : [{ x: -0.048 * sc }, { x: 0.048 * sc }];

  rtkPositions.forEach(({ x }) => {
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005 * sc, 0.005 * sc, 0.038 * sc, 8),
      Materials.darkGraphite
    );
    mast.position.set(x, bodyH / 2 + shellH + 0.019 * sc, -bodyL * 0.18);
    fuselage.add(mast);

    const puck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028 * sc, 0.028 * sc, 0.009 * sc, 16),
      Materials.silverAlloy
    );
    puck.position.set(x, bodyH / 2 + shellH + 0.038 * sc, -bodyL * 0.18);
    fuselage.add(puck);
  });

  // 7. TAIL ANTI-COLLISION STROBE
  const strobeMount = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005 * sc, 0.005 * sc, 0.018 * sc, 8),
    Materials.machinedAlloy
  );
  strobeMount.position.set(0, batH / 2 + 0.009 * sc, -bodyL / 2 - batL / 2);
  fuselage.add(strobeMount);

  const strobeLight = new THREE.Mesh(new THREE.SphereGeometry(0.009 * sc, 8, 8), Materials.strobe);
  strobeLight.position.set(0, batH / 2 + 0.020 * sc, -bodyL / 2 - batL / 2);
  fuselage.add(strobeLight);
  parts.tailStrobe = strobeLight;

  // 8. LANDING GEAR — professional skid design
  // Legs attach under the body at ±X. Struts angle outward, skids run fore-aft.
  const gearSpread = bodyW / 2 + 0.005 * sc;
  [-1, 1].forEach((side) => {
    const gearGroup = new THREE.Group();
    gearGroup.position.set(side * gearSpread, -bodyH / 2, 0);

    const strutH = 0.135 * sc;
    const strutR  = 0.008 * sc;
    const leanAngle = side * 0.18; // outward lean

    // Main strut (slightly angled outward)
    const strut = new THREE.Mesh(
      new THREE.CylinderGeometry(strutR * 0.75, strutR, strutH, 10),
      Materials.carbonFiber
    );
    strut.rotation.z = leanAngle;
    strut.position.set(side * strutH * Math.sin(Math.abs(leanAngle)) * 0.5, -strutH / 2, 0);
    gearGroup.add(strut);

    // Skid tube (fore-aft, ~1.5× body length)
    const skidLength = bodyL * 1.55;
    const skidGeo = new THREE.CylinderGeometry(strutR, strutR, skidLength, 10);
    skidGeo.rotateX(Math.PI / 2);
    const skid = new THREE.Mesh(skidGeo, Materials.darkGraphite);
    skid.position.set(side * strutH * Math.sin(Math.abs(leanAngle)), -strutH, 0);
    gearGroup.add(skid);

    // Rubber contact feet (front + rear of skid)
    [-skidLength * 0.42, skidLength * 0.42].forEach((zOffset) => {
      const foot = new THREE.Mesh(
        new THREE.CylinderGeometry(strutR * 1.35, strutR * 1.35, 0.018 * sc, 10),
        Materials.rubberPad
      );
      foot.rotation.x = Math.PI / 2;
      foot.position.set(side * strutH * Math.sin(Math.abs(leanAngle)), -strutH, zOffset);
      gearGroup.add(foot);
    });

    fuselage.add(gearGroup);
  });

  root.add(fuselage);
  return parts;
}

// ------------------------------------------------------------------
// ARMS, MOTORS & PROPELLERS
// ------------------------------------------------------------------
function buildArmsAndMotors(
  root: THREE.Group,
  motorsDef: MotorDef[],
  type: "quadcopter" | "hexacopter" | "octacopter",
  parts: AircraftModelParts
) {
  // Arms are same visual style for all types — thickness fixed for visibility
  const sc = 1.0;

  // Arm cross-section — wide flat tubes, thick enough to see in 3D
  const armW  = 0.055;  // width (X axis) — thick for visibility
  const armH  = 0.028;  // height (Y axis)
  const motorR = 0.048; // motor bell radius

  // Compute propeller radius = half inter-motor distance minus 5% safety gap
  let minMotorDistance = Infinity;
  for (let i = 0; i < motorsDef.length; i++) {
    for (let j = i + 1; j < motorsDef.length; j++) {
      const dx = motorsDef[i].position.x - motorsDef[j].position.x;
      const dz = motorsDef[i].position.z - motorsDef[j].position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minMotorDistance) minMotorDistance = dist;
    }
  }
  const propRadius = minMotorDistance * 0.38;  // 24% clearance gap each side — no collision

  // Identify the two front-most motors for orange safety stripes
  const sortedByZ = [...motorsDef].sort((a, b) => b.position.z - a.position.z);
  const frontIndices = new Set([sortedByZ[0].index, sortedByZ[1 < motorsDef.length ? 1 : 0].index]);

  motorsDef.forEach((motor) => {
    const armGroup = new THREE.Group();

    const vec = new THREE.Vector3(motor.position.x, 0, motor.position.z);
    const armLength = vec.length();
    const angle = Math.atan2(vec.x, vec.z);

    armGroup.position.y = motor.position.y || 0;
    armGroup.rotation.y = angle;

    // ── Arm root reinforcement knuckle ───────────────────────────
    const knuckleZ = 0.085;  // arm starts 8.5cm from center
    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(armW * 1.5, armH * 1.8, 0.045),
      Materials.machinedAlloy
    );
    knuckle.position.z = knuckleZ;
    armGroup.add(knuckle);

    // ── Main arm tube — tapered, visible carbon tube ─────────────
    const usableLength = armLength - knuckleZ - motorR * 1.2;
    // Sleek slim cylindrical carbon fiber tube
    const armGeo = new THREE.CylinderGeometry(armW * 0.25, armW * 0.25, usableLength, 16);
    armGeo.rotateX(Math.PI / 2);
    const armMesh = new THREE.Mesh(armGeo, Materials.carbonFiber);
    armMesh.position.z = knuckleZ + usableLength / 2;
    armMesh.castShadow = true;
    armGroup.add(armMesh);

    // Glowing neon accent band (futuristic)
    const neonBandGeo = new THREE.CylinderGeometry(armW * 0.28, armW * 0.28, 0.015, 16);
    neonBandGeo.rotateX(Math.PI / 2);
    const band = new THREE.Mesh(neonBandGeo, Materials.neonCyan);
    band.position.z = knuckleZ + usableLength * 0.70;
    armGroup.add(band);

    // Front arms: safety orange stripe near tip
    if (frontIndices.has(motor.index)) {
      const orangeGeo = new THREE.CylinderGeometry(armW * 0.29, armW * 0.29, 0.025, 16);
      orangeGeo.rotateX(Math.PI / 2);
      const orange = new THREE.Mesh(orangeGeo, Materials.accentOrange);
      orange.position.z = knuckleZ + usableLength * 0.85;
      armGroup.add(orange);
    }

    // ── Motor assembly ─────────────────────────────────────────────
    const motorY = armH / 2 + 0.010;  // raise slightly above arm surface

    // Motor mount plate
    const motorMountPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(motorR * 1.18, motorR * 0.95, 0.016, 18),
      Materials.machinedAlloy
    );
    motorMountPlate.position.set(0, motorY, armLength);
    armGroup.add(motorMountPlate);

    // Stator (lower fixed part of brushless motor)
    const stator = new THREE.Mesh(
      new THREE.CylinderGeometry(motorR * 0.78, motorR * 0.78, 0.020, 22),
      Materials.darkGraphite
    );
    stator.position.set(0, motorY + 0.018, armLength);
    armGroup.add(stator);

    // Motor bell (rotating outer can — silver alloy)
    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(motorR, motorR, 0.026, 22),
      Materials.silverAlloy
    );
    bell.position.set(0, motorY + 0.034, armLength);
    armGroup.add(bell);

    // Motor shaft stub
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.020, 8),
      Materials.machinedAlloy
    );
    shaft.position.set(0, motorY + 0.055, armLength);
    armGroup.add(shaft);

    // ── Propeller assembly ────────────────────────────────────────
    const propGroup = new THREE.Group();
    propGroup.position.set(0, motorY + 0.064, armLength);

    // Prop hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.010, 14),
      Materials.darkGraphite
    );
    propGroup.add(hub);

    // Prop spinner cap (orange accent)
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.007, 10),
      Materials.accentOrange
    );
    cap.position.y = 0.008;
    propGroup.add(cap);

    // Realistic two-blade propeller shape — tapers from hub to tip
    const bladeShape = new THREE.Shape();
    bladeShape.moveTo(0.012, 0.010);
    bladeShape.quadraticCurveTo(propRadius * 0.40, 0.030, propRadius, 0.007);
    bladeShape.lineTo(propRadius, -0.007);
    bladeShape.quadraticCurveTo(propRadius * 0.40, -0.016, 0.012, -0.010);

    const bladeGeo = new THREE.ExtrudeGeometry(bladeShape, {
      depth: 0.004, bevelEnabled: true,
      bevelSize: 0.001, bevelThickness: 0.001,
      bevelSegments: 2, steps: 1,
    });
    bladeGeo.center();

    const blade1 = new THREE.Mesh(bladeGeo, Materials.propeller);
    blade1.position.x = propRadius / 2;
    blade1.rotation.x = 0.18;  // aerodynamic pitch angle
    blade1.castShadow = true;
    propGroup.add(blade1);

    const blade2 = new THREE.Mesh(bladeGeo, Materials.propeller);
    blade2.position.x = -propRadius / 2;
    blade2.rotation.z = Math.PI;
    blade2.rotation.x = 0.18;
    blade2.castShadow = true;
    propGroup.add(blade2);

    armGroup.add(propGroup);

    parts.propellers.push({
      bladeGroup: propGroup,
      direction:  motor.direction,
      motorIndex: motor.index,
    });

    root.add(armGroup);
  });
}

// ------------------------------------------------------------------
// MAIN BUILDER ENTRY POINT
// ------------------------------------------------------------------
export function buildProfessionalUAV(
  type: "quadcopter" | "hexacopter" | "octacopter",
  customMotors?: MotorDef[]
): AircraftModelParts {
  const rootGroup = new THREE.Group();

  const parts = buildUnifiedFuselage(type, rootGroup);

  // Use provided motor positions (from Digital Twin) or sensible defaults
  let motors = customMotors;
  if (!motors || motors.length === 0) {
    const count  = type === "quadcopter" ? 4 : type === "hexacopter" ? 6 : 8;
    // All types get similar arm reach — Quad diagonal = 0.679m, Hexa/Octa match that reach
    const radius = type === "quadcopter" ? 0.48 : type === "hexacopter" ? 0.68 : 0.78;
    // Angular offset for standard X/Y configurations
    const offset = type === "quadcopter" ? Math.PI / 4 : type === "hexacopter" ? 0 : Math.PI / 8;

    motors = [];
    for (let i = 0; i < count; i++) {
      const angle = (i * Math.PI * 2) / count + offset;
      motors.push({
        index:     i,
        position:  { x: Math.sin(angle) * radius, y: 0, z: Math.cos(angle) * radius },
        direction: i % 2 === 0 ? 1 : -1,
      });
    }
  }

  buildArmsAndMotors(rootGroup, motors, type, parts);

  return parts;
}
