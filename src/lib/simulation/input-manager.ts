// ==========================================================
// DRONE PILOT — UNIFIED INPUT MANAGER
// Merges Desktop Keyboard and Mobile Touch into a single
// normalized FlightInput stream.
// ==========================================================

import { FlightInput } from "./types";

export class InputManager {
  // Keyboard State
  private keys: Record<string, boolean> = {};

  // Touch Virtual Stick State (-1.0 to 1.0)
  private touchThrottle = 0;
  private touchYaw = 0;
  private touchPitch = 0;
  private touchRoll = 0;

  // Discrete action triggers
  private triggerReset = false;
  private triggerCameraToggle = false;
  private hoverAssistActive = true;

  // Double-tap movement lock state
  private lockedPitch = 0;  // -1, 0, or 1
  private lockedRoll = 0;   // -1, 0, or 1
  private gpButtonStates: Record<number, boolean> = {};
  private lastKeyTime: Record<string, number> = {};
  private readonly DOUBLE_TAP_MS = 350;

  private onKeyDownBound: (e: KeyboardEvent) => void;
  private onKeyUpBound: (e: KeyboardEvent) => void;

  constructor() {
    this.onKeyDownBound = this.handleKeyDown.bind(this);
    this.onKeyUpBound = this.handleKeyUp.bind(this);
  }

  public attach() {
    if (typeof window === "undefined") return;
    window.addEventListener("keydown", this.onKeyDownBound);
    window.addEventListener("keyup", this.onKeyUpBound);
  }

  public detach() {
    if (typeof window === "undefined") return;
    window.removeEventListener("keydown", this.onKeyDownBound);
    window.removeEventListener("keyup", this.onKeyUpBound);
    this.keys = {};
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Avoid triggering controls when typing in input fields
    if ((e.target as HTMLElement)?.tagName === "INPUT" || (e.target as HTMLElement)?.tagName === "TEXTAREA") {
      return;
    }

    const code = e.code;

    // Double-tap detection for movement lock (W/A/S/D)
    if (["KeyW", "KeyS", "KeyA", "KeyD"].includes(code) && !e.repeat) {
      const now = Date.now();
      const lastTime = this.lastKeyTime[code] || 0;
      if (now - lastTime < this.DOUBLE_TAP_MS) {
        // Double-tap detected — toggle lock for this direction
        if (code === "KeyW") {
          this.lockedPitch = this.lockedPitch === -1 ? 0 : -1;
          this.lockedRoll = 0;
        } else if (code === "KeyS") {
          this.lockedPitch = this.lockedPitch === 1 ? 0 : 1;
          this.lockedRoll = 0;
        } else if (code === "KeyD") {
          this.lockedRoll = this.lockedRoll === 1 ? 0 : 1;
          this.lockedPitch = 0;
        } else if (code === "KeyA") {
          this.lockedRoll = this.lockedRoll === -1 ? 0 : -1;
          this.lockedPitch = 0;
        }
      } else {
        // Single tap — clear opposing or perpendicular lock immediately
        if (code === "KeyW" && this.lockedPitch === 1) this.lockedPitch = 0;
        if (code === "KeyS" && this.lockedPitch === -1) this.lockedPitch = 0;
        if (code === "KeyA" && this.lockedRoll === 1) this.lockedRoll = 0;
        if (code === "KeyD" && this.lockedRoll === -1) this.lockedRoll = 0;
        if ((code === "KeyW" || code === "KeyS") && this.lockedRoll !== 0) {
          this.lockedRoll = 0;
        }
        if ((code === "KeyA" || code === "KeyD") && this.lockedPitch !== 0) {
          this.lockedPitch = 0;
        }
      }
      this.lastKeyTime[code] = now;
    }

    this.keys[code] = true;

    if (code === "KeyR") {
      this.triggerReset = true;
    }
    if (code === "KeyH") {
      this.hoverAssistActive = !this.hoverAssistActive;
    }
    if (code === "KeyV") {
      this.triggerCameraToggle = true;
    }

    // Prevent default scroll on Space/Arrows during flight
    if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(code)) {
      e.preventDefault();
    }
  }

  private handleKeyUp(e: KeyboardEvent) {
    this.keys[e.code] = false;
  }

  public setTouchThrottle(val: number) {
    this.touchThrottle = Math.max(-1, Math.min(1, val));
  }
  public setTouchYaw(val: number) {
    this.touchYaw = Math.max(-1, Math.min(1, val));
  }
  public setTouchPitch(val: number) {
    this.touchPitch = Math.max(-1, Math.min(1, val));
  }
  public setTouchRoll(val: number) {
    this.touchRoll = Math.max(-1, Math.min(1, val));
  }

  // Unified on-screen widget control methods
  public setDirection(pitch: number, roll: number) {
    this.touchPitch = Math.max(-1, Math.min(1, pitch));
    this.touchRoll = Math.max(-1, Math.min(1, roll));
  }
  public setThrottle(val: number) {
    this.touchThrottle = Math.max(-1, Math.min(1, val));
  }
  public setYaw(val: number) {
    this.touchYaw = Math.max(-1, Math.min(1, val));
  }
  public triggerResetAction() {
    this.triggerReset = true;
  }
  public triggerCameraAction() {
    this.triggerCameraToggle = true;
  }
  public toggleHoverAssist() {
    this.hoverAssistActive = !this.hoverAssistActive;
  }
  public isHoverAssist(): boolean {
    return this.hoverAssistActive;
  }

  // Slew-rate smoothing states (eliminates sharp 1-frame twitching)
  private smoothedThrottle = 0;
  private smoothedPitch = 0;
  private smoothedRoll = 0;
  private smoothedYaw = 0;

  /** Returns true if a movement direction is currently locked via double-tap */
  public isMovementLocked(): boolean {
    return this.lockedPitch !== 0 || this.lockedRoll !== 0;
  }

  /** Returns locked direction label for HUD indicator */
  public getLockedDirection(): string {
    if (this.lockedPitch === -1) return "FWD";
    if (this.lockedPitch === 1) return "BWD";
    if (this.lockedRoll === 1) return "RIGHT";
    if (this.lockedRoll === -1) return "LEFT";
    return "";
  }

  /** Explicitly unlocks movement lock */
  public cancelMovementLock() {
    this.lockedPitch = 0;
    this.lockedRoll = 0;
  }

  /**
   * Evaluates combined input state for the current frame with slew-rate smoothing
   */
  public getInput(dt: number = 0.016): FlightInput {
    // Keyboard inputs
    let kbThrottle = 0;
    if (this.keys["Space"]) kbThrottle += 1;
    if (this.keys["ShiftLeft"] || this.keys["ShiftRight"] || this.keys["KeyC"]) kbThrottle -= 1;

    let kbPitch = 0;
    if (this.keys["KeyW"] || this.keys["ArrowUp"]) kbPitch -= 1;
    if (this.keys["KeyS"] || this.keys["ArrowDown"]) kbPitch += 1;

    let kbRoll = 0;
    if (this.keys["KeyD"] || this.keys["ArrowRight"]) kbRoll -= 1;
    if (this.keys["KeyA"] || this.keys["ArrowLeft"]) kbRoll += 1;

    let kbYaw = 0;
    if (this.keys["KeyE"]) kbYaw += 1;
    if (this.keys["KeyQ"]) kbYaw -= 1;

    // Apply movement lock (double-tap): locked direction stays active even without key held
    if (this.lockedPitch !== 0 && kbPitch === 0) kbPitch = this.lockedPitch;
    if (this.lockedRoll !== 0 && kbRoll === 0) kbRoll = this.lockedRoll;


    // Gamepad inputs (Xbox/PS Controllers & USB RC Transmitters)
    let gpThrottle = 0;
    let gpPitch = 0;
    let gpRoll = 0;
    let gpYaw = 0;

    if (typeof navigator !== "undefined" && navigator.getGamepads) {
      const gamepads = navigator.getGamepads();
      for (let i = 0; i < gamepads.length; i++) {
        const gp = gamepads[i];
        if (!gp) continue;
        
        // Deadzone helper
        const applyDeadzone = (val: number, deadzone: number = 0.05) => Math.abs(val) < deadzone ? 0 : val;

        const axes = gp.axes;
        if (axes.length >= 4) {
           gpYaw += applyDeadzone(axes[0]);
           gpThrottle -= applyDeadzone(axes[1]); // Invert Y (stick up is negative)
           gpRoll -= applyDeadzone(axes[2]);     // Right stick X (right is positive, we want -1 for right)
           gpPitch += applyDeadzone(axes[3]);    // Right stick Y (up is negative, we want -1 for forward)
        }

        // Map standard buttons
        // Button 0 (A/Cross): Hover Assist
        if (gp.buttons[0]?.pressed && !this.gpButtonStates[0]) {
           this.hoverAssistActive = !this.hoverAssistActive;
        }
        // Button 1 (B/Circle) or Button 3 (Y/Triangle): Camera Toggle
        if ((gp.buttons[1]?.pressed && !this.gpButtonStates[1]) || (gp.buttons[3]?.pressed && !this.gpButtonStates[3])) {
           this.triggerCameraToggle = true;
        }
        // Button 2 (X/Square): Reset
        if (gp.buttons[2]?.pressed && !this.gpButtonStates[2]) {
           this.triggerReset = true;
        }
        
        for (let b = 0; b < gp.buttons.length; b++) {
           this.gpButtonStates[b] = gp.buttons[b].pressed;
        }
        break; // Only use the first active controller
      }
    }
    // Combine Keyboard + Touch with priority clamp
    const throttle = Math.max(-1, Math.min(1, kbThrottle + this.touchThrottle + gpThrottle));
    const pitch = Math.max(-1, Math.min(1, kbPitch + this.touchPitch + gpPitch));
    const roll = Math.max(-1, Math.min(1, kbRoll + this.touchRoll + gpRoll));
    const yaw = Math.max(-1, Math.min(1, kbYaw + this.touchYaw + gpYaw));

    // Slew-rate filtering: eliminate abrupt 1-frame acceleration spikes
    const slewRate = 18.0;
    const safeDt = Math.min(0.05, Math.max(0.001, dt));
    const alpha = Math.min(1.0, safeDt * slewRate);

    this.smoothedPitch += (pitch - this.smoothedPitch) * alpha;
    this.smoothedRoll += (roll - this.smoothedRoll) * alpha;
    this.smoothedYaw += (yaw - this.smoothedYaw) * alpha;
    this.smoothedThrottle += (throttle - this.smoothedThrottle) * alpha;

    const reset = this.triggerReset;
    this.triggerReset = false;

    const cameraToggle = this.triggerCameraToggle;
    this.triggerCameraToggle = false;

    return {
      throttle: Math.abs(this.smoothedThrottle) < 0.001 ? 0 : this.smoothedThrottle,
      pitch: Math.abs(this.smoothedPitch) < 0.001 ? 0 : this.smoothedPitch,
      roll: Math.abs(this.smoothedRoll) < 0.001 ? 0 : this.smoothedRoll,
      yaw: Math.abs(this.smoothedYaw) < 0.001 ? 0 : this.smoothedYaw,
      hoverHold: this.hoverAssistActive,
      reset,
      cameraToggle,
    };
  }
}
