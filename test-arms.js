const THREE = require('three');

function test() {
  const sc = 1.0;
  const armW  = 0.055;
  const armH  = 0.028;
  const motorR = 0.048;

  const motor = { position: { x: 0.48, y: 0, z: 0.48 } }; // Quadcopter motor
  const vec = new THREE.Vector3(motor.position.x, 0, motor.position.z);
  const armLength = vec.length();
  
  const knuckleZ = 0.085;
  const usableLength = armLength - knuckleZ - motorR * 1.2;
  
  console.log("Arm Length:", armLength);
  console.log("Usable Length:", usableLength);
  
  try {
     const geo = new THREE.BoxGeometry(armW, armH, usableLength);
     console.log("Geometry created successfully");
  } catch (e) {
     console.log("Error creating geometry:", e.message);
  }
}
test();
