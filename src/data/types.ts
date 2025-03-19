export type Position = 'PG' | 'SG' | 'SF' | 'PF' | 'C';

export type PlayerLevel =
  | 'Recreational'
  | 'High School'
  | 'College D2'
  | 'College D1'
  | 'Semi-Pro'
  | 'Pro';

// Columnar players.json layout — arrays parallel by index
export interface PlayersData {
  ids: string[];
  names: string[];
  x: number[];
  y: number[];
  z: number[];
  salaryBest: number[];      // raw best-year salary in USD
  salaryDelta: number[];     // (actual - expected) in USD, + = overpaid
  salaryPct: number[];       // best-year salary as % of that season's cap
  position: Position[];
  era: number[];             // season year (e.g. 1995)
  team: string[];
  ppg: number[];
  rpg: number[];
  apg: number[];
  fgPct: number[];
  threePct: number[];
  ftPct: number[];
  per: number[];
  ws: number[];
  bpm: number[];
  achievements: number[];    // composite score 0–1
  allStarCount: number[];
  mvpCount: number[];
  rings: number[];
  // flat array: player i's neighbors are neighbors[i*10 .. i*10+9]
  neighbors: number[];
  // atlas info
  atlasIndex: number[];
  atlasUvX: number[];
  atlasUvY: number[];
  atlasUvW: number[];
  atlasUvH: number[];
  // optional NBA player ID for CDN photo
  nbaId: (string | null)[];
}

// Single player (row-oriented, built at runtime from columnar data)
export interface Player {
  idx: number;
  id: string;
  name: string;
  x: number;
  y: number;
  z: number;
  salaryBest: number;
  salaryDelta: number;
  salaryPct: number;
  position: Position;
  era: number;
  team: string;
  ppg: number;
  rpg: number;
  apg: number;
  fgPct: number;
  threePct: number;
  ftPct: number;
  per: number;
  ws: number;
  bpm: number;
  achievements: number;
  allStarCount: number;
  mvpCount: number;
  rings: number;
  neighbors: number[];       // up to 10 neighbor indices
  atlasIndex: number;
  atlasUv: [number, number, number, number]; // x, y, w, h
  nbaId: string | null;
}

export interface ModelData {
  // PCA
  pcaW: number[][];          // shape [3, n_features]
  pcaMean: number[];
  pcaStd: number[];
  featureNames: string[];

  // Regression models
  fullModel: RegressionModel;
  scoringModel: RegressionModel;
  physicalModel: RegressionModel;

  // Era normalization
  eraNormTable: EraCapEntry[];

  // For salary output scaling
  currentCapUsd: number;     // current season salary cap in USD
  rmseFullModel: number;
  rmseScoringModel: number;
  rmsePhysicalModel: number;
}

export interface RegressionModel {
  featureNames: string[];
  coefficients: number[];
  intercept: number;
}

export interface EraCapEntry {
  season: number;
  capUsd: number;
}

// User-defined player (add-your-own)
export interface UserPlayer {
  id: string;                // uuid
  name: string;
  photoBase64?: string;

  // Physical inputs
  heightCm: number;
  weightKg: number;
  position: Position;
  vertInches?: number;
  wingspanInches?: number;
  hundredMeterSec?: number;

  // Scoring inputs
  ppg?: number;
  level: PlayerLevel;
  threePct?: number;
  fgPct?: number;
  ftPct?: number;

  // Computed at projection time
  x: number;
  y: number;
  z: number;
  neighbors: number[];
  expectedSalaryLow: number;
  expectedSalaryHigh: number;
  expectedSalaryMid: number;
  createdAt: number;
}

// Camera target for smooth navigation
export interface CameraTarget {
  x: number;
  y: number;
  z: number;
}
