const THREE = require('three');

function test() {
  const propRadius = 0.38;
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
  
  bladeGeo.computeBoundingSphere();
  console.log("Bounding Sphere:", bladeGeo.boundingSphere);
}
test();
