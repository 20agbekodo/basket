import { create } from 'zustand';
import type { Player, PlayersData, Position } from '../data/types';
import { buildPlayerIndex } from '../data/loader';

interface Filters {
  topN: number;
  positions: Position[];
  eraRange: [number, number];
  teams: string[];
  search: string;
}

interface PlayersState {
  allPlayers: Player[];
  filteredIndices: Set<number>;
  filters: Filters;
  isLoading: boolean;
  error: string | null;
}

interface PlayersActions {
  loadPlayers: (data: PlayersData) => void;
  setFilter: (partial: Partial<Filters>) => void;
  recomputeFiltered: () => void;
}

const DEFAULT_FILTERS: Filters = {
  topN: 500,
  positions: [],
  eraRange: [1946, 2025],
  teams: [],
  search: '',
};

function computeFiltered(players: Player[], filters: Filters): Set<number> {
  const { topN, positions, eraRange, teams, search } = filters;

  // Step 1: topN — keep indices of top-N by salaryBest descending
  let topNSet: Set<number> | null = null;
  if (topN > 0) {
    const sorted = players
      .map((p) => p.idx)
      .sort((a, b) => players[b].salaryBest - players[a].salaryBest);
    topNSet = new Set(sorted.slice(0, topN));
  }

  const result = new Set<number>();

  for (const player of players) {
    const i = player.idx;

    // topN filter
    if (topNSet !== null && !topNSet.has(i)) continue;

    // positions filter
    if (positions.length > 0 && !positions.includes(player.position)) continue;

    // era range filter
    if (player.era < eraRange[0] || player.era > eraRange[1]) continue;

    // teams filter
    if (teams.length > 0 && !teams.includes(player.team)) continue;

    // search filter
    if (search.length > 0 && !player.name.toLowerCase().includes(search.toLowerCase())) continue;

    result.add(i);
  }

  return result;
}

export const usePlayersStore = create<PlayersState & PlayersActions>((set, get) => ({
  allPlayers: [],
  filteredIndices: new Set(),
  filters: DEFAULT_FILTERS,
  isLoading: false,
  error: null,

  loadPlayers: (data: PlayersData) => {
    const allPlayers = buildPlayerIndex(data);
    const filteredIndices = computeFiltered(allPlayers, DEFAULT_FILTERS);
    set({ allPlayers, filteredIndices, isLoading: false, error: null });
  },

  setFilter: (partial: Partial<Filters>) => {
    const filters = { ...get().filters, ...partial };
    const filteredIndices = computeFiltered(get().allPlayers, filters);
    set({ filters, filteredIndices });
  },

  recomputeFiltered: () => {
    const { allPlayers, filters } = get();
    const filteredIndices = computeFiltered(allPlayers, filters);
    set({ filteredIndices });
  },
}));
