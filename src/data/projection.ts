import type { ModelData, UserPlayer, PlayerLevel, Position } from './types';

export function featuresToCoords(
  features: number[],
  model: ModelData,
): [number, number, number] {
  const n = features.length;

  // z-score normalize: (features - pcaMean) / pcaStd
  const normalized = new Array<number>(n);
  for (let j = 0; j < n; j++) {
    const std = model.pcaStd[j] === 0 ? 1 : model.pcaStd[j];
    normalized[j] = (features[j] - model.pcaMean[j]) / std;
  }

  // Multiply by pcaW^T: pcaW is [3, n_features], so result[k] = dot(pcaW[k], normalized)
  const coords: [number, number, number] = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += model.pcaW[k][j] * normalized[j];
    }
    coords[k] = sum;
  }

  return coords;
}

const LEVEL_DISCOUNT: Record<PlayerLevel, number> = {
  Recreational: 0.01,
  'High School': 0.05,
  'College D2': 0.1,
  'College D1': 0.2,
  'Semi-Pro': 0.5,
  Pro: 1.0,
};

type UserPlayerInput = Omit<
  UserPlayer,
  'x' | 'y' | 'z' | 'neighbors' | 'expectedSalaryLow' | 'expectedSalaryHigh' | 'expectedSalaryMid' | 'createdAt'
>;

export function buildUserFeatureVector(user: UserPlayerInput): number[] {
  // Feature order must match model.featureNames exactly.
  // Based on the pipeline the 18 features are:
  // 0:  ppg
  // 1:  rpg
  // 2:  apg
  // 3:  fg_pct
  // 4:  three_pct
  // 5:  ft_pct
  // 6:  per
  // 7:  ws
  // 8:  bpm
  // 9:  achievements
  // 10: salary_pct
  // 11: era_norm
  // 12: height_cm
  // 13: weight_kg
  // 14: is_pg
  // 15: is_sg
  // 16: is_sf
  // 17: is_pf
  // (is_c is the reference category — all zeros means C)

  const discount = LEVEL_DISCOUNT[user.level];
  const ppgScaled = (user.ppg ?? 0) * discount;

  // era_norm for a current-era user
  const ERA_MIN = 1946;
  const ERA_MAX = 2025;
  const era_norm = (2024 - ERA_MIN) / (ERA_MAX - ERA_MIN);

  const positionOneHot: Record<Position, [number, number, number, number, number]> = {
    PG: [1, 0, 0, 0, 0],
    SG: [0, 1, 0, 0, 0],
    SF: [0, 0, 1, 0, 0],
    PF: [0, 0, 0, 1, 0],
    C:  [0, 0, 0, 0, 1],
  };
  const [is_pg, is_sg, is_sf, is_pf, is_c] = positionOneHot[user.position];

  // Feature order must match model.featureNames exactly:
  // salary_pct, ppg, rpg, apg, fg_pct, three_pct, ft_pct, per, ws, bpm,
  // is_pg, is_sg, is_sf, is_pf, is_c, era_norm, achievements
  return [
    0,                  // salary_pct — unknown
    ppgScaled,          // ppg (level-discounted)
    0,                  // rpg — unknown
    0,                  // apg — unknown
    user.fgPct ?? 0,    // fg_pct
    user.threePct ?? 0, // three_pct
    user.ftPct ?? 0,    // ft_pct
    0,                  // per — not computable
    0,                  // ws — not computable
    0,                  // bpm — not computable
    is_pg,
    is_sg,
    is_sf,
    is_pf,
    is_c,
    era_norm,
    0,                  // achievements — user hasn't played NBA
  ];
}
