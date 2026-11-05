import React, { useLayoutEffect, useMemo } from 'react';
import * as THREE from 'three';
import { rng } from '../../motor/matematica';

// Cenário "carro no rio": rio correndo no eixo x, margens em z = ±MARGEM,
// ponte atravessando no eixo z em x = 0, tabuleiro a ALTURA_PONTE metros da água.
export const MARGEM = 55;
export const ALTURA_PONTE = 9;
export const LARGURA_PONTE = 10;

// ── Água: ondas no vertex shader, fresnel, brilho das luzes da ponte e gotas de chuva.
const VERT = /* glsl */ `
uniform float uTempo;
varying vec3 vMundo;
varying vec3 vNormal;
float onda(vec2 p){
  return sin(p.x*0.35 + uTempo*1.3)*0.06 + sin(p.y*0.5 - uTempo*1.7)*0.05 + sin((p.x+p.y)*1.3 + uTempo*2.9)*0.025;
}
void main(){
  vec3 p = position;
  vec4 w = modelMatrix * vec4(p, 1.0);
  float h = onda(w.xz);
  float e = 0.15;
  vec3 n = normalize(vec3(-(onda(w.xz+vec2(e,0.0))-h)/e, 1.0, -(onda(w.xz+vec2(0.0,e))-h)/e));
  w.y += h;
  vMundo = w.xyz;
  vNormal = n;
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const FRAG = /* glsl */ `
uniform vec3 uCor, uCeu, uLuz, uNeblinaCor;
uniform float uTempo, uNeblina, uChuva, uAlfa, uBrilho;
uniform vec3 uLuzes[6];
varying vec3 vMundo;
varying vec3 vNormal;
float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
void main(){
  vec3 v = normalize(cameraPosition - vMundo);
  vec3 n = normalize(vNormal);
  // gotas de chuva: anéis que nascem e se expandem numa grade
  vec2 g = vMundo.xz * 1.6;
  vec2 id = floor(g);
  vec2 f = fract(g) - 0.5;
  float fase = fract(uTempo * 1.4 + hash(id));
  float anel = smoothstep(0.05, 0.0, abs(length(f) - fase * 0.45)) * (1.0 - fase) * uChuva;
  n = normalize(n + vec3(f.x, 0.0, f.y) * anel * 1.5);
  float fres = pow(1.0 - max(dot(n, v), 0.0), 4.0);
  vec3 c = mix(uCor, uCeu, fres * 0.8);
  // reflexos das luzes (postes e faróis) esticados na água
  for (int i = 0; i < 6; i++) {
    vec3 l = normalize(uLuzes[i] - vMundo);
    vec3 h = normalize(l + v);
    float d = length(uLuzes[i] - vMundo);
    c += uLuz * pow(max(dot(n, h), 0.0), 220.0) * uBrilho * 25.0 / (d + 15.0);
  }
  c += anel * 0.06;
  float dist = length(cameraPosition - vMundo);
  float neb = 1.0 - exp(-pow(uNeblina * dist, 2.0));
  c = mix(c, uNeblinaCor, neb);
  gl_FragColor = vec4(c, uAlfa);
}`;

export const LUZES_PONTE: THREE.Vector3[] = [-40, -20, 0, 20, 40, 60].map((z) => new THREE.Vector3(LARGURA_PONTE / 2 - 1.7, ALTURA_PONTE + 6.9, z));

export const Agua: React.FC<{ seg: number; neblina: number; corNeblina: string; chuva?: number; alfa?: number; brilho?: number }> = ({ seg, neblina, corNeblina, chuva = 1, alfa = 0.97, brilho = 1 }) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        transparent: true,
        side: THREE.DoubleSide,
        uniforms: {
          uTempo: { value: 0 },
          uCor: { value: new THREE.Color('#041016') },
          uCeu: { value: new THREE.Color('#1b2a3a') },
          uLuz: { value: new THREE.Color('#ffb36b') },
          uNeblinaCor: { value: new THREE.Color() },
          uNeblina: { value: 0 },
          uChuva: { value: 1 },
          uAlfa: { value: 0.97 },
          uBrilho: { value: 1 },
          uLuzes: { value: LUZES_PONTE },
        },
      }),
    [],
  );
  useLayoutEffect(() => {
    mat.uniforms.uTempo.value = seg;
    mat.uniforms.uNeblina.value = neblina;
    mat.uniforms.uNeblinaCor.value.set(corNeblina);
    mat.uniforms.uChuva.value = chuva;
    mat.uniforms.uAlfa.value = alfa;
    mat.uniforms.uBrilho.value = brilho;
  });
  return (
    <mesh material={mat} rotation={[-Math.PI / 2, 0, 0]} renderOrder={1}>
      <planeGeometry args={[1400, 1400, 260, 260]} />
    </mesh>
  );
};

// ── Ponte de concreto com guarda-corpo, pilares e postes de luz de sódio.
export const Ponte: React.FC<{ guardaQuebrado?: boolean }> = ({ guardaQuebrado = false }) => {
  const pilares = [-45, -15, 15, 45];
  const postes = [-40, -20, 0, 20, 40, 60];
  const concreto = '#3d3f43';
  return (
    <group>
      <mesh position={[0, ALTURA_PONTE - 0.6, 0]} castShadow receiveShadow>
        <boxGeometry args={[LARGURA_PONTE, 1.2, 180]} />
        <meshStandardMaterial color={concreto} roughness={0.95} />
      </mesh>
      {/* asfalto molhado: escuro e brilhante */}
      <mesh position={[0, ALTURA_PONTE + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[LARGURA_PONTE - 1, 180]} />
        <meshStandardMaterial color="#0d0e10" roughness={0.25} metalness={0.4} />
      </mesh>
      {/* faixa central tracejada */}
      {Array.from({ length: 30 }, (_, i) => (
        <mesh key={i} position={[0, ALTURA_PONTE + 0.02, -87 + i * 6]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.15, 3]} />
          <meshStandardMaterial color="#c9a227" roughness={0.6} />
        </mesh>
      ))}
      {pilares.map((z) => (
        <mesh key={z} position={[0, ALTURA_PONTE / 2 - 4, z]} castShadow>
          <boxGeometry args={[3, ALTURA_PONTE + 8, 2.2]} />
          <meshStandardMaterial color={concreto} roughness={1} />
        </mesh>
      ))}
      {/* guarda-corpos */}
      {[-1, 1].map((s) =>
        Array.from({ length: 45 }, (_, i) => {
          const z = -88 + i * 4;
          const quebrado = guardaQuebrado && s === 1 && z > -10 && z < 2;
          if (quebrado) return null;
          return (
            <group key={`${s}${i}`} position={[s * (LARGURA_PONTE / 2 - 0.2), ALTURA_PONTE, z]}>
              <mesh position={[0, 0.5, 0]}>
                <boxGeometry args={[0.15, 1, 0.15]} />
                <meshStandardMaterial color="#8a8d92" metalness={0.6} roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.9, 2]}>
                <boxGeometry args={[0.1, 0.12, 4]} />
                <meshStandardMaterial color="#9a9da2" metalness={0.7} roughness={0.35} />
              </mesh>
            </group>
          );
        }),
      )}
      {guardaQuebrado && (
        // pedaços do guarda-corpo arrancados, pendurados
        <group position={[LARGURA_PONTE / 2 + 0.2, ALTURA_PONTE + 0.4, -6]}>
          <mesh rotation={[0.3, 0, -1.1]} position={[0.6, -0.6, 0]}>
            <boxGeometry args={[0.1, 0.12, 4]} />
            <meshStandardMaterial color="#9a9da2" metalness={0.7} roughness={0.35} />
          </mesh>
          <mesh rotation={[-0.5, 0.2, -1.4]} position={[0.8, -1.4, 2.5]}>
            <boxGeometry args={[0.1, 0.12, 3.5]} />
            <meshStandardMaterial color="#9a9da2" metalness={0.7} roughness={0.35} />
          </mesh>
        </group>
      )}
      {postes.map((z) => (
        <group key={z} position={[LARGURA_PONTE / 2 - 0.2, ALTURA_PONTE, z]}>
          <mesh position={[0, 3.5, 0]}>
            <cylinderGeometry args={[0.08, 0.12, 7, 8]} />
            <meshStandardMaterial color="#2a2c30" metalness={0.5} />
          </mesh>
          <mesh position={[-0.8, 7, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.06, 0.06, 1.6, 6]} />
            <meshStandardMaterial color="#2a2c30" />
          </mesh>
          <mesh position={[-1.5, 6.9, 0]}>
            <boxGeometry args={[0.5, 0.15, 0.3]} />
            <meshBasicMaterial color={[8, 4.2, 1.6]} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// Luzes reais dos postes (poucas, por desempenho) perto da ação.
export const LuzesPonte: React.FC<{ zs?: number[] }> = ({ zs = [-20, 0, 20] }) => (
  <>
    {zs.map((z) => (
      <pointLight key={z} position={[LARGURA_PONTE / 2 - 1.7, ALTURA_PONTE + 6.6, z]} color="#ffa055" intensity={600} distance={60} decay={1.7} />
    ))}
  </>
);

// ── Margens: barranco escuro com mata densa (silhuetas) dos dois lados.
export const Margens: React.FC = () => {
  const arvores = useMemo(() => {
    const r = rng(5);
    const l: { x: number; z: number; s: number; tipo: number }[] = [];
    for (let i = 0; i < 700; i++) {
      const lado = r() > 0.5 ? 1 : -1;
      const x = (r() - 0.5) * 500;
      const z = lado * (MARGEM + 4 + r() * 70);
      if (Math.abs(x) < 7) continue;
      l.push({ x, z, s: 0.7 + r() * 1.1, tipo: r() > 0.5 ? 1 : 0 });
    }
    return l;
  }, []);
  const geoCopa = useMemo(() => new THREE.IcosahedronGeometry(2.6, 0), []);
  const geoTronco = useMemo(() => new THREE.CylinderGeometry(0.2, 0.3, 5, 5), []);
  const refC = React.useRef<THREE.InstancedMesh>(null);
  const refT = React.useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const o = new THREE.Object3D();
    arvores.forEach((a, i) => {
      o.position.set(a.x, 2 + 5 * a.s, a.z);
      o.scale.set(a.s * (a.tipo ? 1 : 1.4), a.s * (a.tipo ? 1.8 : 1.1), a.s);
      o.rotation.set(0, a.x, 0);
      o.updateMatrix();
      refC.current!.setMatrixAt(i, o.matrix);
      o.position.set(a.x, 1.5 + 2.5 * a.s, a.z);
      o.scale.setScalar(a.s);
      o.updateMatrix();
      refT.current!.setMatrixAt(i, o.matrix);
    });
    refC.current!.instanceMatrix.needsUpdate = true;
    refT.current!.instanceMatrix.needsUpdate = true;
  }, [arvores]);
  return (
    <group>
      {[-1, 1].map((s) => (
        <group key={s}>
          {/* barranco inclinado até a água */}
          <mesh position={[0, 0.5, s * (MARGEM + 3)]} rotation={[s * 0.45, 0, 0]} receiveShadow>
            <boxGeometry args={[900, 8, 10]} />
            <meshStandardMaterial color="#17150f" roughness={1} />
          </mesh>
          <mesh position={[0, 2.2, s * (MARGEM + 80)]} receiveShadow>
            <boxGeometry args={[900, 2, 150]} />
            <meshStandardMaterial color="#101208" roughness={1} />
          </mesh>
        </group>
      ))}
      <instancedMesh ref={refC} args={[geoCopa, undefined, arvores.length]} frustumCulled={false}>
        <meshStandardMaterial color="#0c1a10" roughness={1} flatShading />
      </instancedMesh>
      <instancedMesh ref={refT} args={[geoTronco, undefined, arvores.length]} frustumCulled={false}>
        <meshStandardMaterial color="#14100c" roughness={1} />
      </instancedMesh>
    </group>
  );
};
