"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

interface Drone3DViewerProps {
  type: string; // "quadcopter" | "hexacopter" | "octacopter"
  isSelected?: boolean;
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
}

export function Drone3DViewer({
  type,
  isSelected = false,
  autoRotate = true,
  interactive = true,
  className = "",
}: Drone3DViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isSelectedRef = useRef(isSelected);
  const [, setIsInteracting] = useState(false);

  useEffect(() => {
    isSelectedRef.current = isSelected;
  }, [isSelected]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // SCENE & CAMERA
    const scene = new THREE.Scene();

    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    camera.position.set(0, 3.4, 5.8);
    camera.lookAt(0, -0.05, 0);

    // RENDERER
    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    // ==============================================
    // STUDIO AEROSPACE LIGHTING
    // Highlights chiseled chamfers and metallic hardware
    // ==============================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    // Primary Key Sunlight (crisp specular highlights on tactical gray hull)
    const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
    keyLight.position.set(6, 12, 6);
    keyLight.castShadow = true;
    scene.add(keyLight);

    // Secondary Fill Light (subtle cool shadow fill)
    const fillLight = new THREE.DirectionalLight(0xbbe3ff, 2.0);
    fillLight.position.set(-6, 5, -3);
    scene.add(fillLight);

    // Aerospace Rim Light (illuminates rear carbon bevels & motor edges)
    const rimLight = new THREE.DirectionalLight(0xffeedd, 2.4);
    rimLight.position.set(0, 6, -6);
    scene.add(rimLight);

    // Subtle Ground Bounce
    const groundBounce = new THREE.DirectionalLight(0xffa855, 0.45);
    groundBounce.position.set(0, -4, 2);
    scene.add(groundBounce);

    // ==============================================
    // REALISTIC ENTERPRISE UAV MATERIALS (DJI MATRICE SPEC)
    // ==============================================
    // Tactical Matte Gray Composite Hull (as seen in DJI Matrice 4 / Matrice 30)
    const tacticalHullMat = new THREE.MeshStandardMaterial({
      color: 0x5a5f67,
      roughness: 0.38,
      metalness: 0.25,
    });

    // Darker Magnesium / Underbody Shell
    const underHullMat = new THREE.MeshStandardMaterial({
      color: 0x383c43,
      roughness: 0.42,
      metalness: 0.30,
    });

    // Dark Titanium Mechanical Trim & Latches
    const titaniumTrimMat = new THREE.MeshStandardMaterial({
      color: 0x22252a,
      roughness: 0.25,
      metalness: 0.75,
    });

    // 3K Matte Carbon-Fiber Structural Arms
    const carbonArmMat = new THREE.MeshStandardMaterial({
      color: 0x181a1d,
      roughness: 0.40,
      metalness: 0.35,
    });

    // CNC Brushed Aluminum Motor Bells & Bulkhead Rings
    const motorBellMat = new THREE.MeshStandardMaterial({
      color: 0x2e3238,
      roughness: 0.18,
      metalness: 0.88,
    });

    // Precision Copper Stator Windings
    const copperStatorMat = new THREE.MeshStandardMaterial({
      color: 0xcc6f2a,
      roughness: 0.25,
      metalness: 0.95,
    });

    // Aerodynamic Carbon Folding Propeller Blades
    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x1f2125,
      roughness: 0.35,
      metalness: 0.20,
    });

    // HIGH-VISIBILITY AVIATION SAFETY ORANGE TIPS (From Image 3 Reference)
    const orangeTipMat = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      roughness: 0.30,
      metalness: 0.10,
    });

    // Optical Glass Camera Lenses
    const mainLensMat = new THREE.MeshStandardMaterial({
      color: 0x050d18,
      emissive: 0x0088cc,
      emissiveIntensity: 0.5,
      roughness: 0.05,
      metalness: 0.95,
    });

    // Infrared Thermal Sensor Aperture (Germanium gold/amber reflection)
    const thermalLensMat = new THREE.MeshStandardMaterial({
      color: 0x6b5324,
      emissive: 0xd4a034,
      emissiveIntensity: 0.45,
      roughness: 0.15,
      metalness: 0.85,
    });

    // Laser Rangefinder Aperture (Dark Ruby)
    const lrfLensMat = new THREE.MeshStandardMaterial({
      color: 0x4a0a10,
      roughness: 0.1,
      metalness: 0.9,
    });

    // High-Impact Silicone Rubber Landing Pads
    const rubberPadMat = new THREE.MeshStandardMaterial({
      color: 0x0a0a0c,
      roughness: 0.95,
      metalness: 0.0,
    });

    // Intense Aviation Emissive LEDs (Sci-Fi Glow)
    const ledGreen = new THREE.MeshStandardMaterial({ color: 0x10b981, emissive: 0x10b981, emissiveIntensity: 4.0 });
    const ledRed = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 4.0 });
    const ledWhite = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 4.0 });
    const neonOrange = new THREE.MeshStandardMaterial({ color: 0xff5500, emissive: 0xff5500, emissiveIntensity: 5.0 });

    // ROOT HANGAR DRONE GROUP
    const droneGroup = new THREE.Group();
    scene.add(droneGroup);

    // Dynamic Core Glow Light
    const coreGlow = new THREE.PointLight(0xff5500, 2.0, 4.0);
    coreGlow.position.set(0, 0, 0);
    droneGroup.add(coreGlow);

    // Ground Contact Shadow Plane
    const shadowGeo = new THREE.PlaneGeometry(4.4, 4.4);
    const canvas = document.createElement("canvas");
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      grad.addColorStop(0, "rgba(0, 0, 0, 0.36)");
      grad.addColorStop(0.35, "rgba(0, 0, 0, 0.16)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 128, 128);
    }
    const shadowTex = new THREE.CanvasTexture(canvas);
    const shadowMat = new THREE.MeshBasicMaterial({
      map: shadowTex,
      transparent: true,
      depthWrite: false,
    });
    const shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
    shadowMesh.rotation.x = -Math.PI / 2;
    shadowMesh.position.y = -0.52;
    scene.add(shadowMesh);

    // ==============================================
    // 1. CHISELED ENTERPRISE FUSELAGE (DJI MATRICE ARCHITECTURE)
    // Angular, chamfered tactical monocoque with zero oval blobs
    // ==============================================
    const fuselageGroup = new THREE.Group();
    droneGroup.add(fuselageGroup);

    const bodyScale = type === "octacopter" ? 1.08 : type === "hexacopter" ? 1.02 : 0.96;
    const bodyLength = 1.05 * bodyScale;
    const bodyWidth = 0.44 * bodyScale;
    const bodyHeight = 0.22 * bodyScale;

    // A) Lower Magnesium Belly Chassis
    const lowerBelly = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.92, bodyHeight * 0.45, bodyLength * 0.90),
      underHullMat
    );
    lowerBelly.position.set(0, -bodyHeight * 0.24, -bodyLength * 0.02);
    fuselageGroup.add(lowerBelly);

    // B) Main Mid-Hull Deck (Tactical Gray Chamfered Monocoque)
    const midHull = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth, bodyHeight * 0.55, bodyLength * 0.88),
      tacticalHullMat
    );
    midHull.position.set(0, bodyHeight * 0.08, -bodyLength * 0.03);
    fuselageGroup.add(midHull);

    // Sci-Fi Orange Emissive Vents on the Side
    [-1, 1].forEach((side) => {
      const sideVent = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.04, 0.3),
        neonOrange
      );
      sideVent.position.set(side * (bodyWidth * 0.5), bodyHeight * 0.08, -bodyLength * 0.05);
      fuselageGroup.add(sideVent);
    });

    // C) Forward-Sloping Cockpit Nose Cowl
    const noseCowl = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.86, bodyHeight * 0.50, bodyLength * 0.32),
      tacticalHullMat
    );
    noseCowl.position.set(0, bodyHeight * 0.04, bodyLength * 0.44);
    noseCowl.rotation.x = 0.12; // Forward aerodynamic downward rake
    fuselageGroup.add(noseCowl);

    // Front Heat-Sink Grille / Ventilation Louvers
    [-0.03, 0.02].forEach((yOff) => {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(bodyWidth * 0.65, 0.018, 0.02),
        titaniumTrimMat
      );
      vent.position.set(0, yOff, bodyLength * 0.59);
      fuselageGroup.add(vent);
    });

    // D) Forward Stereo Obstacle Avoidance Cameras (Upper Nose - Binocular Eyes)
    [-0.10 * bodyScale, 0.10 * bodyScale].forEach((xOff) => {
      // Sensor eye housing
      const eyeHousing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.035, 0.035, 0.04, 16),
        titaniumTrimMat
      );
      eyeHousing.rotation.x = Math.PI / 2;
      eyeHousing.position.set(xOff, bodyHeight * 0.14, bodyLength * 0.56);
      fuselageGroup.add(eyeHousing);

      // Glass camera element
      const eyeLens = new THREE.Mesh(
        new THREE.CircleGeometry(0.024, 16),
        mainLensMat
      );
      eyeLens.position.set(xOff, bodyHeight * 0.14, bodyLength * 0.582);
      fuselageGroup.add(eyeLens);
    });

    // E) Top RTK GNSS Antenna Module (Centimeter Precision Cylindrical Puck on Roof)
    const rtkBase = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12 * bodyScale, 0.13 * bodyScale, 0.04, 20),
      titaniumTrimMat
    );
    rtkBase.position.set(0, bodyHeight * 0.36, -bodyLength * 0.05);
    fuselageGroup.add(rtkBase);

    const rtkPuck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11 * bodyScale, 0.115 * bodyScale, 0.14, 20),
      tacticalHullMat
    );
    rtkPuck.position.set(0, bodyHeight * 0.36 + 0.08, -bodyLength * 0.05);
    fuselageGroup.add(rtkPuck);

    // RTK Top Beveled Cap & Status Beacon
    const rtkCap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095 * bodyScale, 0.11 * bodyScale, 0.03, 20),
      titaniumTrimMat
    );
    rtkCap.position.set(0, bodyHeight * 0.36 + 0.16, -bodyLength * 0.05);
    fuselageGroup.add(rtkCap);

    // For Hexacopter & Octacopter: Add dual rear RTK antenna masts
    if (type !== "quadcopter") {
      [-0.14 * bodyScale, 0.14 * bodyScale].forEach((xOff) => {
        const mast = new THREE.Mesh(
          new THREE.CylinderGeometry(0.015, 0.015, 0.16, 8),
          carbonArmMat
        );
        mast.position.set(xOff, bodyHeight * 0.35 + 0.08, -bodyLength * 0.36);
        fuselageGroup.add(mast);

        const mastPuck = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.06, 0.035, 16),
          titaniumTrimMat
        );
        mastPuck.position.set(xOff, bodyHeight * 0.35 + 0.17, -bodyLength * 0.36);
        fuselageGroup.add(mastPuck);
      });
    }

    // F) Rear Longitudinal Battery Compartment & Release Latch
    const batteryPack = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.78, bodyHeight * 0.48, bodyLength * 0.40),
      underHullMat
    );
    batteryPack.position.set(0, bodyHeight * 0.12, -bodyLength * 0.46);
    fuselageGroup.add(batteryPack);

    // Battery Quick-Release Handle & Dual Safety Latches
    const batteryHandle = new THREE.Mesh(
      new THREE.BoxGeometry(bodyWidth * 0.50, 0.05, 0.06),
      titaniumTrimMat
    );
    batteryHandle.position.set(0, bodyHeight * 0.16, -bodyLength * 0.64);
    fuselageGroup.add(batteryHandle);

    // Rear Anti-Collision Beacon Strobe
    const tailStrobe = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 8), ledWhite);
    tailStrobe.position.set(0, bodyHeight * 0.14, -bodyLength * 0.67);
    fuselageGroup.add(tailStrobe);

    // ==============================================
    // 2. ENTERPRISE MULTI-SENSOR GIMBAL CAMERA (FRONT/UNDERSIDE)
    // Directly matching the DJI Matrice enterprise sensor payload
    // ==============================================
    const gimbalGroup = new THREE.Group();
    gimbalGroup.position.set(0, -bodyHeight * 0.38, bodyLength * 0.34);
    fuselageGroup.add(gimbalGroup);

    // Gimbal Yaw Attachment Collar
    const gimbalCollar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.08, 0.05, 16),
      motorBellMat
    );
    gimbalGroup.add(gimbalCollar);

    // 3-Axis Motorized Gimbal Yoke
    const gimbalYoke = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.03, 0.06),
      titaniumTrimMat
    );
    gimbalYoke.position.set(0, -0.06, 0);
    gimbalGroup.add(gimbalYoke);

    [-0.11, 0.11].forEach((xSide) => {
      const yokeArm = new THREE.Mesh(
        new THREE.BoxGeometry(0.025, 0.12, 0.05),
        titaniumTrimMat
      );
      yokeArm.position.set(xSide, -0.11, 0);
      gimbalGroup.add(yokeArm);
    });

    // Rugged Multi-Sensor Camera Block
    const camBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.16, 0.16),
      tacticalHullMat
    );
    camBlock.position.set(0, -0.12, 0.04);
    gimbalGroup.add(camBlock);

    // 1) Primary Zoom Telephoto Lens (Large circular aperture)
    const zoomBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.045, 0.04, 16),
      motorBellMat
    );
    zoomBarrel.rotation.x = Math.PI / 2;
    zoomBarrel.position.set(-0.042, -0.13, 0.12);
    gimbalGroup.add(zoomBarrel);

    const zoomLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.036, 16),
      mainLensMat
    );
    zoomLens.position.set(-0.042, -0.13, 0.142);
    gimbalGroup.add(zoomLens);

    // 2) Wide-Angle Survey Lens (Medium circular aperture)
    const wideBarrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.032, 0.034, 0.03, 14),
      motorBellMat
    );
    wideBarrel.rotation.x = Math.PI / 2;
    wideBarrel.position.set(0.042, -0.10, 0.12);
    gimbalGroup.add(wideBarrel);

    const wideLens = new THREE.Mesh(
      new THREE.CircleGeometry(0.026, 14),
      mainLensMat
    );
    wideLens.position.set(0.042, -0.10, 0.137);
    gimbalGroup.add(wideLens);

    // 3) Thermal Infrared Sensor (Germanium Gold/Amber Window)
    const thermalFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.055, 0.045, 0.02),
      titaniumTrimMat
    );
    thermalFrame.position.set(0.042, -0.155, 0.12);
    gimbalGroup.add(thermalFrame);

    const thermalLens = new THREE.Mesh(
      new THREE.PlaneGeometry(0.04, 0.032),
      thermalLensMat
    );
    thermalLens.position.set(0.042, -0.155, 0.132);
    gimbalGroup.add(thermalLens);

    // 4) Laser Rangefinder (LRF) Optical Window
    const lrfFrame = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.02, 0.01),
      lrfLensMat
    );
    lrfFrame.position.set(-0.042, -0.08, 0.12);
    gimbalGroup.add(lrfFrame);

    // ==============================================
    // 3. STRUCTURAL ROTOR ARMS WITH MOTOR-INTEGRATED LANDING FEET
    // Direct match to Image 3 (landing feet under each motor hub)
    // ==============================================
    interface PropellerData {
      group: THREE.Group;
      direction: number; // 1 = CW, -1 = CCW
    }
    const propellerList: PropellerData[] = [];

    let armAngles: number[] = [];
    let armLength = 1.35;

    if (type === "quadcopter") {
      // Symmetrical 4-rotor X-frame (45┬░, 135┬░, 225┬░, 315┬░)
      armAngles = [
        Math.PI * 0.25, // Front-Right
        Math.PI * 0.75, // Rear-Right
        Math.PI * 1.25, // Rear-Left
        Math.PI * 1.75, // Front-Left
      ];
      armLength = 1.34;
    } else if (type === "hexacopter") {
      // 6-rotor layout (every 60┬░)
      armAngles = [0, 1, 2, 3, 4, 5].map((i) => (i * Math.PI) / 3);
      armLength = 1.38;
    } else {
      // Octacopter: 8-rotor heavy lifter (every 45┬░)
      armAngles = [0, 1, 2, 3, 4, 5, 6, 7].map((i) => (i * Math.PI) / 4);
      armLength = 1.42;
    }

    armAngles.forEach((angle, idx) => {
      const armGroup = new THREE.Group();
      armGroup.rotation.y = angle;

      // Reinforced CNC Chassis Root Bulkhead (Square chamfered block)
      const rootSocket = new THREE.Mesh(
        new THREE.BoxGeometry(0.14, 0.10, 0.12),
        titaniumTrimMat
      );
      rootSocket.position.x = bodyWidth * 0.42;
      armGroup.add(rootSocket);

      // Aerodynamic Structural Arm (Chamfered hexagonal profile)
      const armTube = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.046, armLength, 8),
        carbonArmMat
      );
      armTube.rotation.z = Math.PI / 2;
      armTube.position.x = armLength / 2;
      armGroup.add(armTube);

      // Motor Hub Outer Bracket Housing (Tactical Gray)
      const motorHub = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 0.12, 0.14),
        tacticalHullMat
      );
      motorHub.position.set(armLength, 0.02, 0);
      armGroup.add(motorHub);

      // High-Torque Brushless Motor Bell (Brushed CNC metal)
      const motorBell = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.13, 0.09, 20),
        motorBellMat
      );
      motorBell.position.set(armLength, 0.10, 0);
      armGroup.add(motorBell);

      // Visible Copper Stator Ring
      const copperRing = new THREE.Mesh(
        new THREE.CylinderGeometry(0.132, 0.132, 0.028, 20),
        copperStatorMat
      );
      copperRing.position.set(armLength, 0.065, 0);
      armGroup.add(copperRing);

      // Motor Central Spindle Shaft
      const spindle = new THREE.Mesh(
        new THREE.CylinderGeometry(0.024, 0.024, 0.08, 12),
        motorBellMat
      );
      spindle.position.set(armLength, 0.17, 0);
      armGroup.add(spindle);

      // Navigation LED on outer arm tip
      const isRightSide = angle >= 0 && angle < Math.PI;
      const navLed = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 8, 8),
        isRightSide ? ledGreen : ledRed
      );
      navLed.position.set(armLength + 0.13, 0.04, 0);
      armGroup.add(navLed);

      // ==============================================
      // MOTOR-INTEGRATED TAPERED LANDING LEG (FROM IMAGE 3)
      // Directly extending down beneath each motor hub!
      // ==============================================
      const legHeight = 0.44;
      const landingLeg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.028, 0.018, legHeight, 10),
        tacticalHullMat
      );
      landingLeg.position.set(armLength, -legHeight / 2 - 0.02, 0);
      armGroup.add(landingLeg);

      // High-Impact Silicone Rubber Foot Pad
      const rubberFoot = new THREE.Mesh(
        new THREE.CylinderGeometry(0.026, 0.032, 0.04, 10),
        rubberPadMat
      );
      rubberFoot.position.set(armLength, -legHeight - 0.03, 0);
      armGroup.add(rubberFoot);

      // ==============================================
      // PROPELLER WITH VIBRANT AVIATION SAFETY ORANGE TIPS (IMAGE 3)
      // ==============================================
      const propGroup = new THREE.Group();
      propGroup.position.set(armLength, 0.18, 0);

      // Central Aerodynamic Spinner Cap Nut
      const spinnerNut = new THREE.Mesh(
        new THREE.ConeGeometry(0.052, 0.08, 16),
        titaniumTrimMat
      );
      spinnerNut.position.y = 0.04;
      propGroup.add(spinnerNut);

      // 2 Folding Carbon Fiber Airfoil Blades
      const bladeRadius = type === "octacopter" ? 0.46 : type === "hexacopter" ? 0.50 : 0.55;
      const orangeTipRatio = 0.24; // 24% of blade tip is safety orange

      [-1, 1].forEach((dir) => {
        // Main Carbon Blade Body
        const carbonLength = bladeRadius * (1 - orangeTipRatio);
        const bladeHalf = new THREE.Mesh(
          new THREE.BoxGeometry(carbonLength, 0.012, 0.068),
          bladeMat
        );
        bladeHalf.position.x = (dir * carbonLength) / 2;
        bladeHalf.rotation.x = dir * 0.13;
        propGroup.add(bladeHalf);

        // Vibrant Safety Orange Tip (As seen on Image 3 DJI Matrice)
        const tipLength = bladeRadius * orangeTipRatio;
        const orangeTip = new THREE.Mesh(
          new THREE.BoxGeometry(tipLength, 0.013, 0.070),
          orangeTipMat
        );
        orangeTip.position.x = dir * (carbonLength + tipLength / 2);
        orangeTip.rotation.x = dir * 0.13;
        propGroup.add(orangeTip);
      });

      armGroup.add(propGroup);

      // Alternating CW and CCW Rotation
      const direction = idx % 2 === 0 ? 1 : -1;
      propellerList.push({ group: propGroup, direction });

      droneGroup.add(armGroup);
    });

    // Initial cinematic pitch and yaw
    droneGroup.rotation.x = 0.28;
    droneGroup.rotation.y = -0.65;

    // ==============================================
    // 4. FULL 6-DOF ORBIT CONTROLS (PAN, ZOOM, ROTATE)
    // ==============================================
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true;
    controls.enablePan = true;
    // Removed maxPolarAngle limit so user can look at the belly of the drone freely
    controls.minDistance = 2.0;
    controls.maxDistance = 15.0;
    controls.enabled = interactive;
    controls.autoRotate = autoRotate && !interactive;
    controls.autoRotateSpeed = 1.5;

    controls.addEventListener("start", () => setIsInteracting(true));
    controls.addEventListener("end", () => setIsInteracting(false));

    // RESIZE OBSERVER
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ==============================================
    // 5. ANIMATION LOOP & SELECTION FLIGHT DYNAMICS
    // ==============================================
    let animationId: number;
    const clock = new THREE.Clock();

    let currentElevY = 0;
    let currentPosZ = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Dynamic vehicle selection elevation & forward glide
      const isCurrentSelected = isSelectedRef.current;
      const targetScale = isCurrentSelected ? 1.05 : 0.92;
      const targetElevY = isCurrentSelected ? 0.28 : 0;
      const targetPosZ = isCurrentSelected ? 0.20 : 0;

      droneGroup.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.08);

      // Smooth elevation into the spotlight
      currentElevY += (targetElevY - currentElevY) * 0.08;
      currentPosZ += (targetPosZ - currentPosZ) * 0.08;
      droneGroup.position.z = currentPosZ;
      droneGroup.position.y = currentElevY + Math.sin(elapsed * 2.2) * (isCurrentSelected ? 0.03 : 0.015);

      // Propellers rotation
      const propSpeed = isCurrentSelected ? 34 : 22;
      propellerList.forEach((prop) => {
        prop.group.rotation.y += prop.direction * propSpeed * delta;
      });

      // Update OrbitControls
      controls.update();

      // Ground shadow expansion
      if (shadowMesh) {
        const shadowTargetScale = isCurrentSelected ? 1.25 : 1.0;
        shadowMesh.scale.lerp(new THREE.Vector3(shadowTargetScale, shadowTargetScale, 1), 0.08);
      }

      renderer.render(scene, camera);
    };

    animate();

    // CLEANUP
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();

      controls.dispose();

      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }

      renderer.dispose();
    };
  }, [type, autoRotate, interactive]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none cursor-grab active:cursor-grabbing overflow-hidden ${className}`}
    />
  );
}
