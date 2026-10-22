// ==========================================================
// DRONE PILOT — WORLD ENVIRONMENT
// Sky, atmosphere, sun, lighting, shadows, and procedural clouds
// ==========================================================

import * as THREE from "three";
import { EnvironmentState } from "@/lib/simulation/types";

export class WorldEnvironment {
  public group = new THREE.Group();
  private scene: THREE.Scene;
  private cloudClusters: THREE.Group[] = [];
  private sunLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private skyMat!: THREE.ShaderMaterial;
  private cloudMat!: THREE.MeshStandardMaterial;
  private ambientLight!: THREE.AmbientLight;

  // Weather Particles
  private rainParticles?: THREE.Points;
  private windParticles?: THREE.Points;
  private windPositions?: Float32Array;
  private rainPositions?: Float32Array;
  private rainVelocities?: Float32Array;
  private fogDensityTarget = 0.0001;
  private lightningLight!: THREE.PointLight;
  private nextLightningTime = 0;
  
  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildAtmosphere(scene);
    this.buildSkyClouds();
    this.buildWeatherEffects();
    scene.add(this.group);
  }

  private buildAtmosphere(scene: THREE.Scene) {
    scene.background = new THREE.Color(0xb8d9f5);
    scene.fog = new THREE.FogExp2(0xc5dff7, 0.0001);

    const sunDir = new THREE.Vector3(120, 200, 90).normalize();
    
    this.skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x1a66cc) },
        midColor: { value: new THREE.Color(0x60a5fa) },
        horizonColor: { value: new THREE.Color(0xcde3fa) },
        bottomColor: { value: new THREE.Color(0x94b8db) },
        sunDir: { value: sunDir },
        sunGlowColor: { value: new THREE.Color(0xfff3d0) },
        offset: { value: 60.0 },
        exponent: { value: 0.72 },
        // Add a uniform for heat haze (orange tint)
        heatTint: { value: new THREE.Color(0x000000) },
        stormBlend: { value: 0.0 }
      },
      vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldPosition = worldPosition.xyz;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 midColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        uniform vec3 sunDir;
        uniform vec3 sunGlowColor;
        uniform float offset;
        uniform float exponent;
        uniform vec3 heatTint;
        uniform float stormBlend;
        varying vec3 vWorldPosition;

        void main() {
          vec3 viewDir = normalize(vWorldPosition);
          float h = normalize(vWorldPosition + vec3(0.0, offset, 0.0)).y;
          vec3 sky;
          if (h > 0.0) {
            float t = pow(h, exponent);
            sky = mix(horizonColor, mix(midColor, topColor, t * 0.75), t);
          } else {
            sky = mix(horizonColor, bottomColor, clamp(-h * 4.0, 0.0, 1.0));
          }

          float cosTheta = dot(viewDir, sunDir);
          if (cosTheta > 0.0) {
            float mie = pow(cosTheta, 64.0) * 0.35 + pow(cosTheta, 256.0) * 0.6 + pow(cosTheta, 1024.0) * 0.8;
            sky += sunGlowColor * mie;
          }
          
          sky += heatTint * clamp(1.0 - h * 2.0, 0.0, 1.0);
          vec3 stormSky = mix(sky, vec3(0.2, 0.22, 0.25), stormBlend);

          gl_FragColor = vec4(stormSky, 1.0);
        }
      `,
    });

    const skyGeo = new THREE.SphereGeometry(4600, 32, 24);
    const skyMesh = new THREE.Mesh(skyGeo, this.skyMat);
    this.group.add(skyMesh);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.42);
    this.group.add(this.ambientLight);

    this.sunLight = new THREE.DirectionalLight(0xfffae8, 2.5);
    this.sunLight.position.set(220, 360, 160);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 900;
    this.sunLight.shadow.camera.left = -260;
    this.sunLight.shadow.camera.right = 260;
    this.sunLight.shadow.camera.top = 260;
    this.sunLight.shadow.camera.bottom = -260;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.04;
    this.group.add(this.sunLight);
    this.group.add(this.sunLight.target);

    this.hemiLight = new THREE.HemisphereLight(0xdbeafe, 0x475569, 0.58);
    this.group.add(this.hemiLight);
  }

  private buildSkyClouds() {
    const cloudsContainer = new THREE.Group();

    this.cloudMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.92,
      metalness: 0.0,
      emissive: 0xffffff,
      emissiveIntensity: 0.06,
      transparent: true,
      opacity: 0.94,
      depthWrite: false,
    });

    const cloudClusterConfigs = [
      { x: -950, y: 340, z: -800, scale: 2.5 },
      { x: -620, y: 380, z: -1100, scale: 2.9 },
      { x: -280, y: 310, z: -550, scale: 2.3 },
      { x: 150, y: 355, z: -750, scale: 2.6 },
      { x: 680, y: 390, z: -620, scale: 2.4 },
      { x: 1100, y: 320, z: -300, scale: 2.8 },
      { x: -1100, y: 340, z: 100, scale: 2.7 },
      { x: -750, y: 325, z: 420, scale: 2.2 },
      { x: -350, y: 390, z: 250, scale: 2.9 },
      { x: 200, y: 360, z: 180, scale: 2.4 },
      { x: 750, y: 330, z: 450, scale: 2.8 },
      { x: 1200, y: 370, z: 650, scale: 3.0 },
      { x: -500, y: 335, z: 900, scale: 2.5 },
      { x: 0, y: 380, z: 800, scale: 2.9 },
      { x: 450, y: 340, z: 1050, scale: 2.6 },
      { x: -150, y: 410, z: -150, scale: 3.1 },
    ];

    const puffOffsets = [
      { x: 0, y: 0, z: 0, rx: 22, ry: 12, rz: 20 },
      { x: 16, y: 4, z: 6, rx: 18, ry: 13, rz: 16 },
      { x: -16, y: 3, z: -5, rx: 18, ry: 12, rz: 17 },
      { x: 6, y: 10, z: -2, rx: 15, ry: 14, rz: 14 },
      { x: -7, y: 9, z: 4, rx: 14, ry: 13, rz: 13 },
      { x: 28, y: -1, z: 3, rx: 14, ry: 9, rz: 12 },
      { x: -26, y: -1, z: 5, rx: 14, ry: 9, rz: 13 },
      { x: 2, y: -2, z: 16, rx: 13, ry: 8, rz: 12 },
      { x: -2, y: -2, z: -16, rx: 13, ry: 8, rz: 12 },
    ];

    cloudClusterConfigs.forEach((coord) => {
      const cluster = new THREE.Group();
      cluster.position.set(coord.x, coord.y, coord.z);

      puffOffsets.forEach((p) => {
        // Use a stylized low-poly Dodecahedron for natural looking aesthetic clouds
        const puffGeo = new THREE.DodecahedronGeometry(1, 1);
        // Flatten the bottom slightly for cumulus cloud look
        const positions = puffGeo.attributes.position;
        for(let i=0; i<positions.count; i++) {
           let y = positions.getY(i);
           if (y < -0.3) {
               positions.setY(i, -0.3 + (y + 0.3) * 0.2); // Squash the bottom heavily
           }
        }
        puffGeo.computeVertexNormals();
        
        // Scale wide and fluffy
        puffGeo.scale(p.rx * coord.scale * 1.5, p.ry * coord.scale * 0.8, p.rz * coord.scale * 1.5);
        const puff = new THREE.Mesh(puffGeo, this.cloudMat);
        puff.position.set(p.x * coord.scale * 1.2, p.y * coord.scale * 0.5, p.z * coord.scale * 1.2);
        puff.rotation.y = Math.random() * Math.PI;
        cluster.add(puff);
      });

      this.cloudClusters.push(cluster);
      cloudsContainer.add(cluster);
    });

    this.group.add(cloudsContainer);
  }

  private buildWeatherEffects() {
    // Rain Particles
    const rainCount = 15000;
    this.rainPositions = new Float32Array(rainCount * 3);
    this.rainVelocities = new Float32Array(rainCount);
    for (let i = 0; i < rainCount; i++) {
      this.rainPositions[i * 3] = (Math.random() - 0.5) * 400;
      this.rainPositions[i * 3 + 1] = Math.random() * 200;
      this.rainPositions[i * 3 + 2] = (Math.random() - 0.5) * 400;
      this.rainVelocities[i] = 12 + Math.random() * 8; // m/s
    }
    const rainGeo = new THREE.BufferGeometry();
    rainGeo.setAttribute("position", new THREE.BufferAttribute(this.rainPositions, 3));
    
    // Create a simple vertical streak texture for rain
    const canvas = document.createElement("canvas");
    canvas.width = 128; canvas.height = 128;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      const grad = ctx.createLinearGradient(0, 0, 0, 128);
      grad.addColorStop(0, "rgba(200,220,255,0)");
      grad.addColorStop(0.5, "rgba(200,220,255,0.8)");
      grad.addColorStop(1, "rgba(200,220,255,0)");
      ctx.fillStyle = grad;
      // Draw a thin line in the center of the square canvas
      ctx.fillRect(62, 0, 4, 128);
    }
    const rainTex = new THREE.CanvasTexture(canvas);
    
    const rainMat = new THREE.PointsMaterial({
      color: 0xcccccc,
      size: 15.0, // Size of the square quad (the streak will be 4/128th of this)
      map: rainTex,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
      blending: THREE.NormalBlending // Normal blending looks better for rain than additive
    });
    
    this.rainParticles = new THREE.Points(rainGeo, rainMat);
    this.rainParticles.visible = false;
    this.group.add(this.rainParticles);

    // Lightning light
    this.lightningLight = new THREE.PointLight(0xdbeafe, 0, 2000);
    this.lightningLight.position.set(0, 400, 0);
    this.group.add(this.lightningLight);

    // Wind Dust Particles
    const windCount = 3000;
    this.windPositions = new Float32Array(windCount * 3);
    for (let i = 0; i < windCount; i++) {
      this.windPositions[i * 3] = (Math.random() - 0.5) * 200;
      this.windPositions[i * 3 + 1] = Math.random() * 50; // lower to the ground
      this.windPositions[i * 3 + 2] = (Math.random() - 0.5) * 200;
    }
    const windGeo = new THREE.BufferGeometry();
    windGeo.setAttribute("position", new THREE.BufferAttribute(this.windPositions, 3));
    
    const windCanvas = document.createElement("canvas");
    windCanvas.width = 32; windCanvas.height = 4;
    const wctx = windCanvas.getContext("2d");
    if (wctx) {
      const grad = wctx.createLinearGradient(0, 0, 32, 0);
      grad.addColorStop(0, "rgba(255,255,255,0)");
      grad.addColorStop(0.5, "rgba(255,255,255,0.4)");
      grad.addColorStop(1, "rgba(255,255,255,0)");
      wctx.fillStyle = grad;
      wctx.fillRect(0, 0, 32, 4);
    }
    const windTex = new THREE.CanvasTexture(windCanvas);
    
    const windMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 4.0,
      map: windTex,
      transparent: true,
      opacity: 0, // dynamic
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    
    this.windParticles = new THREE.Points(windGeo, windMat);
    this.windParticles.renderOrder = 2;
    this.group.add(this.windParticles);
  }

  public update(dt: number, elapsed: number, dronePos?: THREE.Vector3, envState?: EnvironmentState) {
    if (dronePos) {
      const sunOffsetX = 220;
      const sunOffsetY = 360;
      const sunOffsetZ = 160;
      this.sunLight.position.set(
        dronePos.x + sunOffsetX,
        dronePos.y + sunOffsetY,
        dronePos.z + sunOffsetZ
      );
      this.sunLight.target.position.set(dronePos.x, dronePos.y, dronePos.z);
      this.sunLight.target.updateMatrixWorld();
      
      if (this.rainParticles) {
        this.rainParticles.position.x = dronePos.x;
        this.rainParticles.position.z = dronePos.z;
      }
      this.lightningLight.position.x = dronePos.x;
      this.lightningLight.position.z = dronePos.z;
    }

    for (let i = 0; i < this.cloudClusters.length; i++) {
      const cluster = this.cloudClusters[i];
      cluster.position.x += dt * 2.2;
      if (cluster.position.x > 1400) cluster.position.x = -1400;
    }

    if (envState) {
      // Heat Haze
      if (this.windParticles && dronePos) {
        this.windParticles.position.x = dronePos.x;
        this.windParticles.position.z = dronePos.z;
        const windSpeed = envState.windSpeed || 0;
        
        // Show wind if speed > 2 m/s
        const targetOpacity = Math.min(0.8, Math.max(0, (windSpeed - 2) * 0.05));
        (this.windParticles.material as THREE.PointsMaterial).opacity = targetOpacity;

        if (targetOpacity > 0 && this.windPositions) {
          const windDirRad = ((envState.windDirection || 0) * Math.PI) / 180;
          const vx = Math.cos(windDirRad) * windSpeed * dt * 2.0;
          const vz = Math.sin(windDirRad) * windSpeed * dt * 2.0;
          
          for (let i = 0; i < this.windPositions.length / 3; i++) {
            this.windPositions[i * 3] += vx;
            this.windPositions[i * 3 + 2] += vz;
            
            // Loop boundaries relative to drone
            if (this.windPositions[i * 3] > 100) this.windPositions[i * 3] -= 200;
            if (this.windPositions[i * 3] < -100) this.windPositions[i * 3] += 200;
            if (this.windPositions[i * 3 + 2] > 100) this.windPositions[i * 3 + 2] -= 200;
            if (this.windPositions[i * 3 + 2] < -100) this.windPositions[i * 3 + 2] += 200;
          }
          this.windParticles.geometry.attributes.position.needsUpdate = true;
          this.windParticles.rotation.y = -windDirRad; // align texture streak
        }
      }

        if (envState.temperature > 30) {
        const heatIntensity = Math.min(1.0, (envState.temperature - 30) / 15.0);
        this.skyMat.uniforms.heatTint.value.setRGB(0.8 * heatIntensity, 0.4 * heatIntensity, 0.0);
      } else {
        this.skyMat.uniforms.heatTint.value.setRGB(0, 0, 0);
      }

      // Rain & Storm visuals
      let stormFactor = envState.rainIntensity || 0;
      let rainOpacity = (envState.rainIntensity || 0) * 0.8;
      let rainSpeedMult = 1.0 + (envState.rainIntensity || 0) * 3.0; // Heavy rain falls much faster!
      
      this.skyMat.uniforms.stormBlend.value += (stormFactor - this.skyMat.uniforms.stormBlend.value) * dt * 0.5;
      
      const currentStormBlend = this.skyMat.uniforms.stormBlend.value;
      const cloudColor = new THREE.Color(0xffffff).lerp(new THREE.Color(0x444850), currentStormBlend);
      this.cloudMat.color.copy(cloudColor);
      this.cloudMat.emissiveIntensity = 0.06 * (1.0 - currentStormBlend);
      
      const fogColor = new THREE.Color(0xc5dff7).lerp(new THREE.Color(0x555c66), currentStormBlend);
      (this.scene.fog as THREE.FogExp2).color.copy(fogColor);
      if (this.scene.background) {
         (this.scene.background as THREE.Color).copy(fogColor);
      }
      
      // Hide clouds completely if rain is significant
      for (let i = 0; i < this.cloudClusters.length; i++) {
        this.cloudClusters[i].visible = (envState.rainIntensity || 0) < 0.2;
      }

      this.sunLight.intensity = 2.5 * (1.0 - currentStormBlend * 0.8);
      this.ambientLight.intensity = 0.42 * (1.0 - currentStormBlend * 0.5);

      if (this.rainParticles && this.rainPositions && this.rainVelocities) {
        this.rainParticles.visible = rainOpacity > 0;
        if (this.rainParticles.visible) {
          (this.rainParticles.material as THREE.PointsMaterial).opacity = rainOpacity;
          const pos = this.rainPositions;
          const vel = this.rainVelocities;
          for (let i = 0; i < pos.length / 3; i++) {
            pos[i * 3 + 1] -= vel[i] * rainSpeedMult * dt;
            // Apply wind to rain
            pos[i * 3] += (envState.windSpeed * Math.sin(envState.windDirection * Math.PI / 180)) * dt;
            pos[i * 3 + 2] += (envState.windSpeed * Math.cos(envState.windDirection * Math.PI / 180)) * dt;

            if (pos[i * 3 + 1] < 0) {
              pos[i * 3 + 1] = 200 + Math.random() * 50;
              pos[i * 3] = (Math.random() - 0.5) * 400;
              pos[i * 3 + 2] = (Math.random() - 0.5) * 400;
            }
          }
          this.rainParticles.geometry.attributes.position.needsUpdate = true;
        }
      }

      // Lightning (happens randomly if rain > 0.4)
      if ((envState.rainIntensity || 0) > 0.4) {
        if (elapsed > this.nextLightningTime) {
          this.lightningLight.intensity = 15000 + Math.random() * 10000;
          this.nextLightningTime = elapsed + 2.0 + Math.random() * 8.0;
        } else {
          this.lightningLight.intensity = Math.max(0, this.lightningLight.intensity - dt * 50000);
        }
      } else {
        this.lightningLight.intensity = 0;
      }

      // Fog (Visibility) mapping: 1.0 = clear, 0.0 = zero visibility
      // Density 0.0001 is clear, 0.02 is dense fog
      const vis = envState.visibility !== undefined ? envState.visibility : 1.0;
      this.fogDensityTarget = 0.0001 + (1.0 - vis) * 0.015;

      const currentFog = (this.scene.fog as THREE.FogExp2).density;
      (this.scene.fog as THREE.FogExp2).density += (this.fogDensityTarget - currentFog) * dt * 0.2;
    }
  }
}


