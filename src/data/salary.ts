import type { ModelData, UserPlayer, PlayerLevel, RegressionModel } from './types';

type UserPlayerInput = Omit<
  UserPlayer,
  'x' | 'y' | 'z' | 'neighbors' | 'expectedSalaryLow' | 'expectedSalaryHigh' | 'expectedSalaryMid' | 'createdAt'
>;

const LEVEL_MULTIPLIER: Record<PlayerLevel, number> = {
  Recreational: 0.001,
  'High School': 0.01,
  'College D2': 0.05,
  'College D1': 0.15,
  'Semi-Pro': 0.5,
  Pro: 1.0,
};

function dot(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += a[i] * b[i];
  return sum;
}

function pickModel(user: UserPlayerInput, model: ModelData): RegressionModel {
  const hasPpg = user.ppg !== undefined && user.ppg !== null;
  const hasPhysical =
    user.heightCm !== undefined ||
    user.weightKg !== undefined ||
    user.vertInches !== undefined ||
    user.wingspanInches !== undefined;

  if (hasPpg && hasPhysical) return model.fullModel;
  if (hasPpg) return model.scoringModel;
  return model.physicalModel;
}

function buildSubVector(features: number[], featureNames: string[], modelFeatureNames: string[]): number[] {
  return modelFeatureNames.map((name) => {
    const idx = featureNames.indexOf(name);
    return idx >= 0 ? features[idx] : 0;
  });
}

export function estimateSalary(
  user: UserPlayerInput,
  features: number[],
  model: ModelData,
): { low: number; mid: number; high: number } {
  const regressionModel = pickModel(user, model);

  // Extract only the features this sub-model uses
  const subFeatures = buildSubVector(features, model.featureNames, regressionModel.featureNames);

  // salary_pct = dot(subFeatures, coefficients) + intercept
  const salaryPct = dot(subFeatures, regressionModel.coefficients) + regressionModel.intercept;

  // Convert to USD
  const rawUsd = salaryPct * model.currentCapUsd;

  // Apply level discount
  const levelMultiplier = LEVEL_MULTIPLIER[user.level];
  const discountedUsd = rawUsd * levelMultiplier;

  // Clamp to [0, currentCapUsd * 0.35]
  const maxSalary = model.currentCapUsd * 0.35;
  const mid = Math.max(0, Math.min(discountedUsd, maxSalary));

  return {
    low: mid * 0.7,
    mid,
    high: mid * 1.3,
  };
}
