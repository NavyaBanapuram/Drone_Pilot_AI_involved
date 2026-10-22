"use client";

import React, { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { buildProfessionalUAV } from "../ui/aircraft-model-builder";

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
  const isInteractingRef = useRef(false);
  const setIsInteracting = (val: boolean) => {
    isInteractingRef.current = val;
  };
  
  // Track internal state for smooth switching between platforms
  const currentTypeRef = useRef(type);
  const targetTypeRef = useRef(type);

  useEffect(() => {
    isSelectedRef.current = isSelected;
  }, [isSelected]);

  useEffect(() => {
    targetTypeRef.current = type;
  }, [type]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // SCENE & CAMERA
    const scene = new THREE.Scene();
    const width = container.clientWidth || 300;
    const height = container.clientHeight || 200;

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 100);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    container.appendChild(renderer.domElement);

    // ==============================================
    // LIGHTING (Aerospace Product Presentation)
    // ==============================================
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 3.5);
    keyLight.position.set(5, 8, 5);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.bias = -0.0005;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xe0eeff, 1.8);
    fillLight.position.set(-5, 3, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 3.0);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);

    // ==============================================
    // PREMIUM MATERIALS
    // ==============================================
    const silverAlloy = new THREE.MeshStandardMaterial({
      color: 0xd1d5db, 
      roughness: 0.35,
      metalness: 0.85,
    });

    const matteComposite = new THREE.MeshStandardMaterial({
      color: 0x24262a, 
      roughness: 0.65,
      metalness: 0.3,
    });

    const satinBlack = new THREE.MeshStandardMaterial({
      color: 0x111112,
      roughness: 0.4,
      metalness: 0.4,
    });

    const machinedAlloy = new THREE.MeshStandardMaterial({
      color: 0x6b7280,
      roughness: 0.25,
      metalness: 0.75,
    });

    const propellerMat = new THREE.MeshStandardMaterial({
      color: 0x18181a,
      roughness: 0.5,
      metalness: 0.15,
    });

    const neonOrange = new THREE.MeshStandardMaterial({
      color: 0xff5500,
      emissive: 0xff5500,
      emissiveIntensity: 1.5,
      roughness: 0.3,
      metalness: 0.2,
    });
    
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0x050505,
      metalness: 0.9,
      roughness: 0.05,
      transmission: 0.9,
      thickness: 0.05,
    });

    // ==============================================
    // MASTER DRONE GROUP
    // ==============================================
    const masterGroup = new THREE.Group();
    scene.add(masterGroup);
    
    let currentDroneGroup: THREE.Group | null = null;
    const propellers: { group: THREE.Group; direction: number }[] = [];

    // Helper for chamfered box (basic structural components)
    // Using BoxGeometry and applying bevel manually is complex, 
    // so we will build realistic blocky shapes
    const createBox = (w: number, h: number, d: number, mat: THREE.Material) => {
      const geo = new THREE.BoxGeometry(w, h, d);
      return new THREE.Mesh(geo, mat);
    };
    const createCylinder = (rt: number, rb: number, h: number, s: number, mat: THREE.Material) => {
      const geo = new THREE.CylinderGeometry(rt, rb, h, s);
      return new THREE.Mesh(geo, mat);
    };

    // Factory function to build the drone based on type
    const buildDrone = (platformType: string) => {
      const parts = buildProfessionalUAV(platformType as any);
      propellers.length = 0;
      parts.propellers.forEach(p => propellers.push({ group: p.bladeGroup, direction: p.direction }));
      
      
      return parts.rootGroup;
    };

    // ==============================================    // GROUND SHADOW
    // ==============================================
    const planeGeo = new THREE.PlaneGeometry(15, 15);
    const planeMat = new THREE.ShadowMaterial({ opacity: 0.2 });
    const plane = new THREE.Mesh(planeGeo, planeMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = -0.3; 
    plane.receiveShadow = true;
    scene.add(plane);

    // ==============================================
    // INTERACTION & CONTROLS
    // ==============================================
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = true; 
    controls.enablePan = false;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 1.0;
    controls.enabled = interactive;

    // A helper to automatically frame the drone based on its bounding sphere
    const frameDrone = (droneObj: THREE.Group, aspect: number) => {
      // Calculate Bounding Sphere
      const box = new THREE.Box3().setFromObject(droneObj);
      const sphere = new THREE.Sphere();
      box.getBoundingSphere(sphere);
      
      const center = sphere.center;
      const radius = sphere.radius;

      // Adjust target to visual center
      controls.target.copy(center);

      // Distance calculation based on FOV and Aspect Ratio
      const fovRad = camera.fov * (Math.PI / 180);
      let distance = radius / Math.sin(fovRad / 2);
      
      // If mobile landscape or tall narrow screen, adjust distance to ensure fit
      if (aspect < 1) {
          distance /= Math.pow(aspect, 0.7); // narrow screen, move camera back
      }

      // Add a framing margin that decreases for larger drones so they appear physically larger
      if (type === "octacopter") distance *= 0.70;
      else if (type === "hexacopter") distance *= 0.90;
      else distance *= 1.15;
      // Update Camera Position (keep current rotation angle but update distance/target)
      const direction = new THREE.Vector3().subVectors(camera.position, center).normalize();
      // If camera was exactly overlapping or uninitialized, give it a nice starting angle
      if (direction.lengthSq() < 0.1 || direction.y <= 0.01) {
          direction.set(0.5, 0.6, 1).normalize();
      }

      camera.position.copy(direction.multiplyScalar(distance).add(center));
      
      // Set zoom limits to prevent getting lost
      controls.minDistance = radius * 1.2;
      controls.maxDistance = radius * 4.0;
      
      camera.updateProjectionMatrix();
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      const aspect = w / h;
      camera.aspect = aspect;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);

      if (currentDroneGroup) {
          frameDrone(currentDroneGroup, aspect);
      }
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // ==============================================
    // ANIMATION LOOP
    // ==============================================
    let animationId: number;
    const clock = new THREE.Clock();
    
    // Initial mount
    currentDroneGroup = buildDrone(targetTypeRef.current);
    masterGroup.add(currentDroneGroup);
    
    // Initial framing — delay to allow flex layout to settle
    setTimeout(() => handleResize(), 100);
    // Second pass in case of slow paint
    setTimeout(() => handleResize(), 400);


    let transitionProgress = 1.0;
    let oldDroneGroup: THREE.Group | null = null;
    let transitionStartCameraTarget = new THREE.Vector3();
    let transitionEndCameraTarget = new THREE.Vector3();
    let transitionStartCameraPos = new THREE.Vector3();
    let transitionEndCameraPos = new THREE.Vector3();

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const delta = clock.getDelta();

      // Handle Smooth Switching
      if (currentTypeRef.current !== targetTypeRef.current) {
        currentTypeRef.current = targetTypeRef.current;
        transitionProgress = 0.0;
        
        oldDroneGroup = currentDroneGroup;
        currentDroneGroup = buildDrone(targetTypeRef.current);
        masterGroup.add(currentDroneGroup);
        
        // Calculate new bounding sphere for smooth camera transition
        const box = new THREE.Box3().setFromObject(currentDroneGroup);
        const sphere = new THREE.Sphere();
        box.getBoundingSphere(sphere);
        const center = sphere.center;
        const radius = sphere.radius;

        const fovRad = camera.fov * (Math.PI / 180);
        const aspect = camera.aspect;
        let distance = radius / Math.sin(fovRad / 2);
        if (aspect < 1) distance /= Math.pow(aspect, 0.7);
        if (targetTypeRef.current === "octacopter") distance *= 0.70;
        else if (targetTypeRef.current === "hexacopter") distance *= 0.90;
        else distance *= 1.15;

        transitionStartCameraTarget.copy(controls.target);
        transitionEndCameraTarget.copy(center);

        // Keep current angle, just change distance
        const direction = new THREE.Vector3().subVectors(camera.position, controls.target).normalize();
        if (direction.lengthSq() < 0.1) direction.set(0.5, 0.6, 1).normalize();
        
        transitionStartCameraPos.copy(camera.position);
        transitionEndCameraPos.copy(direction.multiplyScalar(distance).add(center));
        
        // Set new bounds
        controls.minDistance = radius * 1.2;
        controls.maxDistance = radius * 4.0;
        
        if (oldDroneGroup) {
           oldDroneGroup.visible = true;
        }
      }

      if (transitionProgress < 1.0) {
        transitionProgress += delta * 2.0; // ~500ms transition
        if (transitionProgress > 1.0) transitionProgress = 1.0;

        const ease = 1 - Math.pow(1 - transitionProgress, 3); // easeOutCubic

        // Lerp Camera
        if (!isInteractingRef.current) {
            controls.target.lerpVectors(transitionStartCameraTarget, transitionEndCameraTarget, ease);
            camera.position.lerpVectors(transitionStartCameraPos, transitionEndCameraPos, ease);
        }

        if (oldDroneGroup) {
          const s = 1 - ease;
          oldDroneGroup.scale.set(s, s, s);
          oldDroneGroup.rotation.y = ease * (Math.PI / 2); // sleek spin out
          
          if (transitionProgress === 1.0) {
            masterGroup.remove(oldDroneGroup);
            oldDroneGroup = null;
          }
        }

        if (currentDroneGroup) {
          const s = ease;
          currentDroneGroup.scale.set(s, s, s);
          currentDroneGroup.rotation.y = (1 - ease) * -(Math.PI / 2); // sleek spin in
        }
      } else {
        if (currentDroneGroup) {
          currentDroneGroup.scale.set(1, 1, 1);
          currentDroneGroup.rotation.y = 0;
          currentDroneGroup.position.y = 0;
        }
      }

      if (currentDroneGroup) {
        // Propeller Rotation (Linked to Motor RPM Concept)
        const baseRPM = isSelectedRef.current ? 25 : 5; // Fast if selected, slow idle if not
        propellers.forEach((prop) => {
          prop.group.rotation.y -= prop.direction * baseRPM * delta;
        });
      }

      // AutoRotate behavior - pause if user interacts
      controls.autoRotate = autoRotate && !isInteractingRef.current;
      controls.update();
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      controls.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [autoRotate, interactive]); // Removed isInteracting from dep array to avoid re-running effect on every hover

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full select-none outline-none touch-none cursor-grab active:cursor-grabbing ${className}`}
      onPointerDown={() => setIsInteracting(true)}
      onPointerUp={() => setIsInteracting(false)}
      onPointerLeave={() => setIsInteracting(false)}
    />
  );
}
