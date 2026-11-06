import { noise2D } from '@remotion/noise';
import { P, Pincel, RGB, bayer } from './Pincel';
import { boneco } from './boneco';
import { AVIAO, cenaCopaGirando, relampago } from './cenas-selva';

// Cenas verticais (180x320) do Short 001 · "POV: você caiu de avião na Amazônia".

const FOLHAS = [P.folha0, P.folha1, P.folha2, P.folha3, P.folha4, P.folha5, P.folha6];
const TRONCO = [P.tronco0, P.tronco1, P.tronco2, P.tronco3];
const TERRA = [P.terra0, P.terra1, P.terra2, P.folha2, P.folha3];
const CEU = [P.tempestade2, P.nuvem, P.nuvemClara, P.ceu2, P.ceu3];
const FUMACA = [P.cinza2, P.cinza, P.nuvemClara, P.osso];
const fbm = (seed: string, x: number, y: number) => noise2D(seed, x, y) * 0.6 + noise2D(seed, x * 2.1, y * 2.1) * 0.3 + noise2D(seed, x * 4.3, y * 4.3) * 0.1;

// ── peças de cenário reutilizáveis ───────────────────────────────────────────

/** fundo da mata (névoa verde, feixes de luz, troncos em camadas, chão de folhas) */
export const fundoMata = (p: Pincel, s: number, o: { chao?: number; pan?: number; luz?: number; escuro?: number; chuva?: number } = {}) => {
  const { w, h } = p;
  const chao = o.chao ?? Math.round(h * 0.64);
  const pan = o.pan ?? 0;
  const esc = o.escuro ?? 0;
  for (let y = 0; y < chao; y++) for (let x = 0; x < w; x++) {
    const feixe = Math.max(0, 1 - Math.abs(((x + y * 0.5 + pan * 0.3 + 500) % 60) - 30) / 7) * (o.luz ?? 0.5) * (1 - y / chao);
    p.rampa(x, y, FOLHAS, 0.1 + (1 - y / chao) * 0.15 + feixe * 0.45 + fbm('nevoa', x * 0.025 + s * 0.03, y * 0.025) * 0.08 - esc * (x / w) * 0.4);
  }
  const camada = (n: number, vel: number, lmin: number, lmax: number, tom: number, seed: number) => {
    for (let i = 0; i < n; i++) {
      const base = (i * 61 + seed * 37) % (w + 30);
      const xx = Math.round(((base - pan * vel) % (w + 30) + w + 30) % (w + 30) - 15);
      const lg = lmin + ((i * 13 + seed) % (lmax - lmin + 1));
      for (let y = 0; y < chao + 3; y++) for (let dx = 0; dx < lg; dx++) p.rampa(xx + dx, y, TRONCO, tom + (1 - dx / lg) * 0.35 - esc * (xx / w) * 0.4);
      for (let k = 0; k < 5; k++) {
        p.linha(xx + lg / 2, chao - 8 + k, xx - 5 + k, chao + 1, TRONCO[1]);
        p.linha(xx + lg / 2, chao - 8 + k, xx + lg + 5 - k, chao + 1, TRONCO[1]);
      }
    }
  };
  camada(5, 0.3, 3, 6, 0, 1);
  camada(3, 0.6, 8, 12, 0.15, 2);
  for (let y = 0; y < 60; y++) for (let x = 0; x < w; x++) {
    const n = fbm('dossel', (x + pan * 0.8) * 0.045, y * 0.06) - y / 70;
    if (n > 0.04) p.rampa(x, y, FOLHAS, 0.12 + n * 0.8);
  }
  for (let y = chao; y < h; y++) for (let x = 0; x < w; x++) {
    p.rampa(x, y, TERRA, 0.35 + fbm('chao', (x + pan) * 0.09, y * 0.2) * 0.5 - (y - chao) / 90 - esc * (x / w) * 0.3);
  }
  if (o.chuva) chuva(p, s, o.chuva);
  return chao;
};

export const chuva = (p: Pincel, s: number, k = 1) => {
  for (let i = 0; i < 160 * k; i++) {
    const rx = (i * 57.13 + s * 60) % (p.w + 20);
    const ry = (i * 33.7 + s * 260) % (p.h + 20);
    const x0 = Math.round(rx - 10), y0 = Math.round(ry - 10);
    p.linha(x0, y0, x0 - 1, y0 + 4, i % 3 ? P.nuvem : P.nuvemClara);
  }
};

/** folhas grandes em primeiro plano (moldura) */
export const folhasFrente = (p: Pincel, s: number) => {
  const { w, h } = p;
  const pos: [number, number, number][] = [[0, h - 4, -1.1], [10, h, -1.5], [w, h - 8, -2.2], [w - 6, h, -1.8], [0, 40, -0.4], [w, 60, -2.8]];
  pos.forEach(([bx, by, a0], i) => {
    const ang = a0 + Math.sin(s * 1.2 + i) * 0.05;
    for (let t = 0; t < 40; t++) {
      const lx = bx + Math.cos(ang) * t, ly = by + Math.sin(ang) * t;
      const larg = Math.sin((t / 40) * Math.PI) * 7;
      for (let q = -larg; q <= larg; q++) p.px(lx - Math.sin(ang) * q, ly + Math.cos(ang) * q, q > 0 ? P.folha1 : P.folha0);
    }
  });
};

/** fuselagem partida (vista lateral), x,y = canto inferior esquerdo */
export const fuselagem = (p: Pincel, x: number, y: number, o: { quente?: number; s?: number } = {}) => {
  const L = 54, A = 17;
  for (let j = 0; j < A; j++) for (let i = 0; i < L; i++) {
    const topo = Math.abs(j - A / 2) / (A / 2);
    if (i > L - 8 && (i - (L - 8)) * 2.2 > (A - j) + ((j * 7) % 5)) continue; // borda rasgada
    let c: RGB = topo > 0.85 ? P.cinza : P.osso;
    if (j === 8 || j === 9) c = P.vermelho;
    if (j >= 4 && j <= 6 && i % 6 < 3 && i > 4 && i < L - 12) c = P.noite; // janelas
    if (j > A - 4) c = P.metal2;
    const sujo = fbm('sujeira', i * 0.2, j * 0.3);
    if (sujo > 0.35) c = P.cinza2;
    p.px(x + i, y - A + j, c);
  }
  // contorno
  for (let i = 0; i < L - 6; i++) { p.px(x + i, y - A - 1, P.preto); p.px(x + i, y, P.preto); }
  // motor quente
  const k = o.quente ?? 0;
  if (k > 0) {
    const fl = 0.6 + 0.4 * Math.sin((o.s ?? 0) * 13);
    p.ret(x + 8, y - A - 7, 14, 7, P.metal2);
    p.velar(x + 9, y - A - 6, 12, 5, P.fogo, k * fl * 0.7);
    // ar quente ondulando
    for (let j = 0; j < 12; j++) for (let i = 0; i < 14; i++) if ((Math.sin(j * 1.3 + (o.s ?? 0) * 8) + 1) * 0.3 * k > bayer(i, j) + 0.3) p.px(x + 8 + i + Math.round(Math.sin(j + (o.s ?? 0) * 6)), y - A - 9 - j, P.nuvemClara);
  }
};

/** asa solta e pedaços menores no chão */
export const pedacos = (p: Pincel, x: number, y: number) => {
  for (let i = 0; i < 40; i++) for (let j = 0; j < 4; j++) p.px(x + i + j * 2, y - j, j === 3 ? P.cinza : P.osso);
  p.ret(x + 30, y - 4, 6, 2, P.vermelho);
  [[50, 0, 5, 3], [58, -1, 3, 2], [-12, 0, 6, 2], [-20, 0, 3, 2]].forEach(([a, b, c, d]) => p.ret(x + a, y + b - d, c, d, P.metal));
};

/** fogo pixelado */
export const fogo = (p: Pincel, x: number, y: number, s: number, tam = 1) => {
  for (let j = 0; j < 16 * tam; j++) {
    const larg = (1 - j / (16 * tam)) * 6 * tam;
    for (let i = -larg; i <= larg; i++) {
      const n = noise2D('fogo', i * 0.3, j * 0.25 - s * 6);
      const t = j / (16 * tam) + Math.abs(i) / (larg + 1) * 0.5 - n * 0.4;
      if (t < 0.35) p.px(x + i, y - j, P.fogo2);
      else if (t < 0.65) p.px(x + i, y - j, P.fogo);
      else if (t < 0.85) p.px(x + i, y - j, P.vermelho);
    }
  }
  // lenha
  p.linha(x - 7, y + 1, x + 7, y - 1, P.tronco2);
  p.linha(x - 7, y - 1, x + 7, y + 1, P.tronco1);
};

/** coluna de fumaça (bolhas pontilhadas subindo e alargando) */
export const fumaca = (p: Pincel, x: number, y: number, s: number, altura: number, grossa = 1, deriva = 0.15) => {
  for (let k = 0; k < 26 * grossa; k++) {
    const vida = ((s * 0.18 + k / (26 * grossa)) % 1);
    const cy = y - vida * altura;
    const cx = x + Math.sin(k * 1.7 + s) * 3 + vida * altura * deriva;
    const r = 3 + vida * 14 * grossa;
    for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j) / r;
      if (d > 1) continue;
      const a = (1 - d) * (1 - vida * 0.75) * 1.4;
      if (a > bayer(cx + i, cy + j)) p.rampa(cx + i, cy + j, FUMACA, 0.25 + (1 - d) * 0.4 - vida * 0.2);
    }
  }
};

/** pálpebras: 0 = fechado, 1 = aberto */
export const palpebras = (p: Pincel, abre: number) => {
  const { w, h } = p;
  const meia = (h / 2) * (1 - abre);
  for (let x = 0; x < w; x++) {
    const curva = Math.sin((x / w) * Math.PI) * 18 * abre;
    for (let y = 0; y < meia + 18 - curva; y++) p.px(x, y, P.preto);
    for (let y = h - meia - 18 + curva; y < h; y++) p.px(x, y, P.preto);
  }
};

// ── cenas ────────────────────────────────────────────────────────────────────

export const cenaAcordar = (p: Pincel, s: number, t: number) => {
  cenaCopaGirando(p, s, { giro: 0.5 * (1 - t * 0.6), tontura: 1.5 });
  // abre, fecha, abre (piscadas pesadas)
  const abre = t < 0.25 ? t / 0.25 * 0.5 : t < 0.35 ? 0.5 - (t - 0.25) / 0.1 * 0.4 : Math.min(1, 0.1 + (t - 0.35) / 0.3);
  palpebras(p, abre);
};

export const cenaPreso = (p: Pincel, s: number, o: { garota?: boolean } = {}) => {
  const chao = fundoMata(p, s, { pan: s * 1.5, luz: 0.55 });
  // poltrona tombada (grande)
  const cx = Math.round(p.w / 2) - 24, cy = chao + 6;
  const A = P.azulPoltrona, A2 = P.azulPoltrona2;
  p.ret(cx, cy - 8, 40, 8, A);
  p.ret(cx, cy - 2, 40, 2, A2);
  for (let j = 0; j < 22; j++) p.ret(cx - 4 + Math.round(j * 0.35), cy - 8 - j, 8, 1, j % 7 === 0 ? A2 : A);
  p.ret(cx + 6, cy, 2, 4, P.metal2);
  p.ret(cx + 32, cy, 2, 4, P.metal2);
  boneco(p, cx + 18, cy - 7, 'deitado', s);
  // cinto
  p.ret(cx + 12, cy - 12, 14, 2, P.cinza2);
  p.ret(cx + 17, cy - 13, 4, 4, P.metal);
  if (o.garota) {
    // cabelo comprido espalhado
    p.ret(cx + 3, cy - 14, 9, 3, P.tronco0);
    p.ret(cx + 1, cy - 12, 5, 4, P.tronco0);
  }
  folhasFrente(p, s);
};

export const cenaPartiu = (p: Pincel, s: number, t: number) => {
  const { w, h } = p;
  const raio = Math.max(relampago(s), t > 0.15 && t < 0.25 ? 1 - (t - 0.15) / 0.1 : 0);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    p.rampa(x, y, [P.noite, P.noite2, P.tempestade, P.tempestade2, P.nuvem], y / h * 0.5 + fbm('nuv', x * 0.02 + s * 0.1, y * 0.015) * 0.45 + raio * 0.5);
  }
  for (let x = 0; x < w; x++) {
    const topo = h - 50 + fbm('copa', x * 0.04, 0) * 10;
    for (let y = Math.floor(topo); y < h; y++) p.rampa(x, y, FOLHAS, 0.35 - (y - topo) / 50 + raio * 0.3);
  }
  // o avião se parte: metade da frente cai girando, a de trás se afasta
  const sep = Math.max(0, t - 0.2) * 45;
  const ax = Math.round(p.w / 2) - 18, ay = Math.round(p.h * 0.33 + t * 30);
  const frente = AVIAO.map((l) => l.slice(0, 18));
  const tras = AVIAO.map((l) => '.'.repeat(18) + l.slice(18));
  const cores: Record<string, RGB> = { o: P.cinza2, w: P.osso, b: P.noite, r: P.vermelho, v: P.vermelho, g: P.metal2 };
  p.sprite(frente, cores, Math.round(ax - sep), Math.round(ay + sep * 0.9));
  p.sprite(tras, cores, Math.round(ax + sep * 0.6), Math.round(ay - sep * 0.2 + sep * sep * 0.01));
  if (t > 0.18) {
    for (let i = 0; i < 18; i++) {
      const a = i * 2.1, v = sep * (0.6 + (i % 5) * 0.2);
      p.ret(Math.round(ax + 18 + Math.cos(a) * v), Math.round(ay + 6 + Math.sin(a) * v + sep * 0.5), 2, 1, i % 2 ? P.metal : P.fogo);
    }
    p.disco(ax + 18, ay + 6, Math.round(3 + Math.min(1, (t - 0.18) * 6) * 5), P.fogo);
    p.disco(ax + 18, ay + 6, Math.round(1 + Math.min(1, (t - 0.18) * 6) * 2), P.fogo2);
  }
  chuva(p, s, 1);
};

export const cenaDestrocos = (p: Pincel, s: number) => {
  const chao = fundoMata(p, s, { pan: s * 1, luz: 0.35 });
  fuselagem(p, 8, chao + 4);
  pedacos(p, 70, chao + 10);
  fumaca(p, 56, chao - 12, s, chao, 1);
  folhasFrente(p, s);
};

export const cenaAndar = (p: Pincel, s: number, t: number, parado = false) => {
  const chao = fundoMata(p, s, { pan: 0, luz: 0.25, escuro: 0.6 + t * 0.4 });
  fuselagem(p, -36, chao + 4);
  const x = parado ? p.w * 0.66 : p.w * 0.36 + t * p.w * 0.32;
  boneco(p, Math.round(x), chao + 4, parado ? 'em-pe' : 'andando', s, 1, true);
  // a mata engolindo à direita
  for (let y = 0; y < p.h; y++) for (let i = 0; i < p.w; i++) if ((i / p.w - 0.55) * 1.6 > bayer(i, y)) p.px(i, y, P.folha0);
};

export const cenaVistaDeCima = (p: Pincel, s: number, t: number) => {
  const { w, h } = p;
  const cx = w / 2, cy = h * 0.42;
  const zoom = 1 - t * 0.35; // a câmera sobe
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const X = (x - cx) / zoom, Y = (y - cy) / zoom;
    const d = Math.hypot(X / 1.2, Y) - 22 - noise2D('clareira', X * 0.05, Y * 0.05) * 8;
    if (d < 0) {
      p.rampa(x, y, TERRA, 0.45 + fbm('chao2', X * 0.1, Y * 0.1) * 0.3);
      continue;
    }
    const n = fbm('copas', X * 0.05, Y * 0.05) + noise2D('copas2', X * 0.18, Y * 0.18) * 0.25;
    p.rampa(x, y, FOLHAS, 0.25 + n * 0.55 + Math.min(1, d / 10) * 0.05);
  }
  // destroços (vistos de cima): fuselagem branca com faixa vermelha, asa
  const r = (a: number, b: number, ww: number, hh: number, c: RGB) => p.ret(Math.round(cx + a * zoom), Math.round(cy + b * zoom), Math.max(1, Math.round(ww * zoom)), Math.max(1, Math.round(hh * zoom)), c);
  r(-18, -4, 30, 7, P.osso);
  r(-18, -1, 30, 1, P.vermelho);
  r(-4, -16, 6, 30, P.osso);
  r(10, 6, 9, 4, P.cinza);
  // a pessoa: um ponto que entra na mata e some
  const k = Math.min(1, t * 1.4);
  const px = cx + (8 + k * 40) * zoom, py = cy + (12 + k * 30) * zoom;
  const sob = k > 0.6; // debaixo das copas: invisível
  if (!sob || bayer(Math.round(s * 30), 0) > (k - 0.6) * 2.5) p.ret(Math.round(px), Math.round(py), 2, 2, sob ? P.folha2 : P.vermelho);
};

export const cenaPerto = (p: Pincel, s: number, o: { quente?: number; pose?: 'em-pe' | 'sentado' | 'respirando' | 'enfaixando'; x?: number } = {}) => {
  const chao = fundoMata(p, s, { pan: 0, luz: 0.45 });
  fuselagem(p, -6, chao + 4, { quente: o.quente, s });
  if (o.quente) {
    // poça de combustível
    for (let i = 0; i < 26; i++) for (let j = 0; j < 3; j++) p.pontilhar(14 + i, chao + 6 + j, P.noite, (i + Math.round(s * 4)) % 9 < 2 ? P.agua3 : P.tempestade2, 0.6);
  }
  boneco(p, Math.round((o.x ?? 0.72) * p.w), chao + 8, o.pose ?? 'em-pe', s, -1);
  folhasFrente(p, s);
};

export const cenaAbrigo = (p: Pincel, s: number) => {
  const chao = fundoMata(p, s, { pan: 0, luz: 0.2, chuva: 1 });
  fuselagem(p, -34, chao + 4);
  // painel do avião encostado no tronco, com folhas por cima
  const x0 = Math.round(p.w * 0.3);
  for (let i = 0; i < 52; i++) {
    const y0 = chao + 4 - Math.round(i * 0.75);
    for (let j = 0; j < 3; j++) p.px(x0 + i, y0 - j, j === 0 ? P.cinza : P.osso);
  }
  for (let i = 0; i < 50; i += 2) p.ret(x0 + 2 + i, chao - Math.round(i * 0.75) - 4, 3, 2, i % 4 ? P.folha3 : P.folha4);
  boneco(p, x0 + 26, chao + 6, 'sentado', s, -1);
};

export const cenaFogueiraFumaca = (p: Pincel, s: number) => {
  const { w, h } = p;
  // céu em cima, linha das copas no meio, clareira embaixo
  const linha = Math.round(h * 0.42);
  for (let y = 0; y < linha + 10; y++) for (let x = 0; x < w; x++) p.rampa(x, y, CEU, 0.75 - y / linha * 0.45 + fbm('ceu', x * 0.02 + s * 0.02, y * 0.02) * 0.2);
  for (let x = 0; x < w; x++) {
    const topo = linha + fbm('copa', x * 0.05, 1) * 14;
    for (let y = Math.floor(topo); y < h; y++) p.rampa(x, y, FOLHAS, 0.55 - (y - topo) / 80 + fbm('cf', x * 0.06, y * 0.06) * 0.25);
  }
  const chao = Math.round(h * 0.7);
  for (let y = chao; y < h; y++) for (let x = 0; x < w; x++) p.rampa(x, y, TERRA, 0.45 + fbm('chao', x * 0.1, y * 0.2) * 0.4);
  fumaca(p, w / 2, chao - 6, s, chao - 10, 1.4, 0.05);
  fogo(p, Math.round(w / 2), chao, s, 1);
  boneco(p, Math.round(w / 2) + 24, chao + 2, 'em-pe', s, -1);
};

export const cenaClaroDeCima = (p: Pincel, s: number, t: number) => {
  cenaVistaDeCima(p, s, 0);
  const { w, h } = p;
  const cx = w / 2, cy = h * 0.42;
  // peças claras espalhadas aparecendo uma a uma
  const pecas: [number, number, number, number][] = [[-30, -20, 8, 3], [20, -18, 6, 4], [-26, 14, 7, 3], [24, 16, 8, 3], [0, 24, 10, 2], [-6, -26, 9, 2], [32, 0, 3, 8], [-34, 0, 3, 7]];
  pecas.forEach(([a, b, ww, hh], i) => {
    if (t * pecas.length > i) p.ret(Math.round(cx + a), Math.round(cy + b), ww, hh, i % 3 === 0 ? P.vermelho : P.osso);
  });
};

export const cenaGarrafa = (p: Pincel, s: number) => {
  const { w, h } = p;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.rampa(x, y, [P.preto, P.noite, P.folha0, P.folha1], 0.4 - Math.hypot(x - w / 2, y - h * 0.45) / 160);
  // garrafa vazia deitada
  const gx = Math.round(w / 2) - 17, gy = Math.round(h * 0.5);
  for (let i = 0; i < 32; i++) for (let j = 0; j < 12; j++) {
    const borda = j === 0 || j === 11 || i === 0;
    const gargalo = i > 26 && (j < 3 || j > 8);
    if (gargalo) continue;
    p.px(gx + i, gy + j, borda ? P.agua3 : (j < 3 ? P.osso : P.agua1));
  }
  p.ret(gx + 32, gy + 3, 3, 6, P.vermelho);
};

export const cenaFerver = (p: Pincel, s: number) => {
  const { w, h } = p;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.rampa(x, y, [P.preto, P.noite, P.folha0, P.folha1, P.folha2], 0.45 - Math.hypot(x - w / 2, y - h * 0.6) / 170 + fbm('n', x * 0.03, y * 0.03 - s * 0.1) * 0.08);
  const cx = Math.round(w / 2), base = Math.round(h * 0.6);
  fogo(p, cx, base + 6, s, 1.3);
  // panela
  p.ret(cx - 18, base - 18, 36, 18, P.metal2);
  p.ret(cx - 18, base - 18, 36, 2, P.metal);
  p.ret(cx - 22, base - 16, 4, 2, P.metal2);
  p.ret(cx + 18, base - 16, 4, 2, P.metal2);
  // água fervendo
  for (let i = 0; i < 32; i++) {
    const b = Math.sin(i * 1.7 + s * 14) > 0.6 ? 1 : 0;
    p.ret(cx - 16 + i, base - 20 - b, 1, 2, b ? P.agua3 : P.agua2);
  }
  fumaca(p, cx, base - 22, s * 1.5, 90, 0.6, 0.02);
};

export const cenaAviaoPassa = (p: Pincel, s: number, t: number) => {
  const { w, h } = p;
  // céu só aparece em frestas pequenas; avião cruza por cima
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.rampa(x, y, CEU, 0.7);
  const px = Math.round(-40 + t * (w + 80));
  const py = 34;
  // silhueta do avião de resgate (escura contra o céu)
  p.ret(px, py, 30, 4, P.cinza2);
  p.ret(px + 10, py - 1, 8, 6, P.cinza2);
  p.ret(px + 2, py - 4, 3, 4, P.cinza2);
  p.ret(px + 12, py + 1, 22, 2, P.tempestade2);
  // copa densa cobrindo quase tudo
  for (let y = 0; y < h * 0.62; y++) for (let x = 0; x < w; x++) {
    const n = fbm('fechada', x * 0.04, y * 0.04) + noise2D('fechada2', x * 0.15, y * 0.15) * 0.2;
    if (n > -0.32 + y / h * 0.2) p.rampa(x, y, FOLHAS, 0.2 + n * 0.5 + (1 - y / h) * 0.2);
  }
  const base = Math.round(h * 0.66);
  for (let y = Math.round(h * 0.62); y < h; y++) for (let x = 0; x < w; x++) p.rampa(x, y, TERRA, 0.4 + fbm('chao', x * 0.1, y * 0.2) * 0.4);
  for (let y = Math.round(h * 0.42); y < h * 0.62; y++) for (let x = 0; x < w; x++) p.rampa(x, y, FOLHAS, 0.08 + fbm('sub', x * 0.05, y * 0.05) * 0.1);
  boneco(p, Math.round(w / 2), base + 4, 'acenando', s, 1);
};

export const cenaSinal = (p: Pincel, s: number, t: number) => {
  const { w, h } = p;
  const linha = Math.round(h * 0.5);
  for (let y = 0; y < linha + 10; y++) for (let x = 0; x < w; x++) p.rampa(x, y, CEU, 0.8 - y / linha * 0.4 + fbm('ceu', x * 0.02, y * 0.02) * 0.15);
  // avião ao longe vindo em direção à fumaça
  const px = Math.round(w - t * 70), py = Math.round(40 + t * 20);
  p.ret(px, py, 12, 2, P.cinza2);
  p.ret(px + 4, py - 1, 3, 4, P.cinza2);
  for (let x = 0; x < w; x++) {
    const topo = linha + fbm('copa', x * 0.05, 3) * 12;
    for (let y = Math.floor(topo); y < h; y++) p.rampa(x, y, FOLHAS, 0.5 - (y - topo) / 90 + fbm('cf', x * 0.06, y * 0.06) * 0.25);
  }
  fumaca(p, Math.round(w * 0.42), linha + 10, s, linha + 10, 1.6, 0.04);
};

export const cenaFinal = (p: Pincel, s: number) => {
  const { w, h } = p;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.rampa(x, y, [P.preto, P.noite, P.folha0], 0.3 - Math.hypot(x - w / 2, y - h / 2) / 200 + fbm('n', x * 0.03, y * 0.03 + s * 0.05) * 0.1);
};
