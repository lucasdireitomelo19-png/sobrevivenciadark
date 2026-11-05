import type { Mundo, Vec3 } from '../roteiro/tipos';
import { lerp3, easeIn, clamp } from './matematica';
import { CLAREIRA } from './terreno';

export type Pose = { pos: Vec3; dir: Vec3; inclinacao: number };

const dirDe = (a: Vec3, b: Vec3): Vec3 => {
  const d: Vec3 = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  const l = Math.hypot(...d) || 1;
  return [d[0] / l, d[1] / l, d[2] / l];
};

// Avião: voando = linha reta com leve ondulação; caindo = acelera até o impacto.
export const poseAviao = (a: NonNullable<Mundo['aviao']>, t: number, seg: number): Pose => {
  const de = a.de ?? [0, 80, -300];
  const para = a.para ?? [0, 80, 0];
  if (a.estado === 'caindo') {
    const k = clamp(t / (a.impacto ?? 0.8));
    const e = 0.55 * k + 0.45 * easeIn(k);
    const p = lerp3(de, para, e);
    return { pos: p, dir: dirDe(de, para), inclinacao: Math.sin(seg * 5) * 0.25 + k * 0.4 };
  }
  const p = lerp3(de, para, t);
  p[1] += Math.sin(seg * 1.3) * 1.2;
  return { pos: p, dir: dirDe(de, para), inclinacao: Math.sin(seg * 0.9) * 0.12 };
};

// Helicóptero: cada modo é uma coreografia própria.
export const poseHelicoptero = (modo: NonNullable<Mundo['helicoptero']>['modo'], t: number): Pose => {
  const [cx, cz] = CLAREIRA;
  if (modo === 'passando') {
    // cruza a cordilheira ao longe, ~2 km
    const de: Vec3 = [-700, 140, -900];
    const para: Vec3 = [700, 150, -820];
    return { pos: lerp3(de, para, t), dir: dirDe(de, para), inclinacao: -0.08 };
  }
  if (modo === 'circulando' || modo === 'pousando') {
    const a = t * Math.PI * 1.1 + 1;
    const r = 30 - t * 8;
    const y = modo === 'pousando' ? 34 - t * 18 : 30;
    const pos: Vec3 = [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
    return { pos, dir: [-Math.sin(a), 0, Math.cos(a)], inclinacao: 0.22 };
  }
  // subindo
  const de: Vec3 = [cx, 12, cz];
  const para: Vec3 = [cx + 160, 150, cz + 260];
  return { pos: lerp3(de, para, t * t), dir: dirDe(de, para), inclinacao: 0.05 };
};
