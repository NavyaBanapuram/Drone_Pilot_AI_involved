const THREE = require('three');

// Mock Materials
const Materials = new Proxy({}, { get: () => new THREE.MeshBasicMaterial() });

function buildArmsAndMotors(root, motorsDef, type, parts) {
  const sc = 1.0;
  const armW  = 0.055;
  const armH  = 0.028;
  const motorR = 0.048;

  let minMotorDistance = Infinity;
  for (let i = 0; i < motorsDef.length; i++) {
    for (let j = i + 1; j < motorsDef.length; j++) {
      const dx = motorsDef[i].position.x - motorsDef[j].position.x;
      const dz = motorsDef[i].position.z - motorsDef[j].position.z;
      const dist = Math.sqrt(dx * dx + dz * dz);
      if (dist < minMotorDistance) minMotorDistance = dist;
    }
  }
  const propRadius = minMotorDistance * 0.38;

  const sortedByZ = [...motorsDef].sort((a, b) => b.position.z - a.position.z);
  const frontIndices = new Set([sortedByZ[0].index, sortedByZ[1 < motorsDef.length ? 1 : 0].index]);

  motorsDef.forEach((motor) => {
    const armGroup = new THREE.Group();

    const vec = new THREE.Vector3(motor.position.x, 0, motor.position.z);
    const armLength = vec.length();
    const angle = Math.atan2(vec.x, vec.z);

    armGroup.position.y = motor.position.y || 0;
    armGroup.rotation.y = angle;

    const knuckleZ = 0.085;
    const knuckle = new THREE.Mesh(
      new THREE.BoxGeometry(armW * 1.5, armH * 1.8, 0.045),
      Materials.machinedAlloy
    );
    knuckle.position.z = knuckleZ;
    armGroup.add(knuckle);

    const usableLength = armLength - knuckleZ - motorR * 1.2;
    const armMesh = new THREE.Mesh(
      new THREE.BoxGeometry(armW, armH, usableLength),
      Materials.carbonFiber
    );
    armMesh.position.z = knuckleZ + usableLength / 2;
    armMesh.castShadow = true;
    armGroup.add(armMesh);

    const band = new THREE.Mesh(
      new THREE.BoxGeometry(armW * 1.12, armH * 1.15, 0.022),
      Materials.darkGraphite
    );
    band.position.z = knuckleZ + usableLength * 0.75;
    armGroup.add(band);

    if (frontIndices.has(motor.index)) {
      const orange = new THREE.Mesh(
        new THREE.BoxGeometry(armW * 1.15, armH * 1.18, 0.018),
        Materials.accentOrange
      );
      orange.position.z = knuckleZ + usableLength * 0.82;
      armGroup.add(orange);
    }

    const motorY = armH / 2 + 0.010;

    const motorMountPlate = new THREE.Mesh(
      new THREE.CylinderGeometry(motorR * 1.18, motorR * 0.95, 0.016, 18),
      Materials.machinedAlloy
    );
    motorMountPlate.position.set(0, motorY, armLength);
    armGroup.add(motorMountPlate);

    const stator = new THREE.Mesh(
      new THREE.CylinderGeometry(motorR * 0.78, motorR * 0.78, 0.020, 22),
      Materials.darkGraphite
    );
    stator.position.set(0, motorY + 0.018, armLength);
    armGroup.add(stator);

    const bell = new THREE.Mesh(
      new THREE.CylinderGeometry(motorR, motorR, 0.026, 22),
      Materials.silverAlloy
    );
    bell.position.set(0, motorY + 0.034, armLength);
    armGroup.add(bell);

    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.005, 0.005, 0.020, 8),
      Materials.machinedAlloy
    );
    shaft.position.set(0, motorY + 0.055, armLength);
    armGroup.add(shaft);

    const propGroup = new THREE.Group();
    propGroup.position.set(0, motorY + 0.064, armLength);

    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.011, 0.011, 0.010, 14),
      Materials.darkGraphite
    );
    propGroup.add(hub);

    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.006, 0.006, 0.007, 10),
      Materials.accentOrange
    );
    cap.position.y = 0.008;
    propGroup.add(cap);

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
    blade1.rotation.x = 0.18;
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

function test() {
  const rootGroup = new THREE.Group();
  const parts = { propellers: [] };
  const motors = [
    { index: 0, position: { x: 0.48, y: 0, z: 0.48 }, direction: 1 },
    { index: 1, position: { x: 0.48, y: 0, z: -0.48 }, direction: -1 },
    { index: 2, position: { x: -0.48, y: 0, z: -0.48 }, direction: 1 },
    { index: 3, position: { x: -0.48, y: 0, z: 0.48 }, direction: -1 },
  ];
  
  try {
    buildArmsAndMotors(rootGroup, motors, "quadcopter", parts);
    console.log("Root children count:", rootGroup.children.length);
    for (let c of rootGroup.children) {
      console.log("Arm group children:", c.children.length);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

test();
