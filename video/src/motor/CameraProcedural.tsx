import { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { noise2D } from '@remotion/noise';
import * as THREE from 'three';
import type { Camera, Mundo, Vec3 } from '../roteiro/tipos';
import { useCena } from './contexto';
import { clamp, easeInOut, easeOut, easeOutExpo, lerp, lerp3 } from './matematica';
import { poseAviao, poseHelicoptero } from './trajetorias';
import { altura } from './terreno';

export type QuadroCamera = { pos: Vec3; alvo: Vec3; fov: number; rolagem: number };

const ruido = (canal: number, s: number) => noise2D('cam', canal * 17.3, s);

/**
 * Câmera procedural: transforma a descrição da cena (tipo de movimento, de/para,
 * alvo, lente, tremor) em posição + alvo + lente a cada frame. Função pura, para
 * poder ser reaproveitada fora do canvas (ex.: thumbnail, testes).
 */
export const calcularCamera = (cam: Camera, mundo: Mundo, t: number, seg: number): QuadroCamera => {
  const e = easeInOut(t);
  const de = cam.de ?? [10, 2, 10];
  const para = cam.para ?? de;
  let alvo: Vec3 = cam.alvo ?? [0, 0, 0];
  let pos: Vec3 = de;
  const [f0, f1] = cam.fov ?? [45, 45];
  let fov = lerp(f0, f1, e);
  let rolagem = 0;

  const objeto = (): Vec3 | null => {
    if (cam.segue === 'aviao' && mundo.aviao) return poseAviao(mundo.aviao, t, seg).pos;
    if (cam.segue === 'helicoptero' && mundo.helicoptero) return poseHelicoptero(mundo.helicoptero.modo, t).pos;
    return null;
  };

  switch (cam.tipo) {
    case 'orbit': {
      const a = ((cam.anguloInicial ?? 0) * Math.PI) / 180 + (cam.voltas ?? 0.25) * Math.PI * 2 * e;
      const r = cam.raio ?? 10;
      pos = [alvo[0] + Math.cos(a) * r, alvo[1] + (cam.altura ?? 3), alvo[2] + Math.sin(a) * r];
      break;
    }
    case 'drone': {
      pos = lerp3(de, para, t); // drone: velocidade constante
      rolagem = Math.sin(seg * 0.4) * 0.03;
      break;
    }
    case 'crashZoom': {
      const k = easeOutExpo(clamp(t / 0.12)); // fecha a lente em ~12% da cena
      fov = lerp(f0, f1, k);
      pos = lerp3(de, para, easeOut(clamp(t / 0.35)));
      break;
    }
    case 'slowZoom': {
      pos = lerp3(de, para, e);
      fov = lerp(f0, f1, t);
      break;
    }
    case 'tracking':
    case 'handheld':
    case 'dollyIn':
    case 'dollyOut':
    case 'topDown':
    default:
      pos = lerp3(de, para, cam.tipo === 'tracking' || cam.tipo === 'handheld' ? t : e);
  }

  // seguir um objeto em movimento
  const obj = objeto();
  if (obj) {
    alvo = obj;
    const d = cam.deslocamento;
    if (d && (d[0] || d[1] || d[2])) pos = [obj[0] + d[0], obj[1] + d[1], obj[2] + d[2]];
  }

  // camadas de tremor: respiração (sempre), câmera na mão, turbulência/impacto
  const base = cam.tipo === 'handheld' ? 0.5 : 0.12;
  let tremor = base + (cam.tremor ?? 0);
  const imp = mundo.aviao?.estado === 'caindo' ? mundo.aviao.impacto ?? 0.8 : -1;
  if (imp > 0 && t > imp) tremor += 3 * Math.max(0, 1 - (t - imp) * 8);
  const amp = 0.04 * tremor;
  const s = seg * (0.6 + tremor * 0.8);
  pos = [pos[0] + ruido(1, s) * amp * 3, pos[1] + ruido(2, s) * amp * 2, pos[2] + ruido(3, s) * amp * 3];
  const dist = Math.hypot(alvo[0] - pos[0], alvo[1] - pos[1], alvo[2] - pos[2]);
  const ampAlvo = dist * 0.006 * tremor;
  alvo = [alvo[0] + ruido(4, s * 1.3) * ampAlvo, alvo[1] + ruido(5, s * 1.3) * ampAlvo, alvo[2] + ruido(6, s * 1.3) * ampAlvo];
  rolagem += ruido(7, s) * 0.012 * tremor;

  // nunca atravessar o chão (exceto mergulho)
  if (!mundo.subaquatico || t < 0.1) pos[1] = Math.max(pos[1], altura(pos[0], pos[2]) + 0.25);
  return { pos, alvo, fov, rolagem };
};

export const CameraProcedural: React.FC = () => {
  const { cena, t, seg } = useCena();
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  useLayoutEffect(() => {
    const q = calcularCamera(cena.camera, cena.mundo, t, seg);
    camera.position.set(...q.pos);
    camera.up.set(Math.sin(q.rolagem), Math.cos(q.rolagem), 0);
    camera.lookAt(...q.alvo);
    camera.fov = q.fov;
    camera.near = 0.1;
    camera.far = 5000;
    camera.updateProjectionMatrix();
  });
  return null;
};
