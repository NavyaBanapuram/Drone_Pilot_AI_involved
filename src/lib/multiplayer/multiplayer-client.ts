// ==========================================================
// DRONE PILOT — REAL-TIME GLOBAL MULTIPLAYER CLIENT
// Supports state synchronization across different computers/devices via Firebase Firestore,
// local BroadcastChannel fallback for multi-tab testing, dead-reckoning, and helipad deconfliction.
// ==========================================================

import { RemotePlayerState, MultiplayerPacket, ConnectionStatus, sanitizeRemotePlayerState } from "./multiplayer-types";
import { TelemetryState } from "../simulation/types";
import { db, isFirebaseConfigured } from "../firebase/client";
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  type Unsubscribe,
} from "firebase/firestore";

export class MultiplayerClient {
  public localPlayerId: string;
  public callsign: string;
  public isConnected = false;
  public regionId = "training";
  public helipadId = "training-alpha";
  public status: ConnectionStatus = "LOCAL";

  private channel: BroadcastChannel | null = null;
  private firestoreUnsubscribe: Unsubscribe | null = null;
  private remotePlayers: Map<string, RemotePlayerState> = new Map();
  private onPlayersUpdated?: (players: RemotePlayerState[]) => void;
  private onStatusChanged?: (status: ConnectionStatus) => void;

  private broadcastTimer = 0;
  private broadcastInterval = 0.05; // 20Hz local broadcast
  private cloudSyncTimer = 0;
  private cloudSyncInterval = 0.15; // ~7Hz cloud broadcast (low latency without quota exhaustion)
  private unloadListener: (() => void) | null = null;
  private localSequence = 0;

  constructor(
    callsign?: string,
    regionId = "training",
    onUpdate?: (players: RemotePlayerState[]) => void,
    onStatus?: (status: ConnectionStatus) => void
  ) {
    this.localPlayerId = "pilot_" + Math.random().toString(36).substring(2, 8);
    this.callsign = callsign || "EAGLE-" + Math.floor(10 + Math.random() * 90);
    this.regionId = regionId;
    this.onPlayersUpdated = onUpdate;
    this.onStatusChanged = onStatus;
  }

  public setStatus(newStatus: ConnectionStatus): void {
    if (this.status !== newStatus) {
      this.status = newStatus;
      if (this.onStatusChanged) {
        this.onStatusChanged(newStatus);
      }
    }
  }

  public connect(
    regionId?: string,
    helipadId?: string,
    onUpdate?: (players: RemotePlayerState[]) => void,
    onStatus?: (status: ConnectionStatus) => void
  ) {
    if (regionId) this.regionId = regionId;
    if (helipadId) this.helipadId = helipadId;
    if (onUpdate) this.onPlayersUpdated = onUpdate;
    if (onStatus) this.onStatusChanged = onStatus;

    // 1. Local BroadcastChannel for instant local inter-tab communication
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        this.channel = new BroadcastChannel("drone_pilot_airspace");
        this.channel.onmessage = (event) => {
          this.handlePacket(event.data);
        };
        this.isConnected = true;
        this.setStatus("LOCAL");

        this.sendPacket("JOIN", {
          regionId: this.regionId,
          helipadId: this.helipadId,
        });
      } catch (e) {
        console.warn("Local broadcast channel unavailable:", e);
      }
    }

    // 2. Global Cloud Airspace via Firebase Firestore (Multi-device/multi-computer)
    if (db && isFirebaseConfigured()) {
      try {
        const airspaceCol = collection(db, "active_airspace");
        this.firestoreUnsubscribe = onSnapshot(
          airspaceCol,
          (snapshot) => {
            const now = Date.now();
            let changed = false;

            snapshot.docChanges().forEach((change) => {
              const id = change.doc.id;
              if (id === this.localPlayerId) return;

              if (change.type === "removed") {
                if (this.remotePlayers.delete(id)) {
                  changed = true;
                }
              } else {
                const raw = change.doc.data();
                const sanitized = sanitizeRemotePlayerState(raw);
                if (sanitized && now - sanitized.lastUpdate < 8000) {
                  const existing = this.remotePlayers.get(id);
                  if (!existing || sanitized.sequenceNumber >= existing.sequenceNumber) {
                    this.remotePlayers.set(id, sanitized);
                    changed = true;
                  }
                }
              }
            });

            if (changed) {
              this.notifyUpdate();
            }
            this.setStatus("CONNECTED");
          },
          (err) => {
            console.warn("Firestore airspace subscription warning (falling back to local channel):", err);
            this.setStatus("LOCAL");
          }
        );
        this.isConnected = true;
        this.setStatus("CONNECTED");
      } catch (err) {
        console.warn("Failed to subscribe to cloud airspace:", err);
      }
    }

    // 3. Auto-cleanup on window unload
    if (typeof window !== "undefined") {
      this.unloadListener = () => {
        this.disconnect();
      };
      window.addEventListener("beforeunload", this.unloadListener);
    }
  }


  public sendTelemetry(telemetry: TelemetryState, dt = 0.05) {
    this.updateLocalState(telemetry, "drone", this.regionId, this.helipadId, dt);
  }

  public disconnect() {
    if (this.channel) {
      this.sendPacket("LEAVE", {});
      this.channel.close();
      this.channel = null;
    }

    // Remove document from Firestore
    if (db && isFirebaseConfigured() && this.localPlayerId) {
      try {
        const docRef = doc(db, "active_airspace", this.localPlayerId);
        deleteDoc(docRef).catch(() => {});
      } catch {
        // Ignore during tear down
      }
    }

    if (this.firestoreUnsubscribe) {
      this.firestoreUnsubscribe();
      this.firestoreUnsubscribe = null;
    }

    if (this.unloadListener && typeof window !== "undefined") {
      window.removeEventListener("beforeunload", this.unloadListener);
      this.unloadListener = null;
    }

    this.isConnected = false;
    this.setStatus("OFFLINE");
    this.remotePlayers.clear();
    this.notifyUpdate();
  }

  public updateLocalState(
    telemetry: TelemetryState,
    droneId: string,
    regionId: string,
    helipadId: string,
    dt: number
  ) {
    if (!this.isConnected) return;

    this.localSequence++;

    const state: RemotePlayerState = {
      playerId: this.localPlayerId,
      callsign: this.callsign,
      droneId,
      regionId,
      helipadId,
      position: { ...telemetry.position },
      rotation: { ...telemetry.rotation },
      velocity: { ...telemetry.velocity },
      rotorRpmPercent: telemetry.rotorRpmPercent,
      flightMode: telemetry.flightMode,
      lastUpdate: Date.now(),
      sequenceNumber: this.localSequence,
    };

    // 1. Fast local broadcast (20Hz)
    this.broadcastTimer += dt;
    if (this.broadcastTimer >= this.broadcastInterval) {
      this.broadcastTimer = 0;
      this.sendPacket("STATE", state);
    }

    // 2. Cloud Firestore broadcast (~7Hz)
    this.cloudSyncTimer += dt;
    if (this.cloudSyncTimer >= this.cloudSyncInterval) {
      this.cloudSyncTimer = 0;
      if (db && isFirebaseConfigured()) {
        try {
          const docRef = doc(db, "active_airspace", this.localPlayerId);
          setDoc(docRef, state, { merge: true }).catch(() => {});
        } catch {
          // Ignore transient network errors
        }
      }
    }

    // 3. Prune stale remote drones (> 6.5s)
    const now = Date.now();
    let changed = false;
    for (const [id, player] of this.remotePlayers.entries()) {
      if (now - player.lastUpdate > 6500) {
        this.remotePlayers.delete(id);
        changed = true;
      }
    }
    if (changed) this.notifyUpdate();
  }

  private sendPacket(type: MultiplayerPacket["type"], data: any) {
    if (!this.channel) return;
    const packet: MultiplayerPacket = {
      type,
      playerId: this.localPlayerId,
      callsign: this.callsign,
      data,
      timestamp: Date.now(),
      sequenceNumber: this.localSequence,
    };
    try {
      this.channel.postMessage(packet);
    } catch {
      // Ignore
    }
  }

  private handlePacket(packet: MultiplayerPacket) {
    if (!packet || packet.playerId === this.localPlayerId) return;

    if (packet.type === "STATE") {
      const sanitized = sanitizeRemotePlayerState(packet.data);
      if (sanitized) {
        const existing = this.remotePlayers.get(packet.playerId);
        if (!existing || sanitized.sequenceNumber >= existing.sequenceNumber) {
          this.remotePlayers.set(packet.playerId, sanitized);
          this.notifyUpdate();
        }
      }
    } else if (packet.type === "LEAVE") {
      this.remotePlayers.delete(packet.playerId);
      this.notifyUpdate();
    } else if (packet.type === "JOIN") {
      this.broadcastTimer = 999; // instant reply
    }
  }


  private notifyUpdate() {
    if (this.onPlayersUpdated) {
      this.onPlayersUpdated(Array.from(this.remotePlayers.values()));
    }
  }

  public getActiveRemotePlayers(): RemotePlayerState[] {
    return Array.from(this.remotePlayers.values());
  }

  public allocateSpawnOffset(padX: number, padZ: number): { x: number; z: number } {
    let offsetX = padX;
    let offsetZ = padZ;

    for (const remote of this.remotePlayers.values()) {
      const dist = Math.hypot(remote.position.x - padX, remote.position.z - padZ);
      if (dist < 6.0) {
        offsetX += 8.0;
        offsetZ += 2.0;
      }
    }

    return { x: offsetX, z: offsetZ };
  }
}
