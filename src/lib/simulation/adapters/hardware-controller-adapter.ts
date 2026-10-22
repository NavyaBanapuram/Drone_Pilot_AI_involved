// ==========================================================
// DRONE PILOT — HARDWARE CONTROLLER INPUT ADAPTER (PHASE 7)
// Supports Standard USB Gamepads & RC Transmitters (Mode 2) via HTML5 Gamepad API
//
// INTEGRATION STATUS:
// HARDWARE: NORMALIZED INPUT INTERFACE READY
// PHYSICAL HARDWARE: CONNECTED DYNAMICALLY VIA GAMEPAD API (OR AWAITING DEVICE)
// ==========================================================

import { NormalizedControlInput, DEFAULT_NORMALIZED_CONTROL } from "../normalized-control";

export interface HardwareControllerStatus {
  isSupported: boolean;
  isConnected: boolean;
  gamepadId: string | null;
  axesCount: number;
  buttonsCount: number;
  statusMessage: string;
}

export class HardwareControllerAdapter {
  private gamepadIndex: number | null = null;
  private deadzone = 0.08;

  constructor() {
    if (typeof window !== "undefined") {
      window.addEventListener("gamepadconnected", (e: GamepadEvent) => {
        this.gamepadIndex = e.gamepad.index;
        console.log(`[Hardware Controller] Controller connected at index ${e.gamepad.index}: ${e.gamepad.id}`);
      });

      window.addEventListener("gamepaddisconnected", (e: GamepadEvent) => {
        if (this.gamepadIndex === e.gamepad.index) {
          this.gamepadIndex = null;
          console.log("[Hardware Controller] Controller disconnected.");
        }
      });
    }
  }

  public pollInput(): Partial<NormalizedControlInput> | null {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return null;

    const gamepads = navigator.getGamepads();
    let pad: Gamepad | null = null;

    if (this.gamepadIndex !== null && gamepads[this.gamepadIndex]) {
      pad = gamepads[this.gamepadIndex];
    } else {
      // Find first connected gamepad
      for (let i = 0; i < gamepads.length; i++) {
        if (gamepads[i]) {
          pad = gamepads[i];
          this.gamepadIndex = i;
          break;
        }
      }
    }

    if (!pad) return null;

    // Standard Mode 2 RC Stick Mapping:
    // Axis 0: Left Stick X (Yaw)
    // Axis 1: Left Stick Y (Throttle - inverted: push forward = -1.0)
    // Axis 2: Right Stick X (Roll)
    // Axis 3: Right Stick Y (Pitch - inverted: push forward = -1.0)
    const rawYaw = pad.axes[0] ?? 0;
    const rawThrottle = pad.axes[1] ?? 0;
    const rawRoll = pad.axes[2] ?? 0;
    const rawPitch = pad.axes[3] ?? 0;

    const applyDeadzone = (val: number) => (Math.abs(val) < this.deadzone ? 0 : val);

    return {
      yaw: applyDeadzone(rawYaw),
      throttle: -applyDeadzone(rawThrottle), // Invert so stick forward is positive climb
      roll: applyDeadzone(rawRoll),
      pitch: -applyDeadzone(rawPitch), // Invert so stick forward is pitch down / forward
      isArmed: pad.buttons[0]?.pressed || false, // Button A / Cross
    };
  }

  public getStatus(): HardwareControllerStatus {
    const isSupported = typeof navigator !== "undefined" && !!navigator.getGamepads;
    let isConnected = false;
    let gamepadId: string | null = null;
    let axesCount = 0;
    let buttonsCount = 0;

    if (isSupported) {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (gp) {
          isConnected = true;
          gamepadId = gp.id;
          axesCount = gp.axes.length;
          buttonsCount = gp.buttons.length;
          break;
        }
      }
    }

    return {
      isSupported,
      isConnected,
      gamepadId,
      axesCount,
      buttonsCount,
      statusMessage: isConnected
        ? `Connected: ${gamepadId}`
        : "HARDWARE: NORMALIZED INPUT INTERFACE READY; PHYSICAL HARDWARE: NOT CONNECTED",
    };
  }
}
