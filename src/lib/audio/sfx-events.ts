/**
 * One-shot sound effects
 */
export class SFXEvents {
  private context: AudioContext;
  private destination: GainNode;

  constructor(context: AudioContext, destination: GainNode) {
    this.context = context;
    this.destination = destination;
  }

  private createWhiteNoiseBuffer(duration: number): AudioBuffer {
    const bufferSize = this.context.sampleRate * duration;
    const buffer = this.context.createBuffer(1, bufferSize, this.context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public playCrash() {
    const t = this.context.currentTime;
    
    // 1. Heavy Low-Frequency Thud (Impact)
    const thudDuration = 0.4;
    const thudOsc = this.context.createOscillator();
    thudOsc.type = 'sine';
    thudOsc.frequency.setValueAtTime(150, t);
    thudOsc.frequency.exponentialRampToValueAtTime(30, t + thudDuration);
    
    const thudGain = this.context.createGain();
    thudGain.gain.setValueAtTime(1.0, t);
    thudGain.gain.exponentialRampToValueAtTime(0.01, t + thudDuration);
    
    thudOsc.connect(thudGain);
    thudGain.connect(this.destination);
    
    thudOsc.start(t);
    thudOsc.stop(t + thudDuration);

    // 2. High-Frequency Crunch/Snap (Breaking plastic/carbon fiber)
    const noiseDuration = 0.25;
    const noiseBuffer = this.createWhiteNoiseBuffer(noiseDuration);
    const noiseSource = this.context.createBufferSource();
    noiseSource.buffer = noiseBuffer;
    
    const noiseFilter = this.context.createBiquadFilter();
    noiseFilter.type = 'highpass';
    noiseFilter.frequency.value = 2000; // Let only sharp snaps through
    
    const noiseGain = this.context.createGain();
    noiseGain.gain.setValueAtTime(0.8, t);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, t + noiseDuration);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(this.destination);
    
    noiseSource.start(t);
    
    // Cleanup
    setTimeout(() => {
      try {
        thudOsc.disconnect();
        thudGain.disconnect();
        noiseSource.disconnect();
        noiseFilter.disconnect();
        noiseGain.disconnect();
      } catch (e) {}
    }, (thudDuration + 0.1) * 1000);
  }

  public playMotorStart() {
    const t = this.context.currentTime;
    const duration = 0.5;
    
    const osc = this.context.createOscillator();
    osc.type = 'sawtooth';
    
    // Sweep from 60Hz to 120Hz
    osc.frequency.setValueAtTime(60, t);
    osc.frequency.exponentialRampToValueAtTime(120, t + duration);
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.1, t + duration * 0.5);
    gain.gain.linearRampToValueAtTime(0, t + duration);
    
    osc.connect(gain);
    gain.connect(this.destination);
    
    osc.start(t);
    osc.stop(t + duration);
    
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (duration + 0.1) * 1000);
  }

  public playAltitudeWarning() {
    const t = this.context.currentTime;
    const duration = 0.15;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 800;
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.2, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    osc.connect(gain);
    gain.connect(this.destination);
    
    osc.start(t);
    osc.stop(t + duration);
    
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (duration + 0.1) * 1000);
  }

  public playUIClick() {
    const t = this.context.currentTime;
    const duration = 0.05;
    
    const osc = this.context.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 1200;
    
    const gain = this.context.createGain();
    gain.gain.setValueAtTime(0.1, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + duration);
    
    osc.connect(gain);
    gain.connect(this.destination);
    
    osc.start(t);
    osc.stop(t + duration);
    
    setTimeout(() => {
      osc.disconnect();
      gain.disconnect();
    }, (duration + 0.1) * 1000);
  }
}
