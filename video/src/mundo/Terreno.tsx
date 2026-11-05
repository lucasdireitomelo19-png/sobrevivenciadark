import React, { useMemo } from 'react';
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { altura, CLAREIRA, CLAREIRA_RAIO, distRio, RIO_LARGURA } from '../motor/terreno';
import { rng, smoothstep } from '../motor/matematica';

// Malha com espaçamento senh(): ~1,5 m de resolução perto dos destroços, ~40 m nas montanhas.
let geoTerreno: THREE.BufferGeometry | null = null;
const criarTerreno = () => {
  if (geoTerreno) return geoTerreno;
  const N = 320;
  const EXT = 2600;
  const K = 4.2;
  const mapa = (u: number) => (EXT * Math.sinh(K * u)) / Math.sinh(K);
  const pos = new Float32Array((N + 1) * (N + 1) * 3);
  const cor = new Float32Array((N + 1) * (N + 1) * 3);
  const neve = new THREE.Color('#e8edf4');
  const neveSombra = new THREE.Color('#b9c6d8');
  const rocha = new THREE.Color('#2e3036');
  const c = new THREE.Color();
  for (let j = 0; j <= N; j++) {
    for (let i = 0; i <= N; i++) {
      const x = mapa((i / N) * 2 - 1);
      const z = mapa((j / N) * 2 - 1);
      const h = altura(x, z);
      const k = (j * (N + 1) + i) * 3;
      pos[k] = x;
      pos[k + 1] = h;
      pos[k + 2] = z;
      const e = 1.5;
      const inclinacao = Math.hypot(altura(x + e, z) - altura(x - e, z), altura(x, z + e) - altura(x, z - e)) / (2 * e);
      c.copy(neve).lerp(neveSombra, smoothstep(-1, 3, -h) * 0.5 + 0.15);
      c.lerp(rocha, smoothstep(0.7, 1.3, inclinacao));
      cor[k] = c.r;
      cor[k + 1] = c.g;
      cor[k + 2] = c.b;
    }
  }
  const idx: number[] = [];
  for (let j = 0; j < N; j++)
    for (let i = 0; i < N; i++) {
      const a = j * (N + 1) + i;
      idx.push(a, a + N + 1, a + 1, a + 1, a + N + 1, a + N + 2);
    }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  geoTerreno = g;
  return g;
};

export const Terreno: React.FC = () => {
  const geo = useMemo(criarTerreno, []);
  return (
    <mesh geometry={geo} receiveShadow>
      <meshStandardMaterial vertexColors roughness={0.92} metalness={0} />
    </mesh>
  );
};

// ── Floresta boreal: um único InstancedMesh com milhares de pinheiros nevados.
let geoPinheiro: THREE.BufferGeometry | null = null;
const criarPinheiro = () => {
  if (geoPinheiro) return geoPinheiro;
  const partes: THREE.BufferGeometry[] = [];
  const tronco = new THREE.CylinderGeometry(0.12, 0.18, 2.2, 6);
  tronco.translate(0, 1.1, 0);
  partes.push(tronco);
  const camadas = 5;
  for (let i = 0; i < camadas; i++) {
    const r = 1.9 - i * 0.33;
    const h = 2.6 - i * 0.25;
    const cone = new THREE.ConeGeometry(r, h, 8, 1, true);
    cone.translate(0, 1.6 + i * 1.35 + h / 2, 0);
    partes.push(cone);
  }
  const g = mergeGeometries(partes.map((p) => p.toNonIndexed()))!;
  g.computeVertexNormals();
  const pos = g.getAttribute('position');
  const nor = g.getAttribute('normal');
  const cor = new Float32Array(pos.count * 3);
  const verde = new THREE.Color('#14241c');
  const neve = new THREE.Color('#dfe6ee');
  const casca = new THREE.Color('#2a1f18');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const y = pos.getY(i);
    const ehTronco = Math.hypot(pos.getX(i), pos.getZ(i)) < 0.2 && y < 2.3;
    if (ehTronco) c.copy(casca);
    else {
      // neve acumulada nas faces voltadas para cima e na ponta das camadas
      const cobertura = smoothstep(0.25, 0.75, nor.getY(i)) * 0.55 + ((i * 7919) % 13) / 13 * 0.25;
      c.copy(verde).lerp(neve, cobertura);
    }
    cor[i * 3] = c.r;
    cor[i * 3 + 1] = c.g;
    cor[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(cor, 3));
  geoPinheiro = g;
  return g;
};

type Arvore = { x: number; z: number; s: number; r: number; inclina: number };
let arvores: Arvore[] | null = null;
const plantar = (): Arvore[] => {
  if (arvores) return arvores;
  const r = rng(42);
  const lista: Arvore[] = [];
  const corredor = (x: number, z: number) => {
    // faixa onde o avião derrubou as árvores: de (-60,-230) até os destroços
    const ax = -60, az = -230;
    const t = Math.max(0, Math.min(1, ((x - ax) * -ax + (z - az) * -az) / (ax * ax + az * az)));
    return Math.hypot(x - (ax + -ax * t), z - (az + -az * t)) < 6 && t > 0.72;
  };
  const passo = 5;
  for (let gx = -720; gx < 720; gx += passo) {
    for (let gz = -720; gz < 720; gz += passo) {
      const x = gx + (r() - 0.5) * passo * 0.9;
      const z = gz + (r() - 0.5) * passo * 0.9;
      const d = Math.hypot(x, z);
      const dens = d < 200 ? 0.7 : d < 450 ? 0.3 : 0.09;
      if (r() > dens) continue;
      if (d < 11) continue;
      if (distRio(x, z) < RIO_LARGURA + 3) continue;
      if (Math.hypot(x - CLAREIRA[0], z - CLAREIRA[1]) < CLAREIRA_RAIO) continue;
      if (corredor(x, z)) continue;
      const h = altura(x, z);
      if (h > 90) continue; // limite da vegetação
      lista.push({ x, z, s: 0.6 + r() * 0.75, r: r() * Math.PI * 2, inclina: (r() - 0.5) * 0.06 });
    }
  }
  arvores = lista;
  return lista;
};

export const Floresta: React.FC = () => {
  const geo = useMemo(criarPinheiro, []);
  const lista = useMemo(plantar, []);
  const ref = React.useRef<THREE.InstancedMesh>(null);
  React.useLayoutEffect(() => {
    const m = ref.current;
    if (!m) return;
    const o = new THREE.Object3D();
    lista.forEach((a, i) => {
      o.position.set(a.x, altura(a.x, a.z) - 0.3, a.z);
      o.rotation.set(a.inclina, a.r, a.inclina * 0.7);
      o.scale.setScalar(a.s * 1.25);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
    });
    m.instanceMatrix.needsUpdate = true;
    m.computeBoundingSphere();
  }, [lista]);
  return (
    <instancedMesh ref={ref} args={[geo, undefined, lista.length]} castShadow receiveShadow frustumCulled={false}>
      <meshStandardMaterial vertexColors roughness={0.95} side={THREE.DoubleSide} />
    </instancedMesh>
  );
};
