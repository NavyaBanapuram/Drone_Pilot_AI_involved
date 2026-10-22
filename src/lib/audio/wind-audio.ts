/**
 * Procedural wind using filtered noise
 */
export class WindAudio {
  private context: AudioContext;
  private destination: GainNode;
  
  private noiseSource: AudioBufferSourceNode | null = null;
  private filter: BiquadFilterNode;
  private masterGain: GainNode;
  
  private isPlaying: boolean = false;

  constructor(context: AudioContext, destination: GainNode) {
    this.context = context;
    this.destination = destination;

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0;
    
    this.filter = this.context.createBiquadFilter();
    this.filter.type = 'bandpass';
    this.filter.Q.value = 1.5;
    this.filter.frequency.value = 300;
    
    this.filter.connect(this.masterGain);
    this.masterGain.connect(this.destination);
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

  public start() {
    if (this.isPlaying) return;
    
    const noiseBuffer = this.createWhiteNoiseBuffer(2);
    this.noiseSource = this.context.createBufferSource();
    this.noiseSource.buffer = noiseBuffer;
    this.noiseSource.loop = true;
    
    this.noiseSource.connect(this.filter);
    this.noiseSource.start();
    
    this.isPlaying = true;
  }

  public stop() {
    if (!this.isPlaying || !this.noiseSource) return;
    this.noiseSource.stop();
    this.noiseSource.disconnect();
    this.noiseSource = null;
    this.isPlaying = false;
  }

  public update(altitude: number, speed: number, exposureFactor: number) {
    if (!this.isPlaying) return;
    
    const t = this.context.currentTime;
    const timeConstant = 0.1;

    // exposureFactor: 1.0 mountain/coast, 0.6 open field, 0.3 forest, 0.2 city
    // Base gain = 0.02 + altitude/250 * 0.06 + speed/30 * 0.04
    let targetGain = 0.02 + (altitude / 250) * 0.06 + (speed / 30) * 0.04;
    targetGain *= exposureFactor;
    
    // Clamp gain
    targetGain = Math.max(0, Math.min(targetGain, 0.1));

    this.masterGain.gain.setTargetAtTime(targetGain, t, timeConstant);

    // Filter frequency shifts with altitude (lower = deeper, higher = breathier)
    const targetFreq = 300 + (altitude / 200) * 500; // 300 to ~800Hz
    this.filter.frequency.setTargetAtTime(targetFreq, t, timeConstant);
  }
}
