import { describe, it, expect } from 'vitest';
import { selectDietMethod } from '../diet-selector.js';

describe('selectDietMethod', () => {
  it('blocks fasting and keto for pregnancy', () => {
    const r = selectDietMethod({
      age: 30,
      flags: { pregnant: true },
      activityLevel: 'light',
      dailyActivityMinutes: 30,
      wantsFastResults: true,
    });
    expect(r.method).toBe('mediterranean');
  });

  it('blocks fasting for ED history', () => {
    const r = selectDietMethod({
      age: 30,
      flags: { ed_history: true },
      activityLevel: 'moderate',
      dailyActivityMinutes: 60,
      wantsFastResults: true,
    });
    expect(r.method).toBe('mediterranean');
  });

  it('recommends walking-only for elderly', () => {
    const r = selectDietMethod({
      age: 65,
      flags: {},
      activityLevel: 'light',
      dailyActivityMinutes: 30,
    });
    expect(r.method).toBe('walking_only');
  });

  it('recommends fasting + calisthenics for healthy fast-results seeker', () => {
    const r = selectDietMethod({
      age: 30,
      flags: {},
      activityLevel: 'moderate',
      dailyActivityMinutes: 45,
      mealTimes: { breakfast: '12:00', dinner: '19:00' },
      wantsFastResults: true,
    });
    expect(r.method).toBe('mediterranean_if_calisthenics');
    expect(r.fastingWindow).toBeDefined();
  });

  it('defaults to mediterranean+calisthenics', () => {
    const r = selectDietMethod({
      age: 30,
      flags: {},
      activityLevel: 'light',
      dailyActivityMinutes: 30,
    });
    expect(r.method).toBe('mediterranean_calisthenics');
  });

  it('honors explicit keto when safe', () => {
    const r = selectDietMethod({
      age: 30,
      flags: {},
      activityLevel: 'moderate',
      dailyActivityMinutes: 30,
      explicitlyRequestedKeto: true,
    });
    expect(r.method).toBe('keto');
    expect(r.reviewEveryMonths).toBe(6);
  });

  it('refuses keto when contraindicated', () => {
    const r = selectDietMethod({
      age: 30,
      flags: { kidney: true },
      activityLevel: 'moderate',
      dailyActivityMinutes: 30,
      explicitlyRequestedKeto: true,
    });
    expect(r.method).not.toBe('keto');
  });
});
