"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { DroneModel } from "@/types/drone";
import {
  TelemetryState,
  EnvironmentState,
  WeatherPreset,
  FlightAnalysisReport,
  ReplayFrame,
  PhysicsDebugTelemetry,
} from "@/lib/simulation/types";
import { getDroneDefinition } from "@/lib/simulation/drone-definitions";
import { FlightPhysicsEngine } from "@/lib/simulation/flight-physics";
import { InputManager } from "@/lib/simulation/input-manager";
import { FlightRecorder } from "@/lib/simulation/flight-recorder";
import { RemotePlayerState } from "@/lib/multiplayer/multiplayer-types";
import { MultiplayerClient } from "@/lib/multiplayer/multiplayer-client";
import { WorldScene } from "./world-scene";
import { EnvironmentManager } from "./world/environment-manager";
import { ModularDrone } from "./modular-drone";
import { ChaseCameraController, CameraMode } from "./chase-camera";
import { TelemetryHUD } from "./telemetry-hud";
import { FastTravelBase } from "./base-switcher-hud";
import { IslandMapModal } from "./island-map-modal";
import { NavigationWaypoint } from "./minimap-widget";
import { SimulationLoadingScreen } from "./loading/simulation-loading-screen";
import { EnvironmentControlPanel } from "./environment-control-panel";
import { TutorialOverlay } from "./tutorial-overlay";
import { LeftGlassPanel, RightGlassPanel } from "./glass-panels";
import { FlightAnalysisModal } from "./analysis/flight-analysis-modal";
import { FlightReplayModal } from "./replay/flight-replay-modal";
import { PhysicsDebugHUD } from "./debug/physics-debug-hud";
import { CrashReviveOverlay } from "./crash-revive-overlay";
import { RemoteDroneManager } from "./multiplayer/remote-drone-manager";
import { SpawnSystem } from "@/lib/world/spawn-system";
import { SpawnConfiguration } from "@/lib/world/world-types";
import { HELIPADS } from "@/lib/world/helipad-definitions";
import { useAuth } from "@/context/auth-context";
import { ScenarioEvaluationEngine } from "@/lib/simulation/scenario-engine";
import { ScenarioSessionOverlay } from "./scenario-session-overlay";
import { TrainingScenarioDef, ScenarioSessionState } from "@/lib/simulation/scenario-types";
import { AudioManager } from "@/lib/audio/audio-manager";
import { DroneAudio } from "@/lib/audio/drone-audio";
import { WindAudio } from "@/lib/audio/wind-audio";
import { EnvironmentZoneAudio } from "@/lib/audio/environment-zones";
import { SFXEvents } from "@/lib/audio/sfx-events";
import { REGION_LIST } from "@/lib/world/region-definitions";
import {
  DroneDigitalTwinConfiguration,
  DroneDigitalTwinRuntimeState,
} from "@/types/drone-digital-twin";
import {
  getActiveDigitalTwin,
  setActiveDigitalTwin,
} from "@/lib/digital-twin/digital-twin-storage";
import { getDigitalTwinPresetById } from "@/lib/digital-twin/digital-twin-presets";
import {
  digitalTwinToDroneDefinition,
  buildRuntimeStateFromTelemetry,
} from "@/lib/digital-twin/adapter";
import { DigitalTwinHUD } from "./debug/digital-twin-hud";
import { FaultInjectionPanel } from "./fault-injection-panel";
import { FlightCoachPanel } from "./flight-coach-panel";
import { FlightControlsOverlay } from "./flight-controls-overlay";
import { PostFlightReportModal } from "./post-flight-report-modal";
import { ScenarioSelectorModal } from "./scenario-selector-modal";
import { SimulationClock, ClockSnapshot } from "@/lib/simulation/simulation-clock";
import { SimulationAdapter, SimulationAdapterStatus } from "@/lib/simulation/adapters/simulation-adapter";
import { LocalSimulationAdapter } from "@/lib/simulation/adapters/local-simulation-adapter";
import { HardwareControllerAdapter } from "@/lib/simulation/adapters/hardware-controller-adapter";
import { FlightCoachEngine } from "@/lib/simulation/flight-coach";
import { FlightCoachInsight, FlightSessionSummary } from "@/lib/simulation/flight-coach-types";
import { flightInputToNormalized } from "@/lib/simulation/normalized-control";
import { TelemetryBus } from "@/lib/simulation/telemetry-bus";
import { SimulationEventBus, SimulationEvent } from "@/lib/simulation/event-bus";
import { ConnectionStatus } from "@/lib/multiplayer/multiplayer-types";
import { SimulationDiagnosticsOverlay } from "./debug/simulation-diagnostics-overlay";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { AircraftControlPanel, ManipulationEvent } from "./aircraft-control-panel";
function getWindExposure(x: number, z: number): number {
  for (const r of REGION_LIST) {
    if (x >= r.bounds.minX && x <= r.bounds.maxX && z >= r.bounds.minZ && z <= r.bounds.maxZ) {
      if (r.category === 'highlands' || r.category === 'maritime' || r.category === 'ocean') return 1.0;
      if (r.category === 'nature') return 0.3;
      if (r.category === 'urban') return 0.2;
    }
  }
  return 0.6;
}

interface FlightSimulatorProps {
  selectedDrone: DroneModel;
  initialDigitalTwin?: DroneDigitalTwinConfiguration;
  onExit: () => void;
}


const FPVStaticOverlay = ({ distance }: { distance: number }) => {
  // Phase 2: Analog Video Feed Degradation
  // Clear signal up to 250m, starts snowing, and gets severe near 1000m+
  const maxRange = 1000;
  const degradation = Math.max(0, Math.min(1.0, (distance - 250) / (maxRange - 250)));
  
  if (degradation <= 0) return null;

  // Add random horizontal tearing / scanlines for high degradation
  const tearOpacity = degradation > 0.6 ? Math.random() * 0.35 : 0;
  
  return (
    <div className="absolute inset-0 pointer-events-none z-[15] overflow-hidden mix-blend-screen">
      {/* Base TV Static SVG */}
      <div 
        className="absolute inset-0"
        style={{
          opacity: degradation * 0.65,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          animation: 'fpv-static 0.15s steps(4) infinite',
        } as React.CSSProperties}
      />
      {/* V-Sync Loss / Rolling Band on extreme range */}
      {degradation > 0.5 && (
        <div 
          className="absolute w-full h-[15vh] bg-white/20 mix-blend-overlay blur-md"
          style={{
            top: `${(Date.now() / 15) % 120}%`,
            opacity: tearOpacity,
          }}
        />
      )}
      {/* OSD Warning */}
      {degradation > 0.8 && (
        <div className="absolute bottom-40 left-1/2 -translate-x-1/2 text-[#FF2200] font-mono font-black text-2xl animate-pulse tracking-widest drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
          LOW VTX SIGNAL
        </div>
      )}
      <style>{`
        @keyframes fpv-static {
          0% { background-position: 0 0; }
          25% { background-position: -50px 75px; }
          50% { background-position: 80px -40px; }
          75% { background-position: -120px 100px; }
          100% { background-position: 90px -150px; }
        }
      `}</style>
    </div>
  );
};

export function FlightSimulator({ selectedDrone, initialDigitalTwin, onExit }: FlightSimulatorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const inputManagerRef = useRef<InputManager | null>(null);
  const cameraControllerRef = useRef<ChaseCameraController | null>(null);
  const physicsEngineRef = useRef<FlightPhysicsEngine | null>(null);
  const simulationAdapterRef = useRef<SimulationAdapter | null>(null);
  const hardwareAdapterRef = useRef<HardwareControllerAdapter>(new HardwareControllerAdapter());
  const simClockRef = useRef<SimulationClock>(new SimulationClock(1 / 60));
  const droneMeshRef = useRef<ModularDrone | null>(null);
  const flightRecorderRef = useRef<FlightRecorder>(new FlightRecorder());
  const multiplayerClientRef = useRef<MultiplayerClient | null>(null);
  const remoteDroneManagerRef = useRef<RemoteDroneManager | null>(null);
  const crashTriggeredRef = useRef<boolean>(false);
  const remotePlayersRef = useRef<RemotePlayerState[]>([]);

  // Authenticated pilot username
  const { user } = useAuth();

  const pilotName = React.useMemo(() => {
    return (
      user?.displayName ||
      user?.email?.split("@")[0] ||
      "PILOT-" + Math.floor(100 + Math.random() * 900)
    );
  }, [user]);

  // Resolve initial spawn point from URL parameters
  const initialSpawn = React.useMemo(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return SpawnSystem.resolveSpawn(
        params.get("region"),
        params.get("helipad") || params.get("spawn")
      );
    }
    return SpawnSystem.resolveSpawn();
  }, []);

  const spawnConfigRef = useRef<SpawnConfiguration>(initialSpawn);

  // Audio Refs
  const audioManagerRef = useRef<AudioManager | null>(null);
  const droneAudioRef = useRef<DroneAudio | null>(null);
  const windAudioRef = useRef<WindAudio | null>(null);
  const envZoneAudioRef = useRef<EnvironmentZoneAudio | null>(null);
  const sfxEventsRef = useRef<SFXEvents | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const hasInitAudioRef = useRef(false);

  const initAudio = useCallback(() => {
    if (hasInitAudioRef.current) return;
    hasInitAudioRef.current = true;
    
    const am = AudioManager.getInstance();
    am.init();
    const ctx = am.getContext();
    if (!ctx) return;
    audioManagerRef.current = am;

    const droneGain = am.getChannel('drone');
    if (droneGain) droneAudioRef.current = new DroneAudio(ctx, droneGain);

    const envGain = am.getChannel('environment');
    if (envGain) {
      windAudioRef.current = new WindAudio(ctx, envGain);
      envZoneAudioRef.current = new EnvironmentZoneAudio(ctx, envGain);
    }

    const sfxGain = am.getChannel('sfx');
    if (sfxGain) sfxEventsRef.current = new SFXEvents(ctx, sfxGain);

    droneAudioRef.current?.start();
    windAudioRef.current?.start();
    envZoneAudioRef.current?.start();
    sfxEventsRef.current?.playMotorStart();
    
    setIsMuted(am.isMuted);
  }, []);

  const toggleMute = useCallback(() => {
    const am = AudioManager.getInstance();
    setIsMuted(am.toggleMute());
  }, []);

  useEffect(() => {
    const handleUserGesture = () => {
      initAudio();
      document.removeEventListener('click', handleUserGesture);
      document.removeEventListener('keydown', handleUserGesture);
    };
    document.addEventListener('click', handleUserGesture);
    document.addEventListener('keydown', handleUserGesture);
    return () => {
      document.removeEventListener('click', handleUserGesture);
      document.removeEventListener('keydown', handleUserGesture);
    };
  }, [initAudio]);

  // Callsign for multiplayer matches authenticated pilot name
  const callsign = pilotName;

  // UI Modal States
  const [isLoading, setIsLoading] = useState(true);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeWaypoint, _setActiveWaypoint] = useState<NavigationWaypoint | null>(null);
  const activeWaypointRef = useRef<NavigationWaypoint | null>(null);
  const setActiveWaypoint = (wp: NavigationWaypoint | null) => {
    _setActiveWaypoint(wp);
    activeWaypointRef.current = wp;
  };
  const [isEnvironmentOpen, setIsEnvironmentOpen] = useState(false);
  // Flight Coach only opens automatically for first-time pilots
  const [isTutorialOpen, setIsTutorialOpen] = useState(() => {
    if (typeof window !== "undefined") {
      const hasCompleted = localStorage.getItem("drone_pilot_flight_coach_completed");
      return !hasCompleted;
    }
    return false;
  });
  const [isAnalysisOpen, setIsAnalysisOpen] = useState(false);
  const [isReplayOpen, setIsReplayOpen] = useState(false);
  const [isDebugOpen, setIsDebugOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return new URLSearchParams(window.location.search).get("debug") === "true";
    }
    return false;
  });

  const scenarioEngineRef = useRef<ScenarioEvaluationEngine>(new ScenarioEvaluationEngine());
  const [sessionState, setSessionState] = useState<ScenarioSessionState | null>(null);

  // Simulation Data States
  const [cameraMode, setCameraMode] = useState<CameraMode>("chase");
  const [isHoverMode, setIsHoverMode] = useState(true);
  const [isAutopilot, setIsAutopilot] = useState(false);
  const [remotePlayers, setRemotePlayers] = useState<RemotePlayerState[]>([]);
  const [replayFrames, setReplayFrames] = useState<ReplayFrame[]>([]);
  const [analysisReport, setAnalysisReport] = useState<FlightAnalysisReport | null>(null);
  const [physicsDebug, setPhysicsDebug] = useState<PhysicsDebugTelemetry | null>(null);

  // Environment State
  const [envState, setEnvState] = useState<EnvironmentState>({
    weather: "clear",
    preset: "normal",
    windSpeed: 2.0,
    windDirection: 45,
    windGust: 0.8,
    temperature: 20,
    rainIntensity: 0.0,
    visibility: 1.0,
    timeOfDay: "noon",
  });

  // Telemetry state for HUD
  const [telemetry, setTelemetry] = useState<TelemetryState>(() => ({
    position: {
      x: initialSpawn.position.x,
      y: initialSpawn.position.y,
      z: initialSpawn.position.z,
    },
    velocity: { x: 0, y: 0, z: 0 },
    rotation: {
      pitch: initialSpawn.rotation.pitch,
      roll: initialSpawn.rotation.roll,
      yaw: initialSpawn.rotation.yaw,
    },
    altitude: 0,
    altitudeMsl: initialSpawn.position.y,
    groundSpeed: 0,
    verticalSpeed: 0,
    heading: Math.round((((initialSpawn.rotation.yaw * 180) / Math.PI) % 360 + 360) % 360),
    batteryLevel: 100,
    batteryVoltage: 16.8,
    batteryCurrentAmps: 0.8,
    flightTimeSeconds: 0,
    flightMode: "LANDED",
    isArmed: false,
    rotorRpmPercent: 0,
    motorOutputs: [0, 0, 0, 0],
    distanceFromHome: 0,
    flightPath: [{ x: initialSpawn.position.x, z: initialSpawn.position.z }],
  }));

  // Tactical Dropzone Briefing state
  const [showDropBriefing, setShowDropBriefing] = useState(false);
  const [autoMoveLocked, setAutoMoveLocked] = useState("");
  const autoMoveLockedRef = useRef("");

  // Digital Twin state for HUD & live telemetry
  const [activeDigitalTwin, setActiveDigitalTwinState] = useState<DroneDigitalTwinConfiguration | null>(null);
  const [digitalTwinRuntime, setDigitalTwinRuntime] = useState<DroneDigitalTwinRuntimeState | null>(null);
  const [isDigitalTwinHUDOpen, setIsDigitalTwinHUDOpen] = useState(false);
  const activeDtRef = useRef<DroneDigitalTwinConfiguration | null>(null);

  // Phase 5: Fault Injection, Scenarios & Educational Event System
  const [isFaultPanelOpen, setIsFaultPanelOpen] = useState(false);
  const [isScenarioModalOpen, setIsScenarioModalOpen] = useState(false);
  const [motorHealths, setMotorHealths] = useState<number[]>([1, 1, 1, 1, 1, 1, 1, 1]);
  const [sensorHealth, setSensorHealth] = useState({
    gps: true,
    imu: true,
    baro: true,
    compass: true,
  });
  const [payloadMassKg, setPayloadMassKg] = useState(0.0);
  const [droneQuantity, setDroneQuantity] = useState(1);
  const droneQuantityRef = useRef(1);
  const [motorOverrides, setMotorOverrides] = useState<number[]>([1, 1, 1, 1, 1, 1, 1, 1]);
  const [manipulationEvents, setManipulationEvents] = useState<ManipulationEvent[]>([]);
  const baselineExperimentRef = useRef({ payloadKg: 0, batteryPercent: 100 });
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);

  // Flight Coach
  const [currentInsight, setCurrentInsight] = useState<FlightCoachInsight | null>(null);
  const [insightHistory, setInsightHistory] = useState<FlightCoachInsight[]>([]);
  const flightStatsRef = useRef({ startTime: Date.now(), topSpeed: 0, maxAltitude: 0, distance: 0, lastPos: {x:0, y:0, z:0}, crashes: 0 });
  const [isReportOpen, setIsReportOpen] = useState(false);
  const coachEngineRef = useRef<FlightCoachEngine>(new FlightCoachEngine());
  const [coachSessionSummary, setCoachSessionSummary] = useState<FlightSessionSummary | null>(null);

  // Phase 7: Diagnostics, Simulation Clock & Network Status
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>("LOCAL");
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [clockSnapshot, setClockSnapshot] = useState<ClockSnapshot>(simClockRef.current.getSnapshot());
  const [fps, setFps] = useState(60);
  const [eventCount, setEventCount] = useState(0);
  const [lastEventTitle, setLastEventTitle] = useState<string | undefined>();
  const [adapterStatus, setAdapterStatus] = useState<SimulationAdapterStatus>({
    name: "Built-in Browser 6-DoF Physics",
    type: "local",
    isConnected: true,
    isLiveHardware: false,
    latencyMs: 0.1,
    packetsSent: 0,
    packetsReceived: 0,
    statusMessage: "Operational",
  });

  // Simulation Event Bus Subscription for real-time observability
  useEffect(() => {
    const unsub = SimulationEventBus.getInstance().subscribe((evt) => {
      setEventCount((prev) => prev + 1);
      setLastEventTitle(evt.title);
    });
    return unsub;
  }, []);


  // Stable loading ready callback
  const handleLoadingReady = useCallback(() => {
    setIsLoading(false);
    setShowDropBriefing(true);
    const timer = setTimeout(() => {
      setShowDropBriefing(false);
    }, 6000);
    return () => clearTimeout(timer);
  }, []);

  // Toggle Camera

  const handleToggleCamera = useCallback(() => {
    if (cameraControllerRef.current) {
      const nextMode = cameraControllerRef.current.cycleMode();
      setCameraMode(nextMode);
    }
  }, []);

  // In-Place Drone Revive & Field Repair
  const handleReviveHere = useCallback(() => {
    crashTriggeredRef.current = false;
    if (physicsEngineRef.current) {
      const newTelem = physicsEngineRef.current.revive();
      droneMeshRef.current?.setDamaged(false);
      setTelemetry({ ...newTelem });
    }
  }, []);

  // Reset to Selected Spawn Helipad
  const handleReset = useCallback(() => {
    crashTriggeredRef.current = false;
    coachEngineRef.current.resetSession();
    setCurrentInsight(null);
    setInsightHistory([]);
    setCoachSessionSummary(null);
    if (physicsEngineRef.current) {
      physicsEngineRef.current.resetCrash();
      const sp = spawnConfigRef.current;
      physicsEngineRef.current.reset(
        sp.position.x,
        sp.position.y,
        sp.position.z,
        sp.rotation.yaw
      );
      droneMeshRef.current?.setDamaged(false);
      setTelemetry({ ...physicsEngineRef.current.generateTelemetry() });
    }
  }, []);

  // Fast Travel Teleport to any Island Base — cleanly flies over helipad at current altitude
  const handleTeleportBase = useCallback((base: FastTravelBase) => {
    crashTriggeredRef.current = false;
    setIsAnalysisOpen(false);
    if (physicsEngineRef.current) {
      const pe = physicsEngineRef.current;
      pe.resetCrash();
      pe.crashState = null;

      const groundElev = pe.elevationQueryFn
        ? pe.elevationQueryFn(base.position.x, base.position.z)
        : base.position.y;
      const safeFloor = Math.max(base.position.y, groundElev + 0.25);

      // Maintain current altitude AGL (at least 6.0m safe overhead hover)
      const currentAgl = Math.max(6.0, pe.posY - pe.groundLevel);
      const targetHoverY = safeFloor + currentAgl;

      pe.posX = base.position.x;
      pe.posY = targetHoverY;
      pe.posZ = base.position.z;
      pe.groundLevel = safeFloor;
      pe.yaw = (base.headingDeg * Math.PI) / 180;
      pe.pitch = 0;
      pe.roll = 0;
      pe.pitchRate = 0;
      pe.rollRate = 0;
      pe.yawRate = 0;
      pe.velX = 0;
      pe.velY = 0;
      pe.velZ = 0;
      pe.accelX = 0;
      pe.accelY = 0;
      pe.accelZ = 0;
      pe.isArmed = true;
      pe.isHoverMode = true;
      pe.targetAltitude = targetHoverY;
      pe.rotorRpm = 4200;
      pe.motorOutputs = pe.motorOutputs.map(() => 0.60);
      pe.isCeilingLimitReached = false;
      pe.isGroundLimitReached = false;

      droneMeshRef.current?.setDamaged(false);
      setTelemetry({ ...pe.generateTelemetry() });
    }
  }, []);

  // Toggle Hover Mode
  const handleToggleHover = useCallback(() => {
    if (physicsEngineRef.current && inputManagerRef.current) {
      inputManagerRef.current.toggleHoverAssist();
      const current = inputManagerRef.current.isHoverAssist();
      physicsEngineRef.current.isHoverMode = current;
      if (current) {
        physicsEngineRef.current.targetAltitude = physicsEngineRef.current.posY;
      }
      setIsHoverMode(current);
    }
  }, []);

  // Controls input delegation
  const handleMoveDirection = useCallback((pitch: number, roll: number) => {
    inputManagerRef.current?.setDirection(pitch, roll);
  }, []);

  const handleYaw = useCallback((yaw: number) => {
    inputManagerRef.current?.setYaw(yaw);
  }, []);

  const handleThrottle = useCallback((throttle: number) => {
    inputManagerRef.current?.setThrottle(throttle);
  }, []);

  const handleAutoLand = useCallback(() => {
    physicsEngineRef.current?.triggerAutoLand();
  }, []);

  const handleToggleRtl = useCallback(() => {
    physicsEngineRef.current?.triggerRTL();
  }, []);

  // Camera selection
  const handleSelectCameraMode = useCallback((mode: CameraMode) => {
    if (cameraControllerRef.current) {
      cameraControllerRef.current.setMode(mode);
      setCameraMode(mode);
    }
  }, []);

  const handleUpdateEnvironment = useCallback((updates: Partial<EnvironmentState>) => {
    if (physicsEngineRef.current) {
      const prevEnv = physicsEngineRef.current.environment.getState();
      
      // Auto-scale turbulence based on wind speed if not explicitly set
      if (updates.windSpeed !== undefined && updates.turbulence === undefined) {
        updates.turbulence = Math.min(1.0, 0.1 + (updates.windSpeed / 20.0));
      }

      // Realistic interconnected weather: Rain increases turbulence and drops visibility
      if (updates.rainIntensity !== undefined) {
        // If rain intensity goes up, visibility goes down!
        if (updates.visibility === undefined) {
           updates.visibility = Math.max(0.1, 1.0 - (updates.rainIntensity * 0.8));
        }
        // Rain also adds some baseline turbulence
        if (updates.turbulence === undefined) {
           updates.turbulence = Math.max(prevEnv.turbulence || 0, updates.rainIntensity * 0.4);
        }
      }

      physicsEngineRef.current.environment.setState(updates);
      const newEnv = physicsEngineRef.current.environment.getState();
      setEnvState({ ...newEnv });

      EnvironmentManager.getInstance().setWind(newEnv.windSpeed, newEnv.windDirection);

      let title = "";
      let message = "";
      let type: SimulationEvent["type"] | null = null;
      let severity: "INFO" | "WARNING" = "INFO";

      if (updates.windSpeed !== undefined && updates.windSpeed !== prevEnv.windSpeed) {
        type = "WIND_SPEED_CHANGED";
        const dir = updates.windSpeed > prevEnv.windSpeed ? "increased" : "decreased";
        title = `WIND ${dir.toUpperCase()}`;
        message = `Wind speed has ${dir} from ${prevEnv.windSpeed.toFixed(1)} m/s to ${newEnv.windSpeed.toFixed(1)} m/s. The aircraft is experiencing ${dir === "increased" ? "greater" : "less"} environmental disturbance.`;
        if (updates.windSpeed > 0) message += " The aircraft is drifting laterally relative to its previous state.";
      } else if (updates.windDirection !== undefined && updates.windDirection !== prevEnv.windDirection) {
        type = "WIND_DIRECTION_CHANGED";
        title = `WIND DIRECTION CHANGED`;
        message = `Wind direction changed from ${prevEnv.windDirection}° to ${newEnv.windDirection}°. The direction of the environmental aerodynamic force acting on the aircraft has shifted.`;
      } else if (updates.turbulence !== undefined && updates.turbulence !== prevEnv.turbulence) {
        type = "TURBULENCE_CHANGED";
        const dir = updates.turbulence > (prevEnv.turbulence || 0) ? "increased" : "decreased";
        title = `TURBULENCE ${dir.toUpperCase()}`;
        message = `Turbulence intensity ${dir}. The aircraft is experiencing ${dir === "increased" ? "additional" : "reduced"} environmental disturbance.`;
      } else if (updates.temperature !== undefined && updates.temperature !== prevEnv.temperature) {
        type = "TEMPERATURE_CHANGED";
        title = `TEMPERATURE CHANGED`;
        message = `Air temperature changed to ${newEnv.temperature}°C. Air density changes inversely with temperature, affecting aerodynamic drag and motor thrust efficiency slightly.`;
      } else if (updates.rainIntensity !== undefined && updates.rainIntensity !== prevEnv.rainIntensity) {
        type = "RAIN_CHANGED";
        title = `RAIN INTENSITY CHANGED`;
        message = `Rain intensity changed to ${Math.round(newEnv.rainIntensity * 100)}%. Rain is currently affecting the environment visually. No aerodynamic rain effect is modeled by the current physics engine.`;
      } else if (updates.visibility !== undefined && updates.visibility !== prevEnv.visibility) {
        type = "VISIBILITY_CHANGED";
        title = `VISIBILITY CHANGED`;
        message = `Visibility changed to ${Math.round(newEnv.visibility * 100)}%. Visual environment perception is reduced. No navigation or sensor degradation is currently modeled by the physics engine for this condition.`;
      }

      if (type && title && message) {
        const insight: FlightCoachInsight = {
          id: `env-${Date.now()}`,
          timestamp: Date.now(),
          type: type as string,
          severity: "INFO",
          title,
          explanation: {
            what: message,
            why: "Environment settings were modified by the user.",
            learn: "Observe how this parameter affects the simulated flight dynamics."
          },
          evidence: []
        };
        setCurrentInsight(insight);
        setInsightHistory((prev) => [insight, ...prev].slice(0, 30));
        
        SimulationEventBus.getInstance().emit({
          timestamp: Date.now(),
          simTime: simClockRef.current.getSimTime(),
          type: type as any,
          severity: severity,
          source: "ENVIRONMENT",
          title,
          message
        });
      }
    }
  }, []);

  const handleApplyWeatherPreset = useCallback((preset: WeatherPreset) => {
    if (physicsEngineRef.current) {
      physicsEngineRef.current.environment.applyPreset(preset);
      setEnvState({ ...physicsEngineRef.current.environment.getState() });
    }
  }, []);

  // Phase 5: Fault Injection & Manipulation Handlers
  const recordManipulation = useCallback((type: string, title: string) => {
    const event = { id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, type, title, timestamp: Date.now() };
    setManipulationEvents((previous) => [event, ...previous].slice(0, 12));
    SimulationEventBus.getInstance().emit({ timestamp: event.timestamp, simTime: simClockRef.current.getSimTime(), type: type as SimulationEvent["type"], severity: "INFO", source: "PILOT", title, message: title });
  }, []);

  const handleSetMotorOverride = useCallback((index: number, percent: number) => {
    if (!Number.isInteger(index) || index < 0 || index >= (physicsEngineRef.current?.def.motorCount || 0) || !Number.isFinite(percent)) return;
    const multiplier = Math.max(0, Math.min(1, percent / 100));
    const previous = motorOverrides[index] ?? 1;
    setMotorOverrides((values) => { const next = [...values]; next[index] = multiplier; return next; });
    physicsEngineRef.current?.setMotorOverride(index, multiplier === 1 ? null : multiplier);
    if (Math.abs(previous - multiplier) > 0.001) recordManipulation("MOTOR_RPM_CHANGED", `Motor ${index + 1} command set to ${Math.round(multiplier * 100)}%`);
  }, [motorOverrides, recordManipulation]);

  const handleMotorFailure = useCallback((index: number, failed: boolean) => {
    if (!Number.isInteger(index) || index < 0 || index >= (physicsEngineRef.current?.def.motorCount || 0)) return;
    const health = failed ? 0 : 1;
    setMotorHealths((values) => { const next = [...values]; next[index] = health; return next; });
    physicsEngineRef.current?.setMotorHealth(index, health);
    recordManipulation("MOTOR_FAILURE", failed ? `Motor ${index + 1} failed` : `Motor ${index + 1} restored`);
  }, [recordManipulation]);

  const handleSetBatteryState = useCallback((percent: number) => {
    if (!Number.isFinite(percent)) return;
    const value = Math.max(0, Math.min(100, percent));
    physicsEngineRef.current?.battery.reset(value);
    setTelemetry((previous) => ({ ...previous, batteryLevel: value }));
    recordManipulation("BATTERY_CHANGED", `Battery state set to ${value}%`);
  }, [recordManipulation]);

  const handleResetExperiment = useCallback(() => {
    const physics = physicsEngineRef.current;
    if (!physics) return;
    const baseline = baselineExperimentRef.current;
    physics.motorHealth.fill(1); physics.motorOverrides.fill(null); physics.setPayloadMass(baseline.payloadKg); physics.battery.reset(baseline.batteryPercent); physics.resetCrash();
    setMotorHealths(new Array(8).fill(1)); setMotorOverrides(new Array(8).fill(1)); setPayloadMassKg(baseline.payloadKg); setManipulationEvents([]);
    recordManipulation("ATTITUDE_CHANGED", "Simulation experiment reset to saved Digital Twin baseline");
  }, [recordManipulation]);

  const handleSetMotorHealth = useCallback((index: number, health: number) => {
    setMotorHealths((prev) => {
      const next = [...prev];
      next[index] = health;
      return next;
    });
    physicsEngineRef.current?.setMotorHealth(index, health);
  }, []);

  const handleToggleSensor = useCallback((sensor: "gps" | "imu" | "baro" | "compass") => {
    setSensorHealth((prev) => {
      const next = { ...prev, [sensor]: !prev[sensor] };
      physicsEngineRef.current?.setSensorHealth({ [sensor]: next[sensor] });
      return next;
    });
  }, []);

  const handleSetPayloadMass = useCallback((massKg: number) => {
    setPayloadMassKg(massKg);
    physicsEngineRef.current?.setPayloadMass(massKg);
  }, []);

  const handleSetDroneQuantity = useCallback((qty: number) => {
    setDroneQuantity(qty);
    droneQuantityRef.current = qty;
  }, []);

  const handleResetAllFaults = useCallback(() => {
    const nominal = [1, 1, 1, 1, 1, 1, 1, 1];
    setMotorHealths(nominal);
    const nominalSensors = { gps: true, imu: true, baro: true, compass: true };
    setSensorHealth(nominalSensors);
    setPayloadMassKg(0.0);
    if (physicsEngineRef.current) {
      physicsEngineRef.current.motorHealth.fill(1.0);
      physicsEngineRef.current.motorOverrides.fill(null);
      physicsEngineRef.current.setSensorHealth(nominalSensors);
      physicsEngineRef.current.setPayloadMass(0.0);
      physicsEngineRef.current.setTurbulence(0.0);
    }
  }, []);

  const handleSelectScenario = useCallback(
    (scenario: TrainingScenarioDef) => {
      setActiveScenarioId(scenario.id);
      setIsScenarioModalOpen(false);

      const obs = coachEngineRef.current.extractObservation(
        telemetry,
        physicsEngineRef.current?.environment.getState() || envState
      );
      
      const sp = spawnConfigRef.current;
      scenarioEngineRef.current.startScenario(scenario, obs, { x: sp.position.x, y: sp.position.y, z: sp.position.z });
      setSessionState({ ...scenarioEngineRef.current.getSessionState()! });
    },
    [telemetry, envState]
  );

  const handleStartScenario = useCallback(() => {
    const scenario = scenarioEngineRef.current.getActiveScenario();
    if (!scenario) return;

    handleResetAllFaults();
    
    // Set Environment
    if (scenario.environmentSetup) {
      handleUpdateEnvironment(scenario.environmentSetup);
      if (scenario.environmentSetup.preset) {
        handleApplyWeatherPreset(scenario.environmentSetup.preset);
      }
    }

    // Set Aircraft setup
    if (scenario.aircraftSetup.motorHealth) {
      Object.entries(scenario.aircraftSetup.motorHealth).forEach(([idxStr, h]) => {
        handleSetMotorHealth(Number(idxStr), h);
      });
    }

    if (scenario.aircraftSetup.payloadKg !== undefined) {
      handleSetPayloadMass(scenario.aircraftSetup.payloadKg);
    }

    if (scenario.aircraftSetup.batteryPercent !== undefined && physicsEngineRef.current) {
      physicsEngineRef.current.battery.reset(scenario.aircraftSetup.batteryPercent);
    }
  }, [handleResetAllFaults, handleUpdateEnvironment, handleApplyWeatherPreset, handleSetMotorHealth, handleSetPayloadMass]);


  // Post-Flight Analysis Handlers
  const handleManualDebrief = useCallback(() => {
    const report = flightRecorderRef.current.generateAnalysis(
      selectedDrone.name,
      physicsEngineRef.current?.crashState || null
    );
    setAnalysisReport(report);
    
    if (physicsEngineRef.current) {
      setCoachSessionSummary(
        coachEngineRef.current.generateSessionSummary(
          report.flightDurationSeconds,
          physicsEngineRef.current.environment.getState()
        )
      );
    }
    
    setIsReportOpen(true);
  }, [selectedDrone.name]);

  // Demonstration Mode Trigger (Requirement 39: CDAC / Live Demo)
  const handleTriggerDemoMode = useCallback(() => {
    setIsDigitalTwinHUDOpen(true);
    handleUpdateEnvironment({
      windSpeed: 12, // 12 m/s (~43 km/h)
      windDirection: 120,
      windGust: 18,
      temperature: 32,
      turbulence: 0.65,
    });
    handleSetPayloadMass(3.5);
    SimulationEventBus.getInstance().emit({
      timestamp: Date.now(),
      simTime: simClockRef.current.getSimTime(),
      type: "SCENARIO_STARTED",
      severity: "INFO",
      source: "SCENARIO",
      title: "CDAC Demonstration Mode Activated",
      message: "High Wind (12 m/s, 18 m/s gusts) + 3.5kg Payload injected. Observe motor RPM, asymmetric torques, and battery voltage sag.",
    });
  }, [handleUpdateEnvironment, handleSetPayloadMass]);

  const handleOpenReplay = useCallback(() => {
    setReplayFrames(flightRecorderRef.current.getFrames());
    setIsReplayOpen(true);
  }, []);


  const handleFlyAgain = useCallback(() => {
    setIsAnalysisOpen(false);
    handleReset();
  }, [handleReset]);

  const handleDismissTutorial = useCallback(() => {
    setIsTutorialOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("drone_pilot_flight_coach_completed", "true");
    }
  }, []);

  // Keybindings for Debug & Hotkeys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.key === "F3" || e.key === "\x60" || e.key === "~") {
        setIsDebugOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Main 3D Three.js Lifecycle
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // 1. SCENE SETUP
    const scene = new THREE.Scene();
    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 2. RENDERER
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      preserveDrawingBuffer: true,
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

    // 3. 3D WORLD SCENE (Irregular Island World Root)
    const worldScene = new WorldScene(scene);
    scene.add(worldScene.group);

    // 4. DYNAMIC SPAWN RESOLUTION & CONFIGURATION
    const urlParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const reqRegion = urlParams?.get("region");
    const reqHelipad = urlParams?.get("helipad") || urlParams?.get("spawn");
    const spawnConfig = SpawnSystem.resolveSpawn(reqRegion, reqHelipad);
    spawnConfigRef.current = spawnConfig;

    // 5. MODULAR DRONE & CANONICAL DIGITAL TWIN RESOLUTION
    let dtConfig = initialDigitalTwin || getActiveDigitalTwin(null);
    const dtParam = urlParams?.get("dt");
    if (dtParam) {
      dtConfig = getDigitalTwinPresetById(dtParam);
    } else if (dtConfig.identity.category !== selectedDrone.platformId) {
      dtConfig = getDigitalTwinPresetById(selectedDrone.platformId);
    }
    setActiveDigitalTwin(null, dtConfig);
    setActiveDigitalTwinState(dtConfig);
    activeDtRef.current = dtConfig;

    const droneDef = digitalTwinToDroneDefinition(dtConfig);
    const droneMesh = new ModularDrone(droneDef, pilotName);
    scene.add(droneMesh.group);
    droneMeshRef.current = droneMesh;
    
    // SWARM CLONES
    const cloneMeshes: any[] = [];
    for (let i = 1; i < 10; i++) {
        const clone = new ModularDrone(droneDef, `CLONE-${i}`);
        scene.add(clone.group);
        cloneMeshes.push(clone);
    }

    // 6. MULTIPLAYER REMOTE DRONES LAYER
    const remoteDroneMgr = new RemoteDroneManager();
    scene.add(remoteDroneMgr.group);
    remoteDroneManagerRef.current = remoteDroneMgr;

    // Connect to room network with connection status tracking
    const mpClient = new MultiplayerClient(
      callsign,
      spawnConfig.regionId,
      (players) => {
        remotePlayersRef.current = players;
        setRemotePlayers(players);
      },
      (status) => {
        setConnectionStatus(status);
      }
    );
    mpClient.connect();
    multiplayerClientRef.current = mpClient;

    // 7. SIMULATION ADAPTER & 6-DoF SOLVER (PHASE 7 ARCHITECTURE)
    const localAdapter = new LocalSimulationAdapter(droneDef);
    localAdapter.setElevationQueryFn((x, z) => worldScene.getGroundElevation(x, z));
    simulationAdapterRef.current = localAdapter;
    const physics = localAdapter.getPhysicsEngine();

    // Configure payload mass based on digital twin (plus override if specified in URL)
    const payloadParam = parseFloat(urlParams?.get("payload") || "0");
    const dtPayload = dtConfig.massProperties.payloadMassKg + dtConfig.massProperties.cameraMassKg;
    const baselinePayload = !isNaN(payloadParam) && payloadParam > 0 ? Math.min(droneDef.payloadCapacity * 1.5, payloadParam) : Math.max(0, dtPayload);
    physics.setPayloadMass(baselinePayload);
    baselineExperimentRef.current = { payloadKg: baselinePayload, batteryPercent: 100 };
    setPayloadMassKg(baselinePayload);
    setMotorOverrides(new Array(droneDef.motorCount).fill(1));
    setMotorHealths(new Array(droneDef.motorCount).fill(1));

    // Configure initial weather preset if requested
    const weatherParam = (urlParams?.get("weather") as WeatherPreset) || "normal";
    physics.environment.applyPreset(weatherParam);
    setEnvState({ ...physics.environment.getState() });

    // Phase 2.1 Digital Twin Fidelity: Map battery internal resistance
    if (dtConfig.battery.internalResistanceMilliOhm) {
      physics.battery.setInternalResistance(dtConfig.battery.internalResistanceMilliOhm);
    }

    // Phase 2.1 Digital Twin Fidelity: Map sensors & GPS assist mode
    const initSensors = {
      gps: true,
      imu: true,
      baro: true,
      compass: true,
    };
    physics.setSensorHealth(initSensors);
    setSensorHealth(initSensors);

    physics.reset(
      spawnConfig.position.x,
      spawnConfig.position.y,
      spawnConfig.position.z,
      spawnConfig.rotation.yaw
    );
    physicsEngineRef.current = physics;
    simClockRef.current.reset();
    simClockRef.current.start();


    // 8. CHASE CAMERA
    const chaseCam = new ChaseCameraController(55, width / height);
    chaseCam.setInitialFramingForAircraft(droneDef.type);
    cameraControllerRef.current = chaseCam;

    // 9. INPUT MANAGER
    const inputManager = new InputManager();
    inputManager.attach();
    inputManagerRef.current = inputManager;

    // 10. RESIZE OBSERVER
    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (w === 0 || h === 0) return;
      chaseCam.setAspect(w / h);
      renderer.setSize(w, h, false);
    };
    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // 11. MOUSE DRAG 360 ORBIT CONTROLS
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;

    const onMouseDown = (e: MouseEvent) => {
      if ((e.target as HTMLElement)?.closest(".pointer-events-auto")) return;
      isDragging = true;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      // Mouse-aim flight steering: dragging cursor horizontally turns drone heading (Yaw)
      physics.yaw -= dx * 0.006;
      if (physics.yaw > Math.PI * 2) physics.yaw -= Math.PI * 2;
      if (physics.yaw < 0) physics.yaw += Math.PI * 2;

      // Vertical mouse movement tilts camera viewing pitch only (not up/down drone altitude)
      chaseCam.setOrbitDelta(0, dy);
    };

    const onMouseUp = () => {
      isDragging = false;
      chaseCam.stopOrbiting();
    };

    const onDblClick = () => {
      chaseCam.resetOrbit();
    };

    const onGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") return;
      if (e.code === "KeyL") {
        physics.triggerAutoLand();
      }
      if (e.code === "KeyR") {
        physics.triggerRTL();
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      chaseCam.adjustZoom(e.deltaY);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    domEl.addEventListener("dblclick", onDblClick);
    domEl.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onGlobalKeyDown);

    // 12. ANIMATION & SIMULATION LOOP
    let animationId: number;
    const clock = new THREE.Clock();
    let telemetryThrottleTimer = 0; let coachEvalTimer = 0;
    let framesCount = 0;
    let fpsTimer = 0;

    const animate = () => {
      animationId = requestAnimationFrame(animate);

      const dt = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // FPS Calculation
      fpsTimer += dt;
      framesCount++;
      if (fpsTimer >= 0.5) {
        setFps(Math.round(framesCount / fpsTimer));
        framesCount = 0;
        fpsTimer = 0;
      }

      // Read Input & Poll Hardware Controller (Gamepad / RC Mode 2)
      const input = inputManager.getInput(dt);
      const hwInput = hardwareAdapterRef.current.pollInput();
      if (hwInput) {
        if (hwInput.throttle !== undefined && Math.abs(hwInput.throttle) > 0.05) input.throttle = hwInput.throttle;
        if (hwInput.pitch !== undefined && Math.abs(hwInput.pitch) > 0.05) input.pitch = hwInput.pitch;
        if (hwInput.roll !== undefined && Math.abs(hwInput.roll) > 0.05) input.roll = hwInput.roll;
        if (hwInput.yaw !== undefined && Math.abs(hwInput.yaw) > 0.05) input.yaw = hwInput.yaw;
        if (hwInput.isArmed) physics.isArmed = true;
      }

      const lockedDir = inputManager.getLockedDirection();
      if (lockedDir !== autoMoveLockedRef.current) {
        autoMoveLockedRef.current = lockedDir;
        setAutoMoveLocked(lockedDir);
      }

      if (input.cameraToggle) {
        setCameraMode(chaseCam.cycleMode());
      }

      // Step Physics via Canonical Simulation Clock (Fixed-Timestep Accumulator)
      let curTelemetry = physics.generateTelemetry();
      simClockRef.current.tick((fixedDt) => {
        curTelemetry = physics.update(input, fixedDt);
        TelemetryBus.getInstance().publish(curTelemetry, fixedDt);
      });

      // Record telemetry frame for recorder & replay
      flightRecorderRef.current.record(curTelemetry);

      // Real-time Flight Stats Tracking for Debrief
      const lastP = flightStatsRef.current.lastPos;
      if (lastP.x !== 0 || lastP.z !== 0) {
        const dMove = Math.hypot(curTelemetry.position.x - lastP.x, curTelemetry.position.z - lastP.z);
        if (dMove > 0.005 && dMove < 25) {
          flightStatsRef.current.distance += dMove;
        }
      }
      flightStatsRef.current.lastPos = { x: curTelemetry.position.x, y: curTelemetry.position.y, z: curTelemetry.position.z };
      if (curTelemetry.groundSpeed > flightStatsRef.current.topSpeed) {
        flightStatsRef.current.topSpeed = curTelemetry.groundSpeed;
      }
      if (curTelemetry.altitude > flightStatsRef.current.maxAltitude) {
        flightStatsRef.current.maxAltitude = curTelemetry.altitude;
      }

      // Check for impact / crash incident
      if (curTelemetry.isCrashed && !crashTriggeredRef.current) {
        crashTriggeredRef.current = true;
        flightStatsRef.current.crashes += 1;
        sfxEventsRef.current?.playCrash();
        const report = flightRecorderRef.current.generateAnalysis(
          selectedDrone.name,
          physics.crashState
        );
        setAnalysisReport(report);
        // Sync telemetry immediately so the CrashReviveOverlay displays without delay
        setTelemetry({ ...curTelemetry });
      }

      // Update 3D Drone Transform & Props
      droneMesh.update(curTelemetry, dt);
      droneMesh.setNameTagVisible(chaseCam.mode !== "fpv");
      
      // Update Swarm Clones
      for (let i = 0; i < cloneMeshes.length; i++) {
          const clone = cloneMeshes[i];
          if (i < droneQuantityRef.current - 1) {
              clone.group.visible = true;
              if (clone.groundShadowMesh) clone.groundShadowMesh.visible = true;
              
              // Deep copy telemetry to offset position safely
              const cloneTelem = JSON.parse(JSON.stringify(curTelemetry));
              
              // Offset clone position to fly in a V-formation or staggered line
              // i=0 -> left 2.5m, i=1 -> right 2.5m, i=2 -> left 5m, etc.
              const offsetIndex = Math.ceil((i + 1) / 2);
              const sign = (i % 2 === 0) ? -1 : 1;
              const spacing = 3.5;
              
              // Calculate formation offsets based on yaw to fly behind and to the sides
              const yawRad = curTelemetry.rotation.yaw;
              const dx = Math.cos(yawRad) * (offsetIndex * spacing * sign) - Math.sin(yawRad) * (offsetIndex * spacing);
              const dz = Math.sin(yawRad) * (offsetIndex * spacing * sign) + Math.cos(yawRad) * (offsetIndex * spacing);
              
              cloneTelem.position.x += dx;
              cloneTelem.position.z += dz;
              
              clone.update(cloneTelem, dt);
              clone.setNameTagVisible(chaseCam.mode !== "fpv");
          } else {
              clone.group.visible = false;
              if (clone.groundShadowMesh) clone.groundShadowMesh.visible = false;
          }
      }

      // Update Remote Drones in Airspace (with Dead Reckoning)
      remoteDroneMgr.update(remotePlayersRef.current, dt);

      // Evaluate active scenario objectives


      // Update Follow Camera

      chaseCam.update(curTelemetry, dt);

      // Update Audio
      if (droneAudioRef.current) {
        const throttleValue = (curTelemetry.rotorRpmPercent || 0) / 100;
        droneAudioRef.current.update(
          throttleValue,
          throttleValue * 5000,
          curTelemetry.groundSpeed,
          curTelemetry.isArmed,
          curTelemetry.flightMode
        );
      }
      if (windAudioRef.current) {
        windAudioRef.current.update(curTelemetry.altitudeMsl || curTelemetry.altitude, curTelemetry.groundSpeed, getWindExposure(curTelemetry.position.x, curTelemetry.position.z));
      }
      if (envZoneAudioRef.current) {
        envZoneAudioRef.current.update(
          curTelemetry.position.x,
          curTelemetry.position.z,
          curTelemetry.position.y
        );
      }
      if (audioManagerRef.current) {
        audioManagerRef.current.update(dt, elapsed, chaseCam.camera.position);
      }

      // Update World Animations (Waves, Windsock, Beacon strobes, traffic, grass wind, downwash)
      const droneWorldPos = new THREE.Vector3(
        curTelemetry.position.x,
        curTelemetry.position.y,
        curTelemetry.position.z
      );
      worldScene.update(
        dt,
        elapsed,
        droneWorldPos,
        curTelemetry.rotorRpmPercent ? curTelemetry.rotorRpmPercent / 100 : 0.8,
        physics.environment.getState()
      );

      // Render 3D Frame
      scene.traverse((obj: any) => {
        if (obj.children && obj.children.includes(undefined as any)) {
          console.error("CORRUPTED THREE.JS OBJECT FOUND (undefined child):", obj, obj.name, obj.type);
          obj.children = obj.children.filter((c: any) => c !== undefined);
        }
        if (obj.isMesh || obj.isPoints || obj.isLine || obj.isSprite) {
          if (!obj.material) {
            console.error("OBJECT MISSING MATERIAL:", obj, obj.name);
            obj.material = new THREE.MeshBasicMaterial({ color: 0xff00ff });
          } else if (Array.isArray(obj.material)) {
            for (let i = 0; i < obj.material.length; i++) {
              if (!obj.material[i]) {
                console.error("OBJECT MATERIAL ARRAY MISSING ITEM AT INDEX", i, obj, obj.name);
                obj.material[i] = new THREE.MeshBasicMaterial({ color: 0xff00ff });
              }
            }
          }
        }
      });
      renderer.render(scene, chaseCam.camera);

      // Broadcast telemetry to peer pilots
      mpClient.sendTelemetry(curTelemetry);

      // Sync React Telemetry State at ~20Hz to keep UI responsive and light
      telemetryThrottleTimer += dt; coachEvalTimer += dt;
      if (telemetryThrottleTimer >= 0.05) {
        telemetryThrottleTimer = 0;
        setTelemetry({ ...curTelemetry });
        setClockSnapshot(simClockRef.current.getSnapshot());
        if (simulationAdapterRef.current) {
          setAdapterStatus(simulationAdapterRef.current.getStatus());
        }
        if (isDebugOpen) {
          setPhysicsDebug(physics.getDebugTelemetry());
        }
        if (activeDtRef.current) {
          setDigitalTwinRuntime(
            buildRuntimeStateFromTelemetry(activeDtRef.current, curTelemetry, physics.motorOutputs)
          );
        }

        // Phase 8: Flight Coach Observation & Evaluation (Throttled to 10Hz)
        if (coachEvalTimer >= 0.1) { coachEvalTimer = 0;
          const obs = coachEngineRef.current.extractObservation(curTelemetry, physics.environment.getState());
          const insight = coachEngineRef.current.evaluate(obs);
          if (insight) {
            setCurrentInsight(insight);
            setInsightHistory(prev => [insight, ...prev.slice(0, 29)]);
            SimulationEventBus.getInstance().emit({
              timestamp: insight.timestamp,
              simTime: simClockRef.current.getSimTime(),
              type: "FLIGHT_COACH_INSIGHT" as any,
              severity: insight.severity === "CRITICAL" ? "CRITICAL" : insight.severity === "ATTENTION" ? "WARNING" : "INFO",
              source: "SYSTEM",
              title: insight.title,
              message: insight.explanation.what,
            });
            scenarioEngineRef.current.registerCoachInsight(insight);
          }
          if (activeScenarioId) {
            scenarioEngineRef.current.evaluate(
              obs,
              curTelemetry.position,
              physics.crashState,
              (!physics.crashState?.isCrashed && curTelemetry.altitude < 0.25 && Math.abs(curTelemetry.verticalSpeed) < 0.5)
            );
            setSessionState({ ...scenarioEngineRef.current.getSessionState()! });
          }
        }
      }
    };

    animate();


    // CLEANUP
    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      inputManager.detach();
      mpClient.disconnect();

      domEl.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      domEl.removeEventListener("dblclick", onDblClick);
      domEl.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onGlobalKeyDown);

      if (container.contains(domEl)) {
        container.removeChild(domEl);
      }

      scene.remove(droneMesh.group);
      scene.remove(droneMesh.groundShadowMesh);
      cloneMeshes.forEach(c => {
          scene.remove(c.group);
          scene.remove(c.groundShadowMesh);
      });
      scene.remove(remoteDroneMgr.group);
      renderer.dispose();
      
      if (audioManagerRef.current) {
        audioManagerRef.current.dispose();
        audioManagerRef.current = null;
      }
      droneAudioRef.current = null;
      windAudioRef.current = null;
      envZoneAudioRef.current = null;

      SimulationEventBus.getInstance().clear();
    };
  }, [selectedDrone, callsign]);

  return (
    <div className="flex flex-col h-screen w-full bg-[#08090a] overflow-hidden select-none">
      {/* Top Navigation */}
      <div className="h-14 shrink-0 z-50 relative">
        <DashboardHeader />
      </div>

      <div className="flex-1 w-full relative overflow-hidden bg-[#08090a]">
        {/* Center 3D World */}
        <div ref={containerRef} className="absolute inset-0 cursor-crosshair" />
        
        {/* Phase 2: Analog FPV VTX Static */}
        {cameraMode === "fpv" && (
          <FPVStaticOverlay distance={Math.hypot(telemetry.position.x - spawnConfigRef.current.position.x, telemetry.position.z - spawnConfigRef.current.position.z)} />
        )}

        <LeftGlassPanel
          telemetry={telemetry}
          drone={selectedDrone}
          motorCount={physicsEngineRef.current?.def.motorCount || 4}
          motorHealths={motorHealths}
          onSetMotorHealth={handleSetMotorHealth}
          payloadMassKg={payloadMassKg}
          onUpdatePayload={handleSetPayloadMass}
          droneQuantity={droneQuantity}
          onUpdateDroneQuantity={handleSetDroneQuantity}
          sensorHealth={sensorHealth}
          onToggleSensor={handleToggleSensor as any}
          onExit={onExit}
        />

        <RightGlassPanel
          environment={envState}
          onUpdateEnvironment={handleUpdateEnvironment}
          telemetry={telemetry}
          activeWaypoint={activeWaypoint}
          onToggleMap={() => setIsMapModalOpen(true)}
          onResetEnvironment={() => handleApplyWeatherPreset("normal")}
          currentInsight={currentInsight}
        />

        {/* Loading Screen Overlay */}
        {isLoading && <SimulationLoadingScreen onReady={handleLoadingReady} />}

        {/* Tactical Dropzone Deployment Briefing Banner */}
        {!isLoading && showDropBriefing && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="bg-black/70 backdrop-blur-md text-white/80 border border-white/10 px-4 py-2 rounded-full shadow-lg flex items-center gap-3 font-mono select-none">
              <div className="w-2 h-2 rounded-full bg-[#FF5500] animate-ping shrink-0" />
              <div className="text-[11px] tracking-widest">
                <span className="text-[#FF5500] font-black uppercase">SPAWN: </span>
                <span className="font-bold text-white/80">
                  {HELIPADS[initialSpawn.helipadId]?.name || "Island Helipad"}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Avionics Telemetry HUD */}
        <TelemetryHUD
          telemetry={telemetry}
          droneName={selectedDrone.name}
          cameraMode={cameraMode}
          onSelectCameraMode={handleSelectCameraMode}
          onReset={handleReset}
          onExit={onExit}
          isHoverMode={isHoverMode}
          onToggleHover={handleToggleHover}
          onToggleMap={() => setIsMapModalOpen((prev) => !prev)}
          onMoveDirection={handleMoveDirection}
          onYaw={handleYaw}
          onThrottle={handleThrottle}
          onAutoLand={handleAutoLand}
          onOpenEnvironment={() => setIsEnvironmentOpen(true)}
          onOpenReplay={handleOpenReplay}
          onOpenAnalysis={handleManualDebrief}
          onToggleDebug={() => setIsDebugOpen((prev) => !prev)}
          onToggleTutorial={() => setIsTutorialOpen((prev) => !prev)}
          environment={envState}
          remotePlayers={remotePlayers}
          callsign={callsign}
          activeWaypoint={activeWaypoint}
          onTeleportBase={handleTeleportBase}
          autoMoveLocked={autoMoveLocked}
          onCancelAutoMove={() => {
            inputManagerRef.current?.cancelMovementLock();
            setAutoMoveLocked("");
          }}
          isMuted={isMuted}
          onToggleMute={toggleMute}
        />
      </div>

      {/* Educational Flight Session Scenario Overlay */}
      {activeScenarioId && (
        <ScenarioSessionOverlay
          scenario={scenarioEngineRef.current.getActiveScenario()}
          session={sessionState}
          onStart={handleStartScenario}
          onClose={() => {
            setActiveScenarioId(null);
            scenarioEngineRef.current.abortScenario();
            handleResetExperiment();
          }}
          onReset={() => {
             const scenario = scenarioEngineRef.current.getActiveScenario(); if(scenario) { handleSelectScenario(scenario); }
             handleStartScenario();
          }}
        />
      )}

      {/* Live Tutorial Overlay */}
      {isTutorialOpen && (
        <TutorialOverlay
          telemetry={telemetry}
          onDismiss={handleDismissTutorial}
        />
      )}

      {/* Developer Physics 6-DoF Debug HUD */}
      <PhysicsDebugHUD
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        telemetry={physicsDebug}
      />

      {/* Environment & Weather Control Panel Modal */}
      <EnvironmentControlPanel
        isOpen={isEnvironmentOpen}
        onClose={() => setIsEnvironmentOpen(false)}
        environment={envState}
        onUpdateEnvironment={handleUpdateEnvironment}
        onApplyPreset={handleApplyWeatherPreset}
        telemetry={telemetry}
      />

      {/* Full Tactical Island Map Modal */}
      <IslandMapModal
        isOpen={isMapModalOpen}
        onClose={() => setIsMapModalOpen(false)}
        telemetry={telemetry}
        droneName={selectedDrone.name}
        activeWaypoint={activeWaypoint}
        onSelectWaypoint={setActiveWaypoint}
      />

      {/* Tactical Crash Notification & In-Place Revive HUD */}
      {telemetry.isCrashed && (
        <CrashReviveOverlay
          crashState={physicsEngineRef.current?.crashState || null}
          onReviveHere={handleReviveHere}
          onResetToBase={handleReset}
          onOpenAnalysis={handleManualDebrief}
        />
      )}

        {/* Post-Flight Reporting Modal (White PDF) */}
        {isReportOpen && (
          <PostFlightReportModal
            drone={selectedDrone}
            telemetry={telemetry}
            envState={envState}
            stats={flightStatsRef.current}
            insights={insightHistory}
            frames={flightRecorderRef.current.getFrames()}
            droneQuantity={droneQuantity}
            callsign={callsign}
            onClose={() => {
              setIsReportOpen(false);
              simClockRef.current.resume();
            }}
          />
        )}

      {/* Telemetry Stream Replay Modal */}
      <FlightReplayModal
        isOpen={isReplayOpen}
        onClose={() => setIsReplayOpen(false)}
        frames={replayFrames}
      />

      {/* Floating toolbar removed to migrate to new clean glassmorphism panels */}

      {/* Simulation Diagnostics Overlay */}
      <SimulationDiagnosticsOverlay
        isOpen={isDiagnosticsOpen}
        onClose={() => setIsDiagnosticsOpen(false)}
        clockSnapshot={clockSnapshot}
        adapterStatus={adapterStatus}
        connectionStatus={connectionStatus}
        remotePlayerCount={remotePlayers.length}
        eventCount={eventCount}
        lastEventTitle={lastEventTitle}
        fps={fps}
      />

      {/* Flight Controls Visual Guide */}
      <FlightControlsOverlay 
            telemetry={telemetry} 
            autoMoveLocked={autoMoveLocked} 
            onToggleMap={() => setIsMapModalOpen(true)} 
            sensorHealth={sensorHealth}
            onToggleScenarios={() => setIsScenarioModalOpen(true)}
            onExit={handleManualDebrief}
            droneQuantity={droneQuantity}
            onUpdateDroneQuantity={handleSetDroneQuantity}
            onToggleRtl={handleToggleRtl}
          />

      {/* Real-Time Flight Coach Instrumentation */}
      {!isLoading && <FlightCoachPanel
        insight={currentInsight}
        history={insightHistory}
        onDismiss={() => setCurrentInsight(null)}
        onClearHistory={() => setInsightHistory([])}
      />}

      {/* Fault Injection Benchmark Panel */}
      <FaultInjectionPanel
        isOpen={isFaultPanelOpen}
        onClose={() => setIsFaultPanelOpen(false)}
        motorCount={physicsEngineRef.current?.def.motorCount || 4}
        motorHealths={motorHealths}
        onSetMotorHealth={handleSetMotorHealth}
        sensorHealth={sensorHealth}
        onToggleSensor={handleToggleSensor}
        payloadMassKg={payloadMassKg}
        maxPayloadKg={physicsEngineRef.current?.def.payloadCapacity || 4.0}
        onSetPayloadMass={handleSetPayloadMass}
        onResetAllFaults={handleResetAllFaults}
      />

      {/* Preset Training Scenarios Modal */}
      <ScenarioSelectorModal
        isOpen={isScenarioModalOpen}
        onClose={() => setIsScenarioModalOpen(false)}
        onSelectScenario={handleSelectScenario}
        activeScenarioId={activeScenarioId || undefined}
      />

      {/* Digital Twin Live Telemetry Drawer */}
      {activeDigitalTwin && digitalTwinRuntime && (
        <DigitalTwinHUD
          isOpen={isDigitalTwinHUDOpen}
          onClose={() => setIsDigitalTwinHUDOpen(false)}
          config={activeDigitalTwin}
          runtimeState={digitalTwinRuntime}
        />
      )}
    </div>
  );
}







