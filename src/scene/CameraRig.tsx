import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { damp3 } from 'maath/easing';
import { useSceneStore } from '../store/useSceneStore';

const WHEEL_SCALE_PAN = 0.05;
const WHEEL_SCALE_DOLLY = 0.1;
const WHEEL_CLAMP = 50;

// Two-touch pinch state
interface PinchState {
  active: boolean;
  prevDist: number;
}

export function CameraRig() {
  const { camera, gl } = useThree();
  const targetRef = useRef(new THREE.Vector3(0, 0, 50));
  const pinchRef = useRef<PinchState>({ active: false, prevDist: 0 });
  const panStartRef = useRef<{ x: number; y: number } | null>(null);
  const pointerCountRef = useRef(0);

  // Subscribe to cameraTarget changes from zustand (outside React render)
  useEffect(() => {
    const unsub = useSceneStore.subscribe(
      (state) => state.cameraTarget,
      (target) => {
        if (target !== null) {
          targetRef.current.set(target.x, target.y, target.z + 15);
        }
      },
    );
    return unsub;
  }, []);

  useEffect(() => {
    const canvas = gl.domElement;

    function clamp(v: number, min: number, max: number): number {
      return Math.max(min, Math.min(max, v));
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();

      const dx = clamp(e.deltaX, -WHEEL_CLAMP, WHEEL_CLAMP);
      const dy = clamp(e.deltaY, -WHEEL_CLAMP, WHEEL_CLAMP);

      if (e.ctrlKey) {
        // Mac pinch gesture — dolly Z
        targetRef.current.z += dy * WHEEL_SCALE_DOLLY;
      } else {
        // Normal scroll — pan X/Y
        targetRef.current.x += dx * WHEEL_SCALE_PAN;
        targetRef.current.y -= dy * WHEEL_SCALE_PAN;
      }
    }

    function onPointerDown(e: PointerEvent) {
      pointerCountRef.current += 1;
      if (pointerCountRef.current === 1) {
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    }

    function onPointerMove(e: PointerEvent) {
      if (pointerCountRef.current === 1 && panStartRef.current) {
        const dx = e.clientX - panStartRef.current.x;
        const dy = e.clientY - panStartRef.current.y;
        targetRef.current.x -= dx * WHEEL_SCALE_PAN * 0.5;
        targetRef.current.y += dy * WHEEL_SCALE_PAN * 0.5;
        panStartRef.current = { x: e.clientX, y: e.clientY };
      }
    }

    function onPointerUp() {
      pointerCountRef.current = Math.max(0, pointerCountRef.current - 1);
      if (pointerCountRef.current === 0) {
        panStartRef.current = null;
        pinchRef.current.active = false;
      }
    }

    // Two-touch pinch via touch events
    function onTouchMove(e: TouchEvent) {
      if (e.touches.length !== 2) return;
      e.preventDefault();

      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY);

      const pinch = pinchRef.current;
      if (!pinch.active) {
        pinch.active = true;
        pinch.prevDist = dist;
        return;
      }

      const delta = pinch.prevDist - dist;
      targetRef.current.z += clamp(delta, -WHEEL_CLAMP, WHEEL_CLAMP) * WHEEL_SCALE_DOLLY;
      pinch.prevDist = dist;
    }

    function onTouchEnd() {
      pinchRef.current.active = false;
    }

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    canvas.addEventListener('pointerleave', onPointerUp);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchend', onTouchEnd);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointerleave', onPointerUp);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchend', onTouchEnd);
    };
  }, [gl.domElement]);

  useFrame((_state, delta) => {
    damp3(camera.position, targetRef.current, 0.1, delta);
  });

  return null;
}
