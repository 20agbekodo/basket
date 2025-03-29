import { useRef, useEffect, useCallback } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import { usePlayersStore } from '../store/usePlayersStore';
import { useSceneStore, useTransientScene } from '../store/useSceneStore';
import { useUserStore } from '../store/useUserStore';

// Salary delta thresholds in USD
const DELTA_THRESHOLD = 1_000_000;
const DELTA_MAX = 20_000_000;

const COLOR_OVERPAID = new THREE.Color('#ff4444');
const COLOR_UNDERPAID = new THREE.Color('#44ff88');
const COLOR_NEUTRAL = new THREE.Color('#ffffff');
const COLOR_SELECTED = new THREE.Color('#ffff00');
const COLOR_HOVERED = new THREE.Color('#ffffff');

const _matrix = new THREE.Matrix4();
const _position = new THREE.Vector3();
const _scale = new THREE.Vector3();
const _quaternion = new THREE.Quaternion();
const _color = new THREE.Color();

function salaryDeltaColor(delta: number): THREE.Color {
  if (Math.abs(delta) < DELTA_THRESHOLD) return COLOR_NEUTRAL;
  const t = Math.min(Math.abs(delta) / DELTA_MAX, 1.0);
  if (delta > 0) return _color.clone().lerpColors(COLOR_NEUTRAL, COLOR_OVERPAID, t);
  return _color.clone().lerpColors(COLOR_NEUTRAL, COLOR_UNDERPAID, t);
}

// Canvas texture for salary delta label
function makeLabelTexture(text: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, 256, 64);
  ctx.fillStyle = 'rgba(0,0,0,0.55)';
  ctx.roundRect(4, 4, 248, 56, 8);
  ctx.fill();
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = text.startsWith('+') ? '#44ff88' : text.startsWith('-') ? '#ff6666' : '#ffffff';
  ctx.fillText(text, 128, 34);
  return new THREE.CanvasTexture(canvas);
}

function formatDelta(delta: number): string {
  const abs = Math.abs(delta);
  const sign = delta >= 0 ? '+' : '-';
  if (abs >= 1_000_000) return `${sign}$${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}$${(abs / 1_000).toFixed(0)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

export function PlayerCloud() {
  const allPlayers = usePlayersStore((s) => s.allPlayers);
  const filteredIndices = usePlayersStore((s) => s.filteredIndices);
  const setHovered = useSceneStore((s) => s.setHovered);
  const setSelected = useSceneStore((s) => s.setSelected);
  const setCameraTarget = useSceneStore((s) => s.setCameraTarget);
  const scene = useTransientScene();

  const meshRef = useRef<THREE.InstancedMesh>(null);
  const { camera } = useThree();

  // Label sprites: one per player, lazily created
  const labelSpritesRef = useRef<THREE.Sprite[]>([]);
  const labelsGroupRef = useRef<THREE.Group>(null);

  const count = allPlayers.length;

  // Build geometry + material once
  const geometry = useRef(new THREE.PlaneGeometry(1.2, 1.2)).current;
  const material = useRef(
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      depthWrite: false,
    }),
  ).current;

  // Initialize instance matrices and colors when players load
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    for (let i = 0; i < count; i++) {
      const p = allPlayers[i];
      _matrix.makeTranslation(p.x, p.y, p.z);
      mesh.setMatrixAt(i, _matrix);
      mesh.setColorAt(i, salaryDeltaColor(p.salaryDelta));
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [allPlayers, count]);

  // Update visibility (colors) when filteredIndices changes
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    for (let i = 0; i < count; i++) {
      const p = allPlayers[i];
      if (!filteredIndices.has(i)) {
        mesh.setColorAt(i, new THREE.Color(0x000000));
      } else {
        mesh.setColorAt(i, salaryDeltaColor(p.salaryDelta));
      }
    }

    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [filteredIndices, allPlayers, count]);

  // Create label sprites for all players
  useEffect(() => {
    const group = labelsGroupRef.current;
    if (!group || count === 0) return;

    // Dispose previous sprites
    for (const sprite of labelSpritesRef.current) {
      (sprite.material as THREE.SpriteMaterial).map?.dispose();
      sprite.material.dispose();
      group.remove(sprite);
    }
    labelSpritesRef.current = [];

    for (let i = 0; i < count; i++) {
      const p = allPlayers[i];
      const text = formatDelta(p.salaryDelta);
      const texture = makeLabelTexture(text);
      const mat = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        visible: false,
      });
      const sprite = new THREE.Sprite(mat);
      sprite.scale.set(4, 1, 1);
      sprite.position.set(p.x, p.y - 1.2, p.z);
      group.add(sprite);
      labelSpritesRef.current.push(sprite);
    }

    return () => {
      for (const sprite of labelSpritesRef.current) {
        (sprite.material as THREE.SpriteMaterial).map?.dispose();
        sprite.material.dispose();
      }
    };
  }, [allPlayers, count]);

  // Per-frame: billboard + highlight + label visibility
  useFrame(() => {
    const mesh = meshRef.current;
    if (!mesh || count === 0) return;

    const { hoveredIdx, selectedIdx } = scene.current;

    // Camera quaternion for billboarding (same for all instances this frame)
    camera.getWorldQuaternion(_quaternion);

    // Determine top-100 closest players for label display
    const camPos = camera.position;
    let labelCandidates: { idx: number; dist: number }[] = [];

    for (let i = 0; i < count; i++) {
      if (!filteredIndices.has(i)) continue;
      const p = allPlayers[i];
      const dist = camPos.distanceToSquared(
        _position.set(p.x, p.y, p.z),
      );
      labelCandidates.push({ idx: i, dist });
    }

    labelCandidates.sort((a, b) => a.dist - b.dist);
    const top100 = new Set(labelCandidates.slice(0, 100).map((c) => c.idx));

    // Update instance matrices (billboard) + scale for hover/select
    for (let i = 0; i < count; i++) {
      const p = allPlayers[i];
      const isHovered = hoveredIdx === i;
      const isSelected = selectedIdx === i;
      const scale = isHovered ? 1.8 : 1.0;

      _scale.set(scale, scale, scale);
      _position.set(p.x, p.y, p.z);
      _matrix.compose(_position, _quaternion, _scale);
      mesh.setMatrixAt(i, _matrix);

      // Override color for hover/selected
      if (isSelected) {
        mesh.setColorAt(i, COLOR_SELECTED);
      } else if (isHovered) {
        mesh.setColorAt(i, COLOR_HOVERED);
      } else if (!filteredIndices.has(i)) {
        mesh.setColorAt(i, new THREE.Color(0x111111));
      } else {
        mesh.setColorAt(i, salaryDeltaColor(p.salaryDelta));
      }

      // Label visibility
      const sprite = labelSpritesRef.current[i];
      if (sprite) {
        const mat = sprite.material as THREE.SpriteMaterial;
        mat.visible = top100.has(i) || isHovered || isSelected;
      }
    }

    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });

  const handlePointerMove = useCallback(
    (e: { instanceId?: number }) => {
      setHovered(e.instanceId ?? null);
    },
    [setHovered],
  );

  const handlePointerOut = useCallback(() => {
    setHovered(null);
  }, [setHovered]);

  const handleClick = useCallback(
    (e: { instanceId?: number }) => {
      const idx = e.instanceId;
      if (idx === undefined) return;
      setSelected(idx);
      const p = allPlayers[idx];
      if (p) {
        setCameraTarget({ x: p.x, y: p.y, z: p.z + 15 });
      }
    },
    [allPlayers, setSelected, setCameraTarget],
  );

  if (count === 0) return null;

  return (
    <>
      <instancedMesh
        ref={meshRef}
        args={[geometry, material, count]}
        frustumCulled={false}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      />
      <group ref={labelsGroupRef} />
    </>
  );
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n}`;
}

export function UserPlayerDots() {
  const userPlayers = useUserStore((s) => s.userPlayers);

  if (userPlayers.length === 0) return null;

  return (
    <group>
      {userPlayers.map((u) => (
        <group key={u.id} position={[u.x, u.y, u.z]}>
          {/* Glowing orange sphere */}
          <mesh>
            <sphereGeometry args={[0.6, 16, 16]} />
            <meshBasicMaterial color="#f97316" />
          </mesh>
          {/* Outer ring */}
          <mesh rotation={[0, 0, 0]}>
            <ringGeometry args={[0.85, 1.05, 32]} />
            <meshBasicMaterial color="#fb923c" side={THREE.DoubleSide} transparent opacity={0.8} depthWrite={false} />
          </mesh>
          {/* Name label */}
          <Html position={[0, 1.4, 0]} center distanceFactor={30}>
            <div className="bg-orange-500/90 backdrop-blur text-white text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap pointer-events-none select-none shadow-lg">
              {u.name}
              <span className="ml-1.5 opacity-75">{formatMoney(u.expectedSalaryMid)}/yr</span>
            </div>
          </Html>
        </group>
      ))}
    </group>
  );
}
