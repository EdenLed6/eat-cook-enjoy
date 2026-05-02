const MET: Record<string, number> = {
  walk: 3.5,
  brisk_walk: 4.5,
  run: 9.8,
  cycle: 7.0,
  swim: 8.0,
  yoga: 3.0,
  pilates: 4.0,
  calisthenics: 5.5,
  weights: 5.0,
  hiit: 8.0,
  dance: 5.5,
  generic: 4.5,
};

export function estimateKcalBurned(input: {
  type: string;
  durationMin: number;
  weightKg: number;
  intensity?: string;
}): number {
  const baseMet = MET[input.type.toLowerCase()] ?? MET.generic!;
  let met = baseMet;
  if (input.intensity === 'low') met *= 0.85;
  else if (input.intensity === 'high') met *= 1.2;
  const hours = input.durationMin / 60;
  return Math.round(met * input.weightKg * hours);
}

export function estimateStepsKcal(steps: number, weightKg: number): number {
  const km = steps / 1300;
  const kcalPerKmPerKg = 0.7;
  return Math.round(km * kcalPerKmPerKg * weightKg);
}
