import { noise2D } from '@remotion/noise';
import { smoothstep, lerp } from './matematica';

// Geografia fixa do episódio. Tudo que fica "no chão" consulta altura(x, z).
export const RIO_X = 55;
export const rioCentro = (z: number) => RIO_X + 9 * Math.sin(z / 38) + 4 * Math.sin(z / 13 + 1.3);
export const RIO_LARGURA = 7; // meia-largura
export const NIVEL_GELO = -0.9;
export const CLAREIRA: [number, number] = [-45, -35];
export const CLAREIRA_RAIO = 26;

const ridged = (x: number, z: number) => {
  let v = 0;
  let amp = 1;
  let f = 1;
  for (let i = 0; i < 4; i++) {
    v += (1 - Math.abs(noise2D('serra', x * f, z * f))) ** 2 * amp;
    amp *= 0.5;
    f *= 2.1;
  }
  return v / 1.875;
};

export const altura = (x: number, z: number): number => {
  const r = Math.hypot(x, z);
  let h = noise2D('terra', x * 0.012, z * 0.012) * 2.2 + noise2D('terra', x * 0.05 + 40, z * 0.05) * 0.5;
  // cordilheira ao longe
  const m = smoothstep(170, 620, r);
  h += m * (ridged(x * 0.0022, z * 0.0022) * 300 + 30);
  // destroços e clareira: chão mais plano
  h *= lerp(0.25, 1, smoothstep(6, 30, r));
  const dc = Math.hypot(x - CLAREIRA[0], z - CLAREIRA[1]);
  h = lerp(h, 0.2, 1 - smoothstep(CLAREIRA_RAIO * 0.6, CLAREIRA_RAIO * 1.3, dc));
  // leito do rio
  const dr = Math.abs(x - rioCentro(z));
  h = lerp(h, NIVEL_GELO - 0.6, 1 - smoothstep(RIO_LARGURA - 1, RIO_LARGURA + 5, dr));
  return h;
};

export const distRio = (x: number, z: number) => Math.abs(x - rioCentro(z));
