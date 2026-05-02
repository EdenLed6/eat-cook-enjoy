import { describe, it, expect } from 'vitest';
import { estimateKcalBurned, estimateStepsKcal } from '../workouts.js';

describe('estimateKcalBurned', () => {
  it('estimates 30 minute walk kcal for 70kg woman', () => {
    const k = estimateKcalBurned({ type: 'walk', durationMin: 30, weightKg: 70 });
    expect(k).toBeGreaterThan(100);
    expect(k).toBeLessThan(180);
  });
  it('intensity high increases kcal', () => {
    const low = estimateKcalBurned({ type: 'calisthenics', durationMin: 30, weightKg: 70, intensity: 'low' });
    const high = estimateKcalBurned({ type: 'calisthenics', durationMin: 30, weightKg: 70, intensity: 'high' });
    expect(high).toBeGreaterThan(low);
  });
  it('falls back to generic for unknown type', () => {
    const k = estimateKcalBurned({ type: 'martian-frisbee', durationMin: 30, weightKg: 70 });
    expect(k).toBeGreaterThan(0);
  });
});

describe('estimateStepsKcal', () => {
  it('returns 0 for 0 steps', () => {
    expect(estimateStepsKcal(0, 70)).toBe(0);
  });
  it('scales with steps', () => {
    const a = estimateStepsKcal(5000, 70);
    const b = estimateStepsKcal(10000, 70);
    expect(b).toBeGreaterThan(a);
  });
});
