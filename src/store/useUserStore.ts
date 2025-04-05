import { create } from 'zustand';
import { persist, type StorageValue } from 'zustand/middleware';
import { get, set, del } from 'idb-keyval';
import type { UserPlayer } from '../data/types';

type PersistedState = UserState & UserActions;

const idbStorage = {
  getItem: async (name: string): Promise<StorageValue<PersistedState> | null> => {
    return (await get<StorageValue<PersistedState>>(name)) ?? null;
  },
  setItem: async (name: string, value: StorageValue<PersistedState>): Promise<void> => {
    await set(name, value);
  },
  removeItem: async (name: string): Promise<void> => {
    await del(name);
  },
};

interface UserState {
  userPlayers: UserPlayer[];
}

interface UserActions {
  addUserPlayer: (p: UserPlayer) => void;
  removeUserPlayer: (id: string) => void;
  clearUserPlayers: () => void;
}

export const useUserStore = create<UserState & UserActions>()(
  persist(
    (set) => ({
      userPlayers: [],

      addUserPlayer: (p: UserPlayer) =>
        set((state) => ({ userPlayers: [...state.userPlayers, p] })),

      removeUserPlayer: (id: string) =>
        set((state) => ({
          userPlayers: state.userPlayers.filter((p) => p.id !== id),
        })),

      clearUserPlayers: () => set({ userPlayers: [] }),
    }),
    {
      name: 'nba-user-players-v1',
      storage: idbStorage,
    },
  ),
);
