// ==========================================================
// DRONE PILOT — MULTIPLAYER NETWORK PROTOCOL TYPES (PHASE 7)
// Hardened lightweight telemetry packet representation with
// sequence numbering, timestamping, dead-reckoning support, and status.
// ==========================================================

export type ConnectionStatus = "LOCAL" | "CONNECTED" | "RECONNECTING" | "OFFLINE";

export interface RemotePlayerState {
  playerId: string;
  callsign: string;
  droneId: string;
  droneType?: string;
  airframeType?: string;
  configVersion?: string;
  regionId: string;
  helipadId: string;
  position: { x: number; y: number; z: number };
  rotation: { pitch: number; roll: number; yaw: number };
  velocity: { x: number; y: number; z: number };
  rotorRpmPercent: number;
  flightMode: string;
  lastUpdate: number;
  sequenceNumber: number;
  pingMs?: number;
}

export interface MultiplayerPacket {
  type: "JOIN" | "STATE" | "LEAVE" | "CHAT" | "SPAWN_RESERVE" | "HEARTBEAT";
  playerId: string;
  callsign: string;
  data: any;
  timestamp: number;
  sequenceNumber?: number;
}

// ----------------------------------------------------------
// NETWORK SAFETY VALIDATION
// Clamps incoming coordinates to realistic simulation bounds
// ----------------------------------------------------------
export function sanitizeRemotePlayerState(raw: any): RemotePlayerState | null {
  if (!raw || typeof raw !== "object") return null;
  if (typeof raw.playerId !== "string" || !raw.playerId) return null;

  const clamp = (val: any, min: number, max: number, fallback: number) => {
    const num = Number(val);
    return isNaN(num) ? fallback : Math.max(min, Math.min(max, num));
  };

  const cleanCallsign = typeof raw.callsign === "string"
    ? raw.callsign.substring(0, 20).replace(/[^a-zA-Z0-9_\-\s]/g, "")
    : "PILOT";

  // Island world bounds: [-2500, 2500] horizontally, [0, 1500] vertical altitude
  const pos = raw.position || {};
  const rot = raw.rotation || {};
  const vel = raw.velocity || {};

  return {
    playerId: String(raw.playerId).substring(0, 36),
    callsign: cleanCallsign,
    droneId: String(raw.droneId || "drone").substring(0, 36),
    droneType: raw.droneType ? String(raw.droneType).substring(0, 36) : "quadcopter",
    airframeType: raw.airframeType ? String(raw.airframeType).substring(0, 36) : "quadcopter",
    configVersion: raw.configVersion ? String(raw.configVersion).substring(0, 10) : "1.0",
    regionId: String(raw.regionId || "training").substring(0, 36),
    helipadId: String(raw.helipadId || "training-alpha").substring(0, 36),
    position: {
      x: clamp(pos.x, -2500, 2500, 0),
      y: clamp(pos.y, 0, 1500, 1.5),
      z: clamp(pos.z, -2500, 2500, 0),
    },
    rotation: {
      pitch: clamp(rot.pitch, -Math.PI, Math.PI, 0),
      roll: clamp(rot.roll, -Math.PI, Math.PI, 0),
      yaw: clamp(rot.yaw, -Math.PI * 2, Math.PI * 2, 0),
    },
    velocity: {
      x: clamp(vel.x, -100, 100, 0),
      y: clamp(vel.y, -100, 100, 0),
      z: clamp(vel.z, -100, 100, 0),
    },
    rotorRpmPercent: clamp(raw.rotorRpmPercent, 0, 100, 0),
    flightMode: String(raw.flightMode || "HOVER").substring(0, 16),
    lastUpdate: typeof raw.lastUpdate === "number" ? raw.lastUpdate : Date.now(),
    sequenceNumber: typeof raw.sequenceNumber === "number" ? raw.sequenceNumber : 0,
    pingMs: typeof raw.pingMs === "number" ? raw.pingMs : 0,
  };
}

