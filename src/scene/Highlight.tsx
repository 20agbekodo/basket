import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useSceneStore } from '../store/useSceneStore';
import { usePlayersStore } from '../store/usePlayersStore';

export function Highlight() {
  const hoveredIdx = useSceneStore((s) => s.hoveredIdx);
  const selectedIdx = useSceneStore((s) => s.selectedIdx);
  const allPlayers = usePlayersStore((s) => s.allPlayers);

  const hoverRingRef = useRef<THREE.Mesh>(null);
  const timeRef = useRef(0);

  const hoveredPlayer = hoveredIdx !== null ? allPlayers[hoveredIdx] : null;
  const selectedPlayer = selectedIdx !== null ? allPlayers[selectedIdx] : null;

  useFrame((_state, delta) => {
    if (!hoverRingRef.current || !hoveredPlayer) return;
    timeRef.current += delta;
    const pulse = 1.0 + 0.15 * Math.sin(timeRef.current * 6);
    hoverRingRef.current.scale.setScalar(pulse);
  });

  return (
    <>
      {hoveredPlayer && (
        <mesh
          ref={hoverRingRef}
          position={[hoveredPlayer.x, hoveredPlayer.y, hoveredPlayer.z]}
          rotation={[0, 0, 0]}
        >
          <ringGeometry args={[0.8, 1.0, 32]} />
          <meshBasicMaterial color="#ffffff" side={THREE.DoubleSide} transparent opacity={0.85} depthWrite={false} />
        </mesh>
      )}

      {selectedPlayer && (
        <mesh
          position={[selectedPlayer.x, selectedPlayer.y, selectedPlayer.z]}
          rotation={[0, 0, 0]}
        >
          <ringGeometry args={[1.1, 1.35, 48]} />
          <meshBasicMaterial color="#ffff00" side={THREE.DoubleSide} transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}
    </>
  );
}
