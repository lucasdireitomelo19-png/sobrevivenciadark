import { noise2D, noise3D } from '@remotion/noise';
import { P, Pincel, RGB, bayer } from './Pincel';

// Cenas de pixel art da selva amazônica (roteiro 001). Cada cena é uma função
// (pincel, segundos, parâmetros) que pinta o quadro inteiro, pixel a pixel.

const CEU_TEMPESTADE = [P.noite, P.noite2, P.tempestade, P.tempestade2, P.nuvem];
const CEU_NUBLADO = [P.tempestade2, P.nuvem, P.nuvemClara, P.ceu2, P.ceu3];
const FOLHAS = [P.folha0, P.folha1, P.folha2, P.folha3, P.folha4, P.folha5, P.folha6];
const TRONCO = [P.tronco0, P.tronco1, P.tronco2, P.tronco3];
const TERRA = [P.terra0, P.terra1, P.terra2, P.folha2, P.folha3];

const fbm = (seed: string, x: number, y: number) => noise2D(seed, x, y) * 0.6 + noise2D(seed, x * 2.1, y * 2.1) * 0.3 + noise2D(seed, x * 4.3, y * 4.3) * 0.1;

// ── Sprites (um caractere = um pixel)
export const AVIAO = [
  '..........................ooo.......',
  '.........................ovvo.......',
  '........................ovvvo.......',
  '..ooooooooooooooooooooooovvvoo......',
  '.owwwwwwwwwwwwwwwwwwwwwwwwwwwwoo....',
  'owwbwwbwwbwwbwwbwwbwwbwwbwwwwwwwo...',
  'orrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrro..',
  'owwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwwoo',
  '.oowwwwwwwwwwwwwwwwwwwwwwwwwwwwwoo..',
  '...oooooooooooooooooooooooooooo.....',
  '.........gggggggggggg...............',
  '........gggggggggggg................',
  '.......ooooooooooo..................',
];
const COR_AVIAO: Record<string, RGB> = { o: P.cinza2, w: P.osso, b: P.noite, r: P.vermelho, v: P.vermelho, g: P.metal2 };

export const POLTRONA = [
  '...aa...........',
  '..aAa...........',
  '..aAAa..........',
  '...aAAa.........',
  '....aAAa........',
  '.....aAAaaaaaaa.',
  '.....aAAAAAAAAAa',
  '......aaaaaaaaa.',
  '......m......m..',
];
const COR_POLTRONA: Record<string, RGB> = { a: P.azulPoltrona2, A: P.azulPoltrona, m: P.metal2 };

// pessoa deitada na poltrona (vista de lado): cabeça, tronco, pernas
export const PESSOA = [
  '..hh..........',
  '.hppp.........',
  '.hppp.........',
  '..ppcc........',
  '....cccc......',
  '.....cccccjjjj',
  '......ccjjjjjjp',
];
const COR_PESSOA: Record<string, RGB> = { h: P.tronco0, p: P.pele, c: P.osso, j: P.tempestade2 };

// ── CENA: avião cruzando a tempestade sobre a selva
export const cenaAviaoTempestade = (p: Pincel, s: number, o: { clarao?: number } = {}) => {
  const { w, h } = p;
  const raio = relampago(s);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const n = fbm('nuv', x * 0.012 + s * 0.08, y * 0.03);
      const t = y / h * 0.6 + n * 0.45 + raio * 0.5;
      p.rampa(x, y, CEU_TEMPESTADE, t);
    }
  }
  // copa da floresta lá embaixo
  for (let x = 0; x < w; x++) {
    const topo = h - 34 + fbm('copa', x * 0.03 + s * 0.15, 0) * 10 + Math.sin(x * 0.35 + s) * 1.5;
    for (let y = Math.max(0, Math.floor(topo)); y < h; y++) p.rampa(x, y, FOLHAS, 0.35 - (y - topo) / 40 + raio * 0.3);
  }
  // avião sacudindo
  const ax = Math.round(w * 0.5) - 18 + Math.round(noise2D('sac', s * 3, 0) * 2);
  const ay = Math.round(h * 0.29 + noise2D('sac', s * 4, 5) * 3 + Math.sin(s * 2) * 2);
  p.sprite(AVIAO, COR_AVIAO, ax, ay);
  // clarão na asa
  const k = o.clarao ?? 0;
  if (k > 0) {
    p.disco(ax + 14, ay + 11, Math.round(2 + k * 6), P.fogo);
    p.disco(ax + 14, ay + 11, Math.round(1 + k * 3), P.fogo2);
  }
  // chuva diagonal
  for (let i = 0; i < 260; i++) {
    const rx = (i * 97.13 + s * 210) % (w + 40);
    const ry = (i * 41.7 + s * 330) % (h + 20);
    const x0 = Math.round(rx - 20), y0 = Math.round(ry - 10);
    p.linha(x0, y0, x0 - 2, y0 + 5, i % 3 ? P.nuvem : P.nuvemClara);
  }
  if (raio > 0.6) desenharRaio(p, Math.floor(s * 2), raio);
};

// ── CENA: POV deitado olhando para cima, a copa girando
export const cenaCopaGirando = (p: Pincel, s: number, o: { giro?: number; tontura?: number } = {}) => {
  const { w, h } = p;
  const cx = w / 2, cy = h / 2;
  const ang = (o.giro ?? 0.35) * s + 0.15 * Math.sin(s * 0.9) * (o.tontura ?? 1);
  const troncos = 9;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) * 0.9, dy = y - cy;
      const r = Math.hypot(dx, dy);
      const th = Math.atan2(dy, dx) + ang;
      const borda = 34 + noise2D('buraco', Math.cos(th) * 1.4, Math.sin(th) * 1.4) * 12 + noise2D('buraco', Math.cos(th) * 4, Math.sin(th) * 4) * 5;
      if (r < borda) {
        // céu nublado no buraco da copa
        const n = fbm('ceu', Math.cos(th) * r * 0.04 + s * 0.05, Math.sin(th) * r * 0.04);
        p.rampa(x, y, CEU_NUBLADO, 0.95 - r / borda * 0.5 + n * 0.25);
        continue;
      }
      // troncos convergindo para o centro (perspectiva de baixo para cima)
      const setor = ((th / (Math.PI * 2)) * troncos) % 1;
      const fase = (setor + 1) % 1;
      const larg = 0.035 + r * 0.0011;
      const dTronco = Math.min(fase, 1 - fase);
      const folhas = fbm('folha', Math.cos(th) * r * 0.06, Math.sin(th) * r * 0.06) + noise2D('folha2', th * 6, r * 0.08) * 0.3;
      const k = (r - borda) / 90; // 0 perto do céu, 1 na borda da tela
      if (dTronco < larg && folhas < 0.35 - k * 0.2) {
        p.rampa(x, y, TRONCO, 0.9 - dTronco / larg * 0.8 - k * 0.4);
        continue;
      }
      // folhagem: mais clara perto do céu (luz atravessando), escura na borda
      const t = 0.85 - k * 0.75 + folhas * 0.35;
      if (folhas > -0.05 || r < borda + 6) p.rampa(x, y, FOLHAS, t);
      else p.rampa(x, y, FOLHAS, t * 0.4);
    }
  }
  // vinheta pontilhada (visão turva de quem acabou de acordar)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const v = Math.hypot((x - cx) / cx, (y - cy) / cy);
    if (v > 0.8 && (v - 0.8) * 2.2 > bayer(x, y)) p.px(x, y, P.preto);
  }
};

// ── CENA: chão da selva, a poltrona caída e você nela (vista lateral, parallax)
export const cenaChaoSelva = (p: Pincel, s: number, o: { panorama?: number; pessoa?: boolean; luz?: number } = {}) => {
  const { w, h } = p;
  const pan = (o.panorama ?? 0) * s;
  const chao = Math.round(h * 0.77);
  // fundo: névoa verde-escura com feixes de luz
  for (let y = 0; y < chao; y++) for (let x = 0; x < w; x++) {
    const feixe = Math.max(0, 1 - Math.abs(((x + y * 0.55 + pan * 0.3) % 70) - 35) / 9) * (o.luz ?? 0.6) * (1 - y / chao);
    p.rampa(x, y, FOLHAS, 0.12 + (1 - y / chao) * 0.18 + feixe * 0.5 + fbm('nevoa', x * 0.02 + s * 0.03, y * 0.03) * 0.08);
  }
  // camadas de troncos: longe (escuro, lento) → perto (detalhado, rápido)
  const camada = (n: number, vel: number, largMin: number, largMax: number, tom: number, seed: number) => {
    for (let i = 0; i < n; i++) {
      const base = ((i * 137 + seed * 53) % (w + 60)) - 30;
      const xx = Math.round(((base - pan * vel) % (w + 60) + w + 60) % (w + 60) - 30);
      const lg = largMin + ((i * 31 + seed) % (largMax - largMin + 1));
      for (let y = 0; y < chao + 4; y++) for (let dx = 0; dx < lg; dx++) {
        const sombra = dx / lg;
        p.rampa(xx + dx, y, TRONCO, tom + (1 - sombra) * 0.35 - (y < 20 ? 0.2 : 0));
      }
      // raízes tabulares (sapopemas) na base
      for (let k = 0; k < 6; k++) p.linha(xx + lg / 2, chao - 10 + k, xx - 6 + k, chao + 2, TRONCO[1]);
      for (let k = 0; k < 6; k++) p.linha(xx + lg / 2, chao - 10 + k, xx + lg + 6 - k, chao + 2, TRONCO[1]);
    }
  };
  camada(7, 0.3, 4, 7, 0.0, 1);
  camada(4, 0.6, 9, 14, 0.15, 2);
  // folhagem pendurada no alto
  for (let y = 0; y < 46; y++) for (let x = 0; x < w; x++) {
    const n = fbm('dossel', (x + pan * 0.8) * 0.04, y * 0.07) - y / 60;
    if (n > 0.05) p.rampa(x, y, FOLHAS, 0.15 + n * 0.8);
  }
  // chão de folhas
  for (let y = chao; y < h; y++) for (let x = 0; x < w; x++) {
    const n = fbm('chao', (x + pan) * 0.08, y * 0.2);
    p.rampa(x, y, TERRA, 0.35 + n * 0.5 - (y - chao) / 70);
  }
  // a poltrona e você
  const px0 = Math.round(w / 2 - 8);
  p.sprite(POLTRONA, COR_POLTRONA, px0, chao - 8);
  if (o.pessoa !== false) p.sprite(PESSOA, COR_PESSOA, px0 + 1, chao - 9);
  // folhas grandes em primeiro plano, balançando
  for (let i = 0; i < 5; i++) {
    const bx = [0.03, 0.12, 0.78, 0.9, 0.98][i] * w - pan * 1.6;
    const by = h - 6;
    const ang = -1.2 + i * 0.5 + Math.sin(s * 1.3 + i) * 0.05;
    for (let t = 0; t < 34; t++) {
      const lx = bx + Math.cos(ang) * t, ly = by + Math.sin(ang) * t * 1.2;
      const larg = Math.sin((t / 34) * Math.PI) * 6;
      for (let q = -larg; q <= larg; q++) p.px(lx + q * 0.6, ly + q * 0.3, q > 0 ? P.folha1 : P.folha0);
    }
  }
};

// ── relâmpagos determinísticos
export const relampago = (s: number) => {
  let t = 0.7;
  let i = 0;
  while (t < s + 1) {
    const d = s - t;
    if (d >= 0 && d < 0.35) return Math.max(0, 1 - d / 0.07, d > 0.12 ? 0.7 * (1 - (d - 0.12) / 0.2) : 0);
    i++;
    t += 2.2 + ((i * 7919) % 17) / 10;
  }
  return 0;
};

const desenharRaio = (p: Pincel, semente: number, k: number) => {
  let x = 40 + ((semente * 7919) % 240);
  let y = 0;
  let i = 0;
  while (y < p.h - 40) {
    const nx = x + (((semente * 31 + i * 17) % 11) - 5);
    const ny = y + 6 + ((i * 13) % 5);
    p.linha(x, y, nx, ny, k > 0.8 ? P.raio : P.nuvemClara);
    x = nx;
    y = ny;
    i++;
  }
};

export const nuvemDeRuido = noise3D;
