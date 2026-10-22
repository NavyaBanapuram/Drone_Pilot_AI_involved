/**
 * Central audio engine using Web Audio API
 */
export class AudioManager {
  private static instance: AudioManager;
  
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  
  private channels: Record<string, GainNode> = {};
  
  private _isMuted: boolean = false;
  private previousMasterVolume: number = 1.0;

  private constructor() {}

  public static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager();
    }
    return AudioManager.instance;
  }

  public init() {
    if (this.context) return; // Already initialized

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) {
      console.warn('Web Audio API not supported in this browser');
      return;
    }

    this.context = new AudioContextClass();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    
    // Create channels
    this.channels['drone'] = this.context.createGain();
    this.channels['environment'] = this.context.createGain();
    this.channels['wildlife'] = this.context.createGain();
    this.channels['city'] = this.context.createGain();
    this.channels['water'] = this.context.createGain();
    this.channels['ui'] = this.context.createGain();
    this.channels['sfx'] = this.context.createGain();

    // Connect all channels to master
    for (const key in this.channels) {
      this.channels[key].connect(this.masterGain);
      this.channels[key].gain.value = 1.0;
    }

    this.setMasterVolume(1.0);
    
    if (this.context.state === 'suspended') {
      this.context.resume();
    }
  }

  public getContext(): AudioContext | null {
    return this.context;
  }

  public getChannel(name: string): GainNode | null {
    return this.channels[name] || null;
  }

  public setMasterVolume(v: number) {
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(v, this.context.currentTime, 0.05);
      if (!this._isMuted) {
        this.previousMasterVolume = v;
      }
    }
  }

  public setChannelVolume(channel: string, v: number) {
    if (this.channels[channel] && this.context) {
      this.channels[channel].gain.setTargetAtTime(v, this.context.currentTime, 0.05);
    }
  }

  public toggleMute(): boolean {
    this._isMuted = !this._isMuted;
    if (this._isMuted) {
      if (this.masterGain && this.context) {
        this.previousMasterVolume = this.masterGain.gain.value;
        this.masterGain.gain.setTargetAtTime(0, this.context.currentTime, 0.05);
      }
    } else {
      if (this.masterGain && this.context) {
        this.masterGain.gain.setTargetAtTime(this.previousMasterVolume, this.context.currentTime, 0.05);
      }
    }
    return this._isMuted;
  }

  public get isMuted(): boolean {
    return this._isMuted;
  }

  public update(dt: number, elapsed: number, listenerPos: { x: number; y: number; z: number }) {
    if (!this.context) return;
    // Update listener position for 3D spatial audio if needed
    // The Web Audio API Listener requires setting position
    const listener = this.context.listener;
    if (listener.positionX) {
      listener.positionX.setTargetAtTime(listenerPos.x, this.context.currentTime, 0.1);
      listener.positionY.setTargetAtTime(listenerPos.y, this.context.currentTime, 0.1);
      listener.positionZ.setTargetAtTime(listenerPos.z, this.context.currentTime, 0.1);
    } else {
      // Fallback for older browsers
      listener.setPosition(listenerPos.x, listenerPos.y, listenerPos.z);
    }
  }

  public dispose() {
    if (this.context) {
      this.context.close();
      this.context = null;
    }
  }
}
