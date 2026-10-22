/**
 * DRONE PILOT — HIGH-FIDELITY MULTIROTOR MOTOR & PROP AUDIO
 * Synthesizes true Blade Passing Frequency (BPF) harmonics, multi-rotor beating chorus,
 * turbulent rotor wash air chop, and immediate silence when disarmed or landed.
 */
export class DroneAudio {
  private context: AudioContext;
  private destination: GainNode;
  private masterGain: GainNode;

  // Motor harmonics (BPF 1x, 2x, 3x, 4x) with chorus detuning
  private motorOscs: OscillatorNode[] = [];
  private motorGains: GainNode[] = [];
  private motorFilter: BiquadFilterNode;

  // Turbulent Prop Wash Air Chop Noise
  private washNoiseSource: AudioBufferSourceNode | null = null;
  private washFilter: BiquadFilterNode;
  private washGain: GainNode;

  private isPlaying: boolean = false;

  constructor(context: AudioContext, destination: GainNode) {
    this.context = context;
    this.destination = destination;

    this.masterGain = this.context.createGain();
    this.masterGain.gain.value = 0;

    // 1. Motor Electrical & Blade Passing Whine
    this.motorFilter = this.context.createBiquadFilter();
    this.motorFilter.type = 'lowpass';
    this.motorFilter.frequency.value = 350;
    this.motorFilter.connect(this.masterGain);

    // 4 harmonic partials with subtle multi-rotor phase beating
    const harmonicRatios = [1.0, 2.0, 3.0, 4.0];
    const detuneOffsets = [0, 1.2, -1.8, 2.4]; // Hz detuning creates authentic quadcopter rotor chorus

    harmonicRatios.forEach((mult, index) => {
      const osc = this.context.createOscillator();
      osc.type = index === 0 ? 'sawtooth' : index === 1 ? 'triangle' : 'sine';
      osc.frequency.value = 130 * mult + detuneOffsets[index];

      const gain = this.context.createGain();
      gain.gain.value = 0;

      osc.connect(gain);
      gain.connect(this.motorFilter);

      this.motorOscs.push(osc);
      this.motorGains.push(gain);
    });

    // 2. Prop Wash Air Turbulence (Filtered White Noise)
    this.washFilter = this.context.createBiquadFilter();
    this.washFilter.type = 'bandpass';
    this.washFilter.frequency.value = 450;
    this.washFilter.Q.value = 1.8;

    this.washGain = this.context.createGain();
    this.washGain.gain.value = 0;

    this.washFilter.connect(this.washGain);
    this.washGain.connect(this.masterGain);

    this.masterGain.connect(this.destination);
  }

  private createWhiteNoiseBuffer(duration = 2.0): AudioBuffer {
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

    this.motorOscs.forEach((osc) => osc.start());

    // Loop noise for turbulent rotor downwash air
    const noiseBuf = this.createWhiteNoiseBuffer(3.0);
    this.washNoiseSource = this.context.createBufferSource();
    this.washNoiseSource.buffer = noiseBuf;
    this.washNoiseSource.loop = true;
    this.washNoiseSource.connect(this.washFilter);
    this.washNoiseSource.start();

    this.isPlaying = true;
  }

  public stop() {
    if (!this.isPlaying) return;

    this.motorOscs.forEach((osc) => {
      try { osc.stop(); } catch {}
    });
    if (this.washNoiseSource) {
      try { this.washNoiseSource.stop(); } catch {}
      this.washNoiseSource = null;
    }
    this.isPlaying = false;
  }

  /**
   * Updates motor audio based on aircraft RPM, throttle load, and armed state.
   */
  public update(
    throttle: number,
    rpm = 0,
    speed = 0,
    isArmed = true,
    flightMode = 'HOVER'
  ) {
    if (!this.isPlaying) return;

    const t = this.context.currentTime;
    const tc = 0.04;

    // Zero sound when disarmed or landed with zero RPM
    if (!isArmed || flightMode === 'LANDED' || (throttle <= 0.02 && rpm < 200)) {
      this.masterGain.gain.setTargetAtTime(0, t, 0.08);
      return;
    }

    // Blade Passing Frequency: 2-blade prop at 2500 - 5800 RPM = 83Hz - 193Hz fundamental
    const effectiveRpm = Math.max(1200, Math.min(6000, rpm > 0 ? rpm : 1500 + throttle * 4000));
    const baseBPF = (effectiveRpm / 60) * 2; // Fundamental blade passing frequency

    // Update harmonic oscillators
    const multipliers = [1.0, 2.0, 3.0, 4.0];
    const detuneOffsets = [0, 1.2, -1.8, 2.4];
    this.motorOscs.forEach((osc, idx) => {
      osc.frequency.setTargetAtTime(baseBPF * multipliers[idx] + detuneOffsets[idx], t, tc);
    });

    // Harmonic balance based on throttle
    this.motorGains[0].gain.setTargetAtTime(0.42 + throttle * 0.18, t, tc); // Fundamental body
    this.motorGains[1].gain.setTargetAtTime(0.25 + throttle * 0.25, t, tc); // 2nd harmonic bite
    this.motorGains[2].gain.setTargetAtTime(0.12 + throttle * 0.20, t, tc); // 3rd harmonic scream
    this.motorGains[3].gain.setTargetAtTime(0.06 + throttle * 0.15, t, tc); // 4th harmonic whine

    // Motor lowpass filter sweeps up with RPM (allows crisp drone buzz at full throttle)
    const cutoff = 400 + throttle * 2800;
    this.motorFilter.frequency.setTargetAtTime(cutoff, t, tc);

    // Prop wash air turbulence (whoosh noise) scales with throttle and airspeed
    const washFreq = 380 + throttle * 600;
    this.washFilter.frequency.setTargetAtTime(washFreq, t, tc);
    const washVolume = (0.04 + throttle * 0.16 + Math.min(speed / 120, 0.08));
    this.washGain.gain.setTargetAtTime(washVolume, t, tc);

    // Master volume: smooth rise from idle hover (0.05) to full thrust (0.16)
    const targetGain = 0.05 + throttle * 0.11;
    this.masterGain.gain.setTargetAtTime(targetGain, t, tc);
  }
}
