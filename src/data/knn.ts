import type { Player, PlayersData, ModelData, Position } from './types';

export function findKNN(
  queryFeatures: number[],
  allPlayers: Player[],
  allFeatureVectors: number[][],
  k: number,
): number[] {
  const n = allPlayers.length;
  const distances: { idx: number; dist: number }[] = new Array(n);

  for (let i = 0; i < n; i++) {
    const vec = allFeatureVectors[i];
    let dist = 0;
    for (let j = 0; j < queryFeatures.length; j++) {
      const diff = queryFeatures[j] - vec[j];
      dist += diff * diff;
    }
    distances[i] = { idx: i, dist };
  }

  distances.sort((a, b) => a.dist - b.dist);

  return distances.slice(0, k).map((d) => d.idx);
}

const POSITION_ONE_HOT: Record<Position, [number, number, number, number]> = {
  PG: [1, 0, 0, 0],
  SG: [0, 1, 0, 0],
  SF: [0, 0, 1, 0],
  PF: [0, 0, 0, 1],
  C:  [0, 0, 0, 0],
};

const ERA_MIN = 1946;
const ERA_MAX = 2025;

export function buildFeatureMatrix(data: PlayersData, model: ModelData): number[][] {
  const n = data.ids.length;
  const featureNames = model.featureNames;
  const matrix: number[][] = new Array(n);

  for (let i = 0; i < n; i++) {
    const era_norm = (data.era[i] - ERA_MIN) / (ERA_MAX - ERA_MIN);
    const [is_pg, is_sg, is_sf, is_pf] = POSITION_ONE_HOT[data.position[i]];

    // Build the raw feature vector in featureNames order
    const pos = data.position[i];
    const is_c = pos === 'C' ? 1 : 0;
    const rawVec: Record<string, number> = {
      salary_pct: data.salaryPct[i],
      ppg: data.ppg[i],
      rpg: data.rpg[i],
      apg: data.apg[i],
      fg_pct: data.fgPct[i],
      three_pct: data.threePct[i],
      ft_pct: data.ftPct[i],
      per: data.per[i],
      ws: data.ws[i],
      bpm: data.bpm[i],
      is_pg,
      is_sg,
      is_sf,
      is_pf,
      is_c,
      era_norm,
      achievements: data.achievements[i],
    };

    // Map to the exact ordering declared in model.featureNames
    const features = featureNames.map((name) => rawVec[name] ?? 0);

    // z-score normalize
    const normalized = features.map((v, j) => {
      const std = model.pcaStd[j] === 0 ? 1 : model.pcaStd[j];
      return (v - model.pcaMean[j]) / std;
    });

    matrix[i] = normalized;
  }

  return matrix;
}
