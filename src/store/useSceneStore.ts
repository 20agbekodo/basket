import { useRef, useEffect } from 'react';
import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

interface Vec3 {
  x: number;
  y: number;
  z: number;
}

interface SceneState {
  hoveredIdx: number | null;
  selectedIdx: number | null;
  cameraTarget: Vec3 | null;
  cameraPosition: Vec3;
}

interface SceneActions {
  setHovered: (idx: number | null) => void;
  setSelected: (idx: number | null) => void;
  setCameraTarget: (target: Vec3 | null) => void;
  setCameraPosition: (pos: Vec3) => void;
}

const DEFAULT_CAMERA_POSITION: Vec3 = { x: 0, y: 0, z: 50 };

export const useSceneStore = create<SceneState & SceneActions>()(
  subscribeWithSelector((set) => ({
    hoveredIdx: null,
    selectedIdx: null,
    cameraTarget: null,
    cameraPosition: DEFAULT_CAMERA_POSITION,

    setHovered: (idx) => set({ hoveredIdx: idx }),
    setSelected: (idx) => set({ selectedIdx: idx }),
    setCameraTarget: (target) => set({ cameraTarget: target }),
    setCameraPosition: (pos) => set({ cameraPosition: pos }),
  })),
);

/**
 * Returns a ref that tracks the latest scene store state without causing re-renders.
 * Useful in animation loops (e.g. useFrame) where reactive re-renders are wasteful.
 */
export function useTransientScene(): React.RefObject<SceneState & SceneActions> {
  const ref = useRef<SceneState & SceneActions>(useSceneStore.getState());

  useEffect(() => {
    const unsub = useSceneStore.subscribe((state) => {
      ref.current = state;
    });
    return unsub;
  }, []);

  return ref;
}
