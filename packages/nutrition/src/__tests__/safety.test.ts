import { describe, it, expect } from 'vitest';
import { safetyScreen } from '../safety-screen.js';

describe('safetyScreen', () => {
  it('blocks all aggressive options for pregnancy', () => {
    const r = safetyScreen({ age: 30, flags: { pregnant: true } });
    expect(r.fastingAllowed).toBe(false);
    expect(r.ketoAllowed).toBe(false);
    expect(r.highIntensityAllowed).toBe(false);
  });
  it('blocks keto for kidney issues', () => {
    const r = safetyScreen({ age: 30, flags: { kidney: true } });
    expect(r.ketoAllowed).toBe(false);
  });
  it('blocks high intensity for cardiac', () => {
    const r = safetyScreen({ age: 40, flags: { cardiac: true } });
    expect(r.highIntensityAllowed).toBe(false);
  });
  it('returns no reasons for healthy 30yo', () => {
    const r = safetyScreen({ age: 30, flags: {} });
    expect(r.reasons).toEqual([]);
    expect(r.fastingAllowed).toBe(true);
    expect(r.ketoAllowed).toBe(true);
  });
});
