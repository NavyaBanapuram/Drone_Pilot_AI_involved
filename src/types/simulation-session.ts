// ==========================================================
// DRONE PILOT — SIMULATION SESSION TYPE DEFINITIONS (PHASE 7)
// Distinguishes dynamic session context from static aircraft configuration
// and real-time physical runtime state.
// ==========================================================

export type SessionStatus =
  | "WAITING"
  | "RUNNING"
  | "PAUSED"
  | "COMPLETED"
  | "ENDED";

export type ParticipantRole = "INSTRUCTOR" | "STUDENT" | "PILOT" | "OBSERVER";

export interface SessionParticipant {
  userId: string;
  callsign: string;
  role: ParticipantRole;
  droneConfigId: string;
  joinedAt: number;
  isReady: boolean;
  lastPing?: number;
}

export interface SessionEventLogEntry {
  timestamp: number;
  simTimeSeconds: number;
  type: string;
  sourceUserId: string;
  description: string;
  metadata?: Record<string, any>;
}

export interface SessionObjectiveProgress {
  objectiveId: string;
  title: string;
  isCompleted: boolean;
  completedAt?: number;
  scorePercent?: number;
}

export interface SimulationSession {
  sessionId: string;
  sessionSchemaVersion: string; // "1.0"
  ownerId: string;
  scenarioId: string;
  worldId: string;
  worldVersion: string;
  seed: number;
  status: SessionStatus;
  createdAt: number;
  startedAt?: number;
  endedAt?: number;
  participants: SessionParticipant[];
  objectives?: SessionObjectiveProgress[];
  eventLog?: SessionEventLogEntry[];
}
