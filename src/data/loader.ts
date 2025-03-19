import { get, set, del } from 'idb-keyval';
import type { PlayersData, ModelData, Player } from './types';

const KEY_PLAYERS = 'nba-players-v1';
const KEY_MODEL = 'nba-model-v1';

export async function loadData(): Promise<{ players: PlayersData; model: ModelData }> {
  const [cachedPlayers, cachedModel] = await Promise.all([
    get<PlayersData>(KEY_PLAYERS),
    get<ModelData>(KEY_MODEL),
  ]);

  if (cachedPlayers !== undefined && cachedModel !== undefined) {
    return { players: cachedPlayers, model: cachedModel };
  }

  const [playersRes, modelRes] = await Promise.all([
    fetch('/data/players.json'),
    fetch('/data/model.json'),
  ]);

  if (!playersRes.ok) throw new Error(`Failed to fetch players.json: ${playersRes.status}`);
  if (!modelRes.ok) throw new Error(`Failed to fetch model.json: ${modelRes.status}`);

  const [players, model] = await Promise.all([
    playersRes.json() as Promise<PlayersData>,
    modelRes.json() as Promise<ModelData>,
  ]);

  await Promise.all([
    set(KEY_PLAYERS, players),
    set(KEY_MODEL, model),
  ]);

  return { players, model };
}

export function getAtlasTexture(index: number): string {
  return `/data/atlases/atlas-${index}.webp`;
}

export async function clearCache(): Promise<void> {
  await Promise.all([del(KEY_PLAYERS), del(KEY_MODEL)]);
}

export function buildPlayerIndex(data: PlayersData): Player[] {
  const count = data.ids.length;
  const players: Player[] = new Array(count);

  for (let i = 0; i < count; i++) {
    const rawNeighbors = data.neighbors.slice(i * 10, i * 10 + 10);
    const neighbors = rawNeighbors.filter((n) => n > -1);

    players[i] = {
      idx: i,
      id: data.ids[i],
      name: data.names[i],
      x: data.x[i],
      y: data.y[i],
      z: data.z[i],
      salaryBest: data.salaryBest[i],
      salaryDelta: data.salaryDelta[i],
      salaryPct: data.salaryPct[i],
      position: data.position[i],
      era: data.era[i],
      team: data.team[i],
      ppg: data.ppg[i],
      rpg: data.rpg[i],
      apg: data.apg[i],
      fgPct: data.fgPct[i],
      threePct: data.threePct[i],
      ftPct: data.ftPct[i],
      per: data.per[i],
      ws: data.ws[i],
      bpm: data.bpm[i],
      achievements: data.achievements[i],
      allStarCount: data.allStarCount[i],
      mvpCount: data.mvpCount[i],
      rings: data.rings[i],
      neighbors,
      atlasIndex: data.atlasIndex[i],
      atlasUv: [data.atlasUvX[i], data.atlasUvY[i], data.atlasUvW[i], data.atlasUvH[i]],
      nbaId: data.nbaId[i],
    };
  }

  return players;
}
