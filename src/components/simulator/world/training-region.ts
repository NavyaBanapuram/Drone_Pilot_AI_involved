// ==========================================================
// DRONE PILOT — REGION A: TRAINING / TAKEOFF AREA
// Primary Helipad, Helipad Bravo, Runway Lights, Windsock & Flight Crates
// ==========================================================

import * as THREE from "three";

export class TrainingRegion {
  public group = new THREE.Group();
  private animatedElements: Array<(elapsed: number) => void> = [];

  constructor() {
    this.buildPrimaryHelipad();
    this.buildHelipadBravo();
    this.buildRunwayLights();
    this.buildWindsockStation();
    this.buildGroundEquipment();
  }

  // 1. PRIMARY CONCRETE HELIPAD (Elevated at Y = 0.62m)
  private buildPrimaryHelipad() {
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x242831,
      roughness: 0.60,
      metalness: 0.20,
    });
    // Radius 13m, height 0.36m, placed at Y = 0.44m => top surface at exact Y = 0.62m
    const padGeo = new THREE.CylinderGeometry(13, 13.8, 0.36, 24);
    const padMesh = new THREE.Mesh(padGeo, padMat);
    padMesh.position.y = 0.44;
    padMesh.receiveShadow = true;
    this.group.add(padMesh);

    // High-Visibility Aviation Orange Perimeter Border Ring
    const borderMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const borderRing = new THREE.Mesh(
      new THREE.RingGeometry(11.8, 12.8, 48),
      borderMat
    );
    borderRing.rotation.x = -Math.PI / 2;
    borderRing.position.y = 0.624;
    this.group.add(borderRing);

    // Inner White Ring
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const innerRing = new THREE.Mesh(
      new THREE.RingGeometry(5.2, 5.8, 48),
      whiteMat
    );
    innerRing.rotation.x = -Math.PI / 2;
    innerRing.position.y = 0.626;
    this.group.add(innerRing);

    // Bold Aviation "H" Stems (1m wide stripes)
    const hBar1 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 5.4), whiteMat);
    hBar1.rotation.x = -Math.PI / 2;
    hBar1.position.set(-1.8, 0.628, 0);
    this.group.add(hBar1);

    const hBar2 = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 5.4), whiteMat);
    hBar2.rotation.x = -Math.PI / 2;
    hBar2.position.set(1.8, 0.628, 0);
    this.group.add(hBar2);

    const hCross = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 1.0), whiteMat);
    hCross.rotation.x = -Math.PI / 2;
    hCross.position.set(0, 0.628, 0);
    this.group.add(hCross);
  }

  // 2. SECONDARY HELIPAD BRAVO (Landing Practice Wing: X = 22, Z = 0)
  private buildHelipadBravo() {
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x2e3440,
      roughness: 0.65,
      metalness: 0.15,
    });
    const padBravo = new THREE.Mesh(
      new THREE.CylinderGeometry(6.2, 6.6, 0.34, 16),
      padMat
    );
    padBravo.position.set(22, 0.44, 0);
    padBravo.receiveShadow = true;
    this.group.add(padBravo);

    const borderMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    const padBravoRing = new THREE.Mesh(
      new THREE.RingGeometry(5.2, 5.8, 32),
      borderMat
    );
    padBravoRing.rotation.x = -Math.PI / 2;
    padBravoRing.position.set(22, 0.624, 0);
    this.group.add(padBravoRing);

    // Central "B" marking stem
    const whiteMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const bStem = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 3.4), whiteMat);
    bStem.rotation.x = -Math.PI / 2;
    bStem.position.set(21.2, 0.626, 0);
    this.group.add(bStem);
  }

  // 3. PERIMETER RUNWAY GUIDE LIGHTS
  private buildRunwayLights() {
    const lightGeo = new THREE.CylinderGeometry(0.14, 0.18, 0.6, 8);
    const lightMat = new THREE.MeshStandardMaterial({ color: 0x1f2937 });
    const bulbGreen = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const bulbAmber = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

    for (let i = 0; i < 8; i++) {
      const angle = (i * Math.PI) / 4;
      const x = Math.cos(angle) * 14.2;
      const z = Math.sin(angle) * 14.2;

      const post = new THREE.Mesh(lightGeo, lightMat);
      post.position.set(x, 0.60, z);
      this.group.add(post);

      const bulb = new THREE.Mesh(
        new THREE.SphereGeometry(0.18, 8, 8),
        i % 2 === 0 ? bulbGreen : bulbAmber
      );
      bulb.position.set(x, 0.95, z);
      this.group.add(bulb);
    }
  }

  // 4. WINDSOCK STATION
  private buildWindsockStation() {
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.8 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 4.8, 8), poleMat);
    pole.position.set(15, 2.6, -14);
    this.group.add(pole);

    const sockMat = new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.6 });
    const sock = new THREE.Mesh(new THREE.ConeGeometry(0.38, 2.0, 12), sockMat);
    sock.rotation.z = Math.PI / 2;
    sock.position.set(15.9, 4.8, -14);
    this.group.add(sock);

    this.animatedElements.push((elapsed) => {
      sock.rotation.y = Math.sin(elapsed * 0.8) * 0.28;
    });
  }

  // 5. GROUND FLIGHT EQUIPMENT & SAFETY CONES
  private buildGroundEquipment() {
    // Flight Pelican Cases / Battery Stations
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
    const crate1 = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.6, 0.8), crateMat);
    crate1.position.set(11, 0.62 + 0.3, -9);
    crate1.castShadow = true;
    this.group.add(crate1);

    const crate2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.5, 0.6), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    crate2.position.set(12.2, 0.62 + 0.25, -8.8);
    crate2.rotation.y = 0.3;
    crate2.castShadow = true;
    this.group.add(crate2);

    // Safety Orange Cones
    const coneMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 });
    const coneGeo = new THREE.ConeGeometry(0.24, 0.65, 8);
    [
      { x: -11.5, z: 7.5 },
      { x: -12.5, z: 9.0 },
      { x: 9.5, z: 11.0 },
      { x: 11.0, z: 12.0 },
    ].forEach((c) => {
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.set(c.x, 0.62 + 0.325, c.z);
      cone.castShadow = true;
      this.group.add(cone);
    });
  }

  public update(_dt: number, elapsed: number) {
    for (let i = 0; i < this.animatedElements.length; i++) {
      this.animatedElements[i](elapsed);
    }
  }
}
