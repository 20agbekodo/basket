import { Canvas } from '@react-three/fiber';

interface Canvas3DProps {
  children: React.ReactNode;
}

export function Canvas3D({ children }: Canvas3DProps) {
  return (
    <Canvas
      camera={{ position: [0, 0, 50], fov: 60, near: 0.1, far: 2000 }}
      dpr={[1, 2]}
      style={{ width: '100%', height: '100%' }}
      gl={{ antialias: true, alpha: false }}
    >
      {children}
    </Canvas>
  );
}
