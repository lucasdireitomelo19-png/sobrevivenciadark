import React, { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { rng } from '../motor/matematica';
import type { Atmosfera } from './atmosfera';

// Cúpula com gradiente, lua, estrelas e o "raio" visível durante o relâmpago.
const VERT = `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix*vec4(position,1.0); gl_Position = projectionMatrix*p; }`;
const FRAG = `
uniform vec3 uTopo, uHorizonte, uSolDir, uSolCor;
uniform float uFlash, uNublado;
varying vec3 vDir;
void main(){
  float h = clamp(vDir.y, -0.2, 1.0);
  vec3 c = mix(uHorizonte, uTopo, pow(smoothstep(-0.05, 0.55, h), 0.7));
  float s = max(dot(normalize(vDir), normalize(uSolDir)), 0.0);
  c += uSolCor * (pow(s, 12.0) * 0.35 + pow(s, 400.0) * 1.5) * (1.0 - uNublado * 0.8);
  c = mix(c, vec3(0.75, 0.8, 0.95), uFlash * 0.55 * smoothstep(-0.1, 0.4, h));
  gl_FragColor = vec4(c, 1.0);
}`;

export const Ceu: React.FC<{ atm: Atmosfera; flash: number; nublado: number }> = ({ atm, flash, nublado }) => {
  const camera = useThree((s) => s.camera);
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        side: THREE.BackSide,
        depthWrite: false,
        fog: false,
        uniforms: {
          uTopo: { value: new THREE.Color() },
          uHorizonte: { value: new THREE.Color() },
          uSolDir: { value: new THREE.Vector3() },
          uSolCor: { value: new THREE.Color() },
          uFlash: { value: 0 },
          uNublado: { value: 0 },
        },
      }),
    [],
  );
  const ref = React.useRef<THREE.Group>(null);
  useLayoutEffect(() => {
    mat.uniforms.uTopo.value.set(atm.ceuTopo);
    mat.uniforms.uHorizonte.value.set(atm.ceuHorizonte);
    mat.uniforms.uSolDir.value.set(...atm.solDirecao);
    mat.uniforms.uSolCor.value.set(atm.sol);
    mat.uniforms.uFlash.value = flash;
    mat.uniforms.uNublado.value = nublado;
    ref.current?.position.copy(camera.position); // o céu acompanha a câmera
  });

  const estrelas = useMemo(() => {
    const r = rng(7);
    const p: number[] = [];
    for (let i = 0; i < 1400; i++) {
      const u = r() * Math.PI * 2;
      const v = Math.acos(r() * 0.9);
      p.push(Math.sin(v) * Math.cos(u) * 2900, Math.cos(v) * 2900, Math.sin(v) * Math.sin(u) * 2900);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    return g;
  }, []);

  const luaDir = new THREE.Vector3(...atm.solDirecao).normalize().multiplyScalar(2800);
  return (
    <group ref={ref}>
      <mesh material={mat} renderOrder={-10}>
        <sphereGeometry args={[3000, 32, 16]} />
      </mesh>
      {atm.lua && nublado < 0.6 && (
        <>
          <points geometry={estrelas} renderOrder={-9}>
            <pointsMaterial color="#cfd8ff" size={2.2} sizeAttenuation={false} fog={false} transparent opacity={0.8 * (1 - nublado)} depthWrite={false} />
          </points>
          <mesh position={luaDir} renderOrder={-8}>
            <sphereGeometry args={[55, 24, 12]} />
            <meshBasicMaterial color="#f1f3ff" fog={false} toneMapped={false} />
          </mesh>
        </>
      )}
    </group>
  );
};

// Raio: polilinha irregular determinística, aparece só durante o flash.
export const Raio: React.FC<{ flash: number; semente: number }> = ({ flash, semente }) => {
  const geo = useMemo(() => {
    const r = rng(semente);
    const pts: THREE.Vector3[] = [];
    let x = -400 + r() * 800;
    let y = 520;
    const z = -900 - r() * 400;
    while (y > 60) {
      pts.push(new THREE.Vector3(x, y, z));
      x += (r() - 0.5) * 70;
      y -= 25 + r() * 35;
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    return new THREE.Line(g, new THREE.LineBasicMaterial({ color: '#e8eeff', fog: false, toneMapped: false }));
  }, [semente]);
  if (flash < 0.5) return null;
  return <primitive object={geo} />;
};

// Relâmpagos determinísticos: ~1 a cada 3-6 s, com dupla piscada.
export const intensidadeRelampago = (seg: number, semente = 3) => {
  const r = rng(semente);
  let t = 0.6 + r() * 1.5;
  while (t < seg + 1) {
    const d = seg - t;
    if (d >= 0 && d < 0.5) {
      const a = Math.max(0, 1 - d / 0.08);
      const b = d > 0.14 ? Math.max(0, 1 - (d - 0.14) / 0.3) * 0.8 : 0;
      return Math.max(a, b);
    }
    t += 3 + r() * 3;
  }
  return 0;
};
