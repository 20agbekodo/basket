import { useMemo, useCallback } from 'react';
import * as THREE from 'three';
import { usePlayersStore } from '../store/usePlayersStore';
import { useSceneStore } from '../store/useSceneStore';

export function NeighborLines() {
  const selectedIdx = useSceneStore((s) => s.selectedIdx);
  const allPlayers = usePlayersStore((s) => s.allPlayers);
  const setSelected = useSceneStore((s) => s.setSelected);
  const setCameraTarget = useSceneStore((s) => s.setCameraTarget);

  const selectedPlayer = selectedIdx !== null ? allPlayers[selectedIdx] : null;

  const { lineGeometry, neighbors } = useMemo(() => {
    if (!selectedPlayer) {
      return { lineGeometry: null, neighbors: [] };
    }

    const validNeighbors = selectedPlayer.neighbors.filter(
      (n) => n >= 0 && n < allPlayers.length,
    );

    const positions: number[] = [];
    for (const nIdx of validNeighbors) {
      const neighbor = allPlayers[nIdx];
      // Segment: selected → neighbor
      positions.push(selectedPlayer.x, selectedPlayer.y, selectedPlayer.z);
      positions.push(neighbor.x, neighbor.y, neighbor.z);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));

    return { lineGeometry: geo, neighbors: validNeighbors };
  }, [selectedPlayer, allPlayers]);

  const handleNeighborClick = useCallback(
    (neighborIdx: number) => {
      setSelected(neighborIdx);
      const p = allPlayers[neighborIdx];
      if (p) {
        setCameraTarget({ x: p.x, y: p.y, z: p.z + 15 });
      }
    },
    [allPlayers, setSelected, setCameraTarget],
  );

  if (!selectedPlayer || !lineGeometry) return null;

  return (
    <group>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#ffffff" opacity={0.4} transparent linewidth={1} />
      </lineSegments>

      {/* Invisible cylinder hit areas along each neighbor line */}
      {neighbors.map((nIdx) => {
        const neighbor = allPlayers[nIdx];
        const start = new THREE.Vector3(selectedPlayer.x, selectedPlayer.y, selectedPlayer.z);
        const end = new THREE.Vector3(neighbor.x, neighbor.y, neighbor.z);

        const mid = start.clone().lerp(end, 0.5);
        const length = start.distanceTo(end);
        const dir = end.clone().sub(start).normalize();

        // Quaternion to align cylinder (default Y-axis) with the line direction
        const up = new THREE.Vector3(0, 1, 0);
        const quaternion = new THREE.Quaternion().setFromUnitVectors(up, dir);

        return (
          <mesh
            key={nIdx}
            position={mid}
            quaternion={quaternion}
            onClick={() => handleNeighborClick(nIdx)}
          >
            <cylinderGeometry args={[0.15, 0.15, length, 6]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        );
      })}
    </group>
  );
}
