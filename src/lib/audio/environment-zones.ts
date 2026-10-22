import { REGION_LIST } from '@/lib/world/region-definitions';
import { getDistanceToCoast } from '@/lib/world/coastline-math';

/**
 * Zone-based ambient audio with crossfading and proximity gating
 */
export type ZoneType = 'forest' | 'city' | 'coast' | 'river' | 'mountain' | 'industrial' | 'default';

interface ZoneAudioNode {
  source: AudioBufferSourceNode | null;
  filter: BiquadFilterNode;
  gain: GainNode;
  maxGain: number;
}

export class EnvironmentZoneAudio {
  private context: AudioContext;
  private destination: GainNode;
  
  private zones: Record<ZoneType, ZoneAudioNode>;
  private waterfallNode: ZoneAudioNode;
  private readonly WATERFALL_POS = { x: -260, z: -205 };
  private isPlaying: boolean = false;
  
  private currentZone: ZoneType = 'default';
  
  // For LFO
  private lfoOscillator: OscillatorNode | null = null;
  private lfoGain: GainNode | null = null;

  constructor(context: AudioContext, destination: GainNode) {
    this.context = context;
    this.destination = destination;

    this.zones = {
      forest: this.createZoneNode('bandpass', 275, 1.0, 0.04), // 150-400Hz center ~275
      city: this.createZoneNode('lowpass', 200, 1.0, 0.05),
      coast: this.createZoneNode('bandpass', 350, 0.5, 0.06), // 100-600 center 350
      river: this.createZoneNode('bandpass', 800, 1.0, 0.05), // 400-1200 center ~800
      mountain: this.createZoneNode('highpass', 800, 1.0, 0.03),
      industrial: this.createZoneNode('lowpass', 150, 1.0, 0.04),
      default: this.createZoneNode('lowpass', 100, 1.0, 0.01)
    };

    // Positional cascade waterfall roar node
    this.waterfallNode = this.createZoneNode('bandpass', 520, 0.8, 0.08);

    // Setup LFO for coast
    this.setupCoastLFO();
  }
  
  private createZoneNode(filterType: BiquadFilterType, freq: number, q: number, maxGain: number): ZoneAudioNode {
    const filter = this.context.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = freq;
    if (filterType !== 'lowpass' && filterType !== 'highpass') {
        filter.Q.value = q;
    }

    const gain = this.context.createGain();
    gain.gain.value = 0;
    
    filter.connect(gain);
    gain.connect(this.destination);

    return {
      source: null,
      filter,
      gain,
      maxGain
    };
  }
  
  private setupCoastLFO() {
    this.lfoOscillator = this.context.createOscillator();
    this.lfoOscillator.type = 'sine';
    this.lfoOscillator.frequency.value = 0.1; // 10s period for waves
    
    this.lfoGain = this.context.createGain();
    this.lfoGain.gain.value = 0.5; // Amplitude of modulation
    
    this.lfoOscillator.connect(this.lfoGain);
    
    // Create a node to hold base gain + LFO
    // Actually, simpler: route LFO to gain.gain of coast
    // gain.gain accepts audio rate, but we need base + LFO.
    // Web audio API allows connecting to AudioParam.
    // The signal is baseGain + lfoSignal
    // We'll manage it manually or with an intermediate node.
    // For simplicity, we just use the API where connection adds to value.
    // The coast gain value will be the base (e.g. 0.5) and LFO adds +/- 0.5.
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
    
    const noiseBuffer = this.createWhiteNoiseBuffer(3);
    
    Object.keys(this.zones).forEach((key) => {
      const zoneType = key as ZoneType;
      const zone = this.zones[zoneType];
      
      const source = this.context.createBufferSource();
      source.buffer = noiseBuffer;
      source.loop = true;
      source.connect(zone.filter);
      source.start();
      
      zone.source = source;
    });

    // Start positional waterfall audio source
    const wfSource = this.context.createBufferSource();
    wfSource.buffer = noiseBuffer;
    wfSource.loop = true;
    wfSource.connect(this.waterfallNode.filter);
    wfSource.start();
    this.waterfallNode.source = wfSource;

    if (this.lfoOscillator && this.lfoGain) {
       this.lfoGain.connect(this.zones.coast.gain.gain);
       this.lfoOscillator.start();
    }

    this.isPlaying = true;
  }

  public stop() {
    if (!this.isPlaying) return;
    
    Object.keys(this.zones).forEach((key) => {
      const zoneType = key as ZoneType;
      const zone = this.zones[zoneType];
      if (zone.source) {
        zone.source.stop();
        zone.source.disconnect();
        zone.source = null;
      }
    });

    if (this.waterfallNode.source) {
      this.waterfallNode.source.stop();
      this.waterfallNode.source.disconnect();
      this.waterfallNode.source = null;
    }

    if (this.lfoOscillator) {
        this.lfoOscillator.stop();
        this.lfoOscillator.disconnect();
        this.lfoOscillator = null;
    }
    if (this.lfoGain) {
        this.lfoGain.disconnect();
        this.lfoGain = null;
    }

    this.isPlaying = false;
  }
  
  private determineZone(x: number, z: number): ZoneType {
    // Check against REGION_LIST bounds
    for (const region of REGION_LIST) {
        if (x >= region.bounds.minX && x <= region.bounds.maxX &&
            z >= region.bounds.minZ && z <= region.bounds.maxZ) {
            
            // Map region categories to zone types
            if (region.category === 'nature') return 'forest';
            if (region.category === 'urban') return 'city';
            if (region.category === 'logistics') return 'industrial';
            if (region.category === 'maritime' || region.category === 'ocean') return 'coast';
            if (region.category === 'freshwater') return 'river';
            if (region.category === 'highlands') return 'mountain';
            return 'default';
        }
    }
    return 'default';
  }

  public update(droneX: number, droneZ: number, droneY = 10) {
    if (!this.isPlaying) return;

    const t = this.context.currentTime;
    const newZone = this.determineZone(droneX, droneZ);

    if (newZone !== this.currentZone) {
      this.currentZone = newZone;
      const crossfadeDuration = 2.0;

      Object.keys(this.zones).forEach((key) => {
        const zoneType = key as ZoneType;
        const zone = this.zones[zoneType];
        // Ambient background zones (non-water) crossfade normally
        if (zoneType !== 'coast' && zoneType !== 'river') {
          if (zoneType === newZone) {
            zone.gain.gain.setTargetAtTime(zone.maxGain, t, crossfadeDuration / 3);
          } else {
            zone.gain.gain.setTargetAtTime(0, t, crossfadeDuration / 3);
          }
        }
      });
    }

    // 1. PROXIMITY-GATED OCEAN SURF
    // Water sound only comes when drone is actually close to the shoreline (< 25m) and low altitude (< 20m)
    const distToCoast = getDistanceToCoast(droneX, droneZ);
    const isNearShore = distToCoast < 25;
    const isLowAltitude = droneY < 20;

    let targetCoastGain = 0;
    if (isNearShore && isLowAltitude) {
      const proximityFactor = Math.max(0, 1.0 - Math.max(0, distToCoast) / 25.0);
      const altFactor = Math.max(0, 1.0 - droneY / 20.0);
      targetCoastGain = proximityFactor * altFactor * this.zones.coast.maxGain;
    }
    this.zones.coast.gain.gain.setTargetAtTime(targetCoastGain, t, 0.2);
    if (this.lfoGain) {
      this.lfoGain.gain.setTargetAtTime(targetCoastGain * 0.8, t, 0.2);
    }

    // 2. PROXIMITY-GATED RIVER & FRESHWATER
    // Only audible when drone is within 25m of river corridor or lake and low altitude (< 18m)
    let distToFreshwater = 9999;
    const distToLake = Math.hypot(droneX - (-320), droneZ - (-260));
    if (distToLake < 130) {
      distToFreshwater = Math.min(distToFreshwater, Math.max(0, distToLake - 100));
    }
    if (droneZ > -220 && droneZ < 960 && droneX > -380 && droneX < 80) {
      const pZ = (droneZ + 220) / (960 + 220);
      const riverX = -270 + pZ * 190 + Math.sin(pZ * Math.PI * 2.5) * 45 + Math.cos(pZ * Math.PI * 6.0) * 8;
      const dRiver = Math.abs(droneX - riverX);
      distToFreshwater = Math.min(distToFreshwater, dRiver);
    }

    let targetRiverGain = 0;
    if (distToFreshwater < 25 && droneY < 18) {
      const proximityFactor = Math.max(0, 1.0 - distToFreshwater / 25.0);
      const altFactor = Math.max(0, 1.0 - droneY / 18.0);
      targetRiverGain = proximityFactor * altFactor * this.zones.river.maxGain;
    }
    this.zones.river.gain.gain.setTargetAtTime(targetRiverGain, t, 0.2);

    // 3. POSITIONAL WATERFALL ROAR (Close proximity only < 38m)
    const distW = Math.hypot(droneX - this.WATERFALL_POS.x, droneZ - this.WATERFALL_POS.z);
    if (distW < 38 && droneY < 32) {
      const falloff = Math.max(0, 1.0 - distW / 38.0) * Math.max(0, 1.0 - droneY / 32.0);
      const targetGain = Math.pow(falloff, 1.6) * this.waterfallNode.maxGain;
      this.waterfallNode.gain.gain.setTargetAtTime(targetGain, t, 0.15);
    } else {
      this.waterfallNode.gain.gain.setTargetAtTime(0, t, 0.15);
    }
  }
}

