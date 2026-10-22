// ==========================================================
// DRONE PILOT — DETERMINISTIC PSEUDO-RANDOM NUMBER GENERATOR (PHASE 7)
// Mulberry32 32-bit stateful PRNG for reproducible scenario simulations
// (wind gusts, turbulence stochasticity, sensor noise, failure triggers).
// ==========================================================

export class DeterministicRNG {
  private state: number;

  constructor(seed: number = 1337) {
    this.state = seed | 0;
  }

  public setSeed(seed: number): void {
    this.state = seed | 0;
  }

  /**
   * Generates a deterministic float in the interval [0, 1).
   */
  public next(): number {
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /**
   * Generates a deterministic float in range [min, max).
   */
  public range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  /**
   * Generates a deterministic Gaussian-distributed float (Box-Muller transform)
   * with mean 0 and standard deviation 1.
   */
  public gaussian(mean = 0, stdDev = 1): number {
    const u1 = Math.max(1e-7, this.next());
    const u2 = this.next();
    const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
    return mean + z0 * stdDev;
  }
}

// Global default instance
export const globalRNG = new DeterministicRNG(42);
