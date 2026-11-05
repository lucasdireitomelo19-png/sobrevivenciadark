import React, { useLayoutEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useCena } from '../motor/contexto';
import { rng } from '../motor/matematica';
import type { Vec3 } from '../roteiro/tipos';

// Sistema de partículas único (billboards instanciados, 100% em shader e determinístico):
// fogo, brasas, fumaça, vapor, neve, bolhas. O tempo vem do frame do Remotion, não do relógio.

export type TipoParticula = 'fogo' | 'brasa' | 'fumaca' | 'vapor' | 'neve' | 'bolha' | 'po';

type Props = {
  tipo: TipoParticula;
  quantidade: number;
  posicao?: Vec3;
  raio?: number; // raio do emissor
  altura?: number; // quanto sobe durante a vida
  vida?: number; // segundos
  tamanho?: number; // metros
  vento?: Vec3; // deriva (fumaça) ou velocidade (neve), m/s
  cor1?: string;
  cor2?: string;
  opacidade?: number;
  caixa?: Vec3; // neve: volume ao redor da câmera
  semente?: number;
  densidadeNeblina?: number;
  corNeblina?: string;
};

const VERT = /* glsl */ `
uniform float uTempo, uVida, uAltura, uRaio, uTamanho, uDensNeblina;
uniform vec3 uVento, uCam, uCaixa;
attribute vec3 aAleat;
attribute float aSemente;
varying float vVida;
varying vec2 vUv;
varying float vNeblina;
varying float vSemente;
void main() {
  vUv = uv;
  float vida = fract(uTempo / uVida + aSemente);
  vec3 c;
  float tam = uTamanho;
#if defined(NEVE)
  vec3 desloc = uVento * uTempo + vec3(0.0, -uTempo * (0.9 + aAleat.y * 0.9), 0.0);
  desloc.x += sin(uTempo * 1.3 + aSemente * 30.0) * 0.5;
  desloc.z += cos(uTempo * 1.1 + aSemente * 20.0) * 0.5;
  c = mod(aAleat * uCaixa + desloc - uCam + uCaixa * 0.5, uCaixa) - uCaixa * 0.5 + uCam;
  tam *= 0.5 + aSemente;
  vVida = 0.0;
#elif defined(BOLHA)
  c = vec3((aAleat.x - 0.5) * uRaio, vida * uAltura, (aAleat.z - 0.5) * uRaio);
  c.x += sin(uTempo * 6.0 + aSemente * 40.0) * 0.08;
  tam *= 0.4 + aAleat.y;
  vVida = vida;
#else
  vec2 ang = (aAleat.xz - 0.5) * 2.0;
  float esp = uRaio * ESPALHAR;
  c = vec3(ang.x * esp, vida * uAltura * (0.55 + aAleat.y * 0.9), ang.y * esp);
  c += uVento * pow(vida, 1.6) * uVida;
  c.x += sin(uTempo * 2.3 + aSemente * 50.0) * TURB * vida;
  c.z += cos(uTempo * 1.9 + aSemente * 31.0) * TURB * vida;
  tam *= CRESCE;
  vVida = vida;
#endif
  vec4 mv = modelViewMatrix * vec4(c, 1.0);
  mv.xy += position.xy * tam;
  float dn = uDensNeblina * -mv.z;
  vNeblina = 1.0 - exp(-dn * dn);
  vSemente = aSemente;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform vec3 uCor1, uCor2, uCorNeblina;
uniform float uOpacidade;
varying float vVida;
varying vec2 vUv;
varying float vNeblina;
varying float vSemente;
void main() {
  float d = length(vUv - 0.5) * 2.0;
  float a = smoothstep(1.0, 0.0, d);
#if defined(FOGO)
  a = pow(a, 1.5);
  vec3 cor = mix(uCor1, uCor2, smoothstep(0.0, 0.75, vVida));
  float alfa = a * pow(1.0 - vVida, 1.3) * smoothstep(0.0, 0.06, vVida) * uOpacidade * (1.0 - vNeblina);
  gl_FragColor = vec4(cor * alfa, alfa);
#elif defined(FUMACA)
  float alfa = a * a * sin(vVida * 3.14159) * uOpacidade * (0.6 + vSemente * 0.6);
  vec3 cor = mix(uCor1, uCor2, vVida);
  cor = mix(cor, uCorNeblina, vNeblina);
  gl_FragColor = vec4(cor, alfa * (1.0 - vNeblina * 0.6));
#elif defined(BOLHA)
  float anel = smoothstep(0.55, 0.8, d) * smoothstep(1.0, 0.85, d) + a * 0.15;
  gl_FragColor = vec4(uCor1, anel * uOpacidade * (1.0 - vVida * 0.5));
#else
  float alfa = a * uOpacidade * (1.0 - vNeblina);
  gl_FragColor = vec4(uCor1 * alfa, alfa);
#endif
}`;

const CONFIG: Record<TipoParticula, { defines: Record<string, string>; aditivo: boolean }> = {
  fogo: { defines: { FOGO: '', ESPALHAR: '(1.0 - vida * 0.85)', TURB: '0.12', CRESCE: '(1.0 - vida * 0.6)' }, aditivo: true },
  brasa: { defines: { FOGO: '', ESPALHAR: '(1.0 + vida * 2.5)', TURB: '0.8', CRESCE: '(1.0 - vida * 0.5)' }, aditivo: true },
  fumaca: { defines: { FUMACA: '', ESPALHAR: '(0.5 + vida * 2.2)', TURB: '0.6', CRESCE: '(0.35 + vida * 2.2)' }, aditivo: false },
  vapor: { defines: { FUMACA: '', ESPALHAR: '(0.6 + vida * 1.5)', TURB: '0.3', CRESCE: '(0.4 + vida * 1.8)' }, aditivo: false },
  po: { defines: { FOGO: '', ESPALHAR: '(1.0 + vida * 3.0)', TURB: '1.5', CRESCE: '(1.0 + vida)' }, aditivo: true },
  neve: { defines: { NEVE: '' }, aditivo: true },
  bolha: { defines: { BOLHA: '' }, aditivo: true },
};

export const Particulas: React.FC<Props> = ({
  tipo,
  quantidade,
  posicao = [0, 0, 0],
  raio = 0.5,
  altura = 2,
  vida = 2,
  tamanho = 0.3,
  vento = [0, 0, 0],
  cor1 = '#ffd27a',
  cor2 = '#ff3a0a',
  opacidade = 1,
  caixa = [60, 30, 60],
  semente = 1,
  densidadeNeblina = 0,
  corNeblina = '#000000',
}) => {
  const { seg } = useCena();
  const camera = useThree((s) => s.camera);
  const n = Math.max(1, Math.floor(quantidade));

  const geo = useMemo(() => {
    const base = new THREE.PlaneGeometry(1, 1);
    const g = new THREE.InstancedBufferGeometry();
    g.index = base.index;
    g.setAttribute('position', base.getAttribute('position'));
    g.setAttribute('uv', base.getAttribute('uv'));
    const r = rng(semente * 9973 + n);
    const al = new Float32Array(n * 3);
    const se = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      al[i * 3] = r();
      al[i * 3 + 1] = r();
      al[i * 3 + 2] = r();
      se[i] = r();
    }
    g.setAttribute('aAleat', new THREE.InstancedBufferAttribute(al, 3));
    g.setAttribute('aSemente', new THREE.InstancedBufferAttribute(se, 1));
    g.instanceCount = n;
    return g;
  }, [n, semente]);

  const mat = useMemo(() => {
    const cfg = CONFIG[tipo];
    return new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      defines: cfg.defines,
      transparent: true,
      depthWrite: false,
      blending: cfg.aditivo ? THREE.AdditiveBlending : THREE.NormalBlending,
      uniforms: {
        uTempo: { value: 0 },
        uVida: { value: vida },
        uAltura: { value: altura },
        uRaio: { value: raio },
        uTamanho: { value: tamanho },
        uVento: { value: new THREE.Vector3() },
        uCam: { value: new THREE.Vector3() },
        uCaixa: { value: new THREE.Vector3() },
        uCor1: { value: new THREE.Color(cor1) },
        uCor2: { value: new THREE.Color(cor2) },
        uCorNeblina: { value: new THREE.Color(corNeblina) },
        uOpacidade: { value: opacidade },
        uDensNeblina: { value: densidadeNeblina },
      },
    });
  }, [tipo]);

  useLayoutEffect(() => {
    const u = mat.uniforms;
    u.uTempo.value = seg + semente * 13.7;
    u.uVida.value = vida;
    u.uAltura.value = altura;
    u.uRaio.value = raio;
    u.uTamanho.value = tamanho;
    u.uVento.value.set(...vento);
    u.uCam.value.copy(camera.position);
    u.uCaixa.value.set(...caixa);
    u.uCor1.value.set(cor1);
    u.uCor2.value.set(cor2);
    u.uCorNeblina.value.set(corNeblina);
    u.uOpacidade.value = opacidade;
    u.uDensNeblina.value = densidadeNeblina;
  });

  return <mesh geometry={geo} material={mat} position={tipo === 'neve' ? [0, 0, 0] : posicao} frustumCulled={false} renderOrder={tipo === 'fumaca' ? 2 : 3} />;
};
