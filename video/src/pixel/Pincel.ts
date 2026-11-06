// Pincel de pixel art: desenha numa ImageData de baixa resolução (ex.: 320x180),
// sempre com cores de uma paleta fixa, com pontilhado (dithering) ordenado de Bayer.
// Tudo determinístico: o mesmo frame gera os mesmos pixels.

export type RGB = [number, number, number];
export const hex = (h: string): RGB => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

// Paleta do canal para pixel art (sombria, com o vermelho e o osso da marca)
export const P = {
  preto: hex('#060606'),
  noite: hex('#0b0f1a'),
  noite2: hex('#141c2e'),
  tempestade: hex('#222c44'),
  tempestade2: hex('#38445e'),
  nuvem: hex('#56637e'),
  nuvemClara: hex('#7d89a2'),
  raio: hex('#e8f0ff'),
  folha0: hex('#08100b'),
  folha1: hex('#0f1d14'),
  folha2: hex('#16301d'),
  folha3: hex('#204527'),
  folha4: hex('#2f6131'),
  folha5: hex('#4c8a3a'),
  folha6: hex('#7fb34a'),
  tronco0: hex('#120c09'),
  tronco1: hex('#24170f'),
  tronco2: hex('#3d2918'),
  tronco3: hex('#5c4128'),
  terra0: hex('#140e0a'),
  terra1: hex('#2a1c12'),
  terra2: hex('#45301c'),
  agua0: hex('#0d1f28'),
  agua1: hex('#1d3a4a'),
  agua2: hex('#2f5e6e'),
  agua3: hex('#6aa0a8'),
  ceu1: hex('#3b5f7a'),
  ceu2: hex('#6f97a8'),
  ceu3: hex('#b8d0cc'),
  sol: hex('#f4e3b0'),
  osso: hex('#ece6dc'),
  cinza: hex('#8a8580'),
  cinza2: hex('#4a4744'),
  metal: hex('#a9b0b8'),
  metal2: hex('#6b737c'),
  vermelho: hex('#e3141f'),
  vermelho2: hex('#8a0c12'),
  pele: hex('#c88a64'),
  pele2: hex('#8a5a3e'),
  fogo: hex('#ff8a2a'),
  fogo2: hex('#ffd06a'),
  azulPoltrona: hex('#2b4a7a'),
  azulPoltrona2: hex('#1a2f52'),
};
export type NomeCor = keyof typeof P;

const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => (v + 0.5) / 16);
export const bayer = (x: number, y: number) => BAYER[(y & 3) * 4 + (x & 3)];

export class Pincel {
  readonly w: number;
  readonly h: number;
  readonly d: Uint8ClampedArray;
  constructor(w: number, h: number, dados?: Uint8ClampedArray) {
    this.w = w;
    this.h = h;
    this.d = dados ?? new Uint8ClampedArray(w * h * 4);
  }
  px(x: number, y: number, c: RGB) {
    x |= 0;
    y |= 0;
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    this.d[i] = c[0];
    this.d[i + 1] = c[1];
    this.d[i + 2] = c[2];
    this.d[i + 3] = 255;
  }
  ler(x: number, y: number): RGB {
    const i = ((y | 0) * this.w + (x | 0)) * 4;
    return [this.d[i], this.d[i + 1], this.d[i + 2]];
  }
  /** pixel que mistura duas cores pelo pontilhado: t = 0 → a, t = 1 → b */
  pontilhar(x: number, y: number, a: RGB, b: RGB, t: number) {
    this.px(x, y, t > bayer(x, y) ? b : a);
  }
  /** degradê pontilhado por uma lista de cores (rampa), t de 0 a 1 */
  rampa(x: number, y: number, cores: RGB[], t: number) {
    const n = cores.length - 1;
    const v = Math.max(0, Math.min(0.9999, t)) * n;
    const i = Math.floor(v);
    this.pontilhar(x, y, cores[i], cores[Math.min(n, i + 1)], v - i);
  }
  ret(x: number, y: number, w: number, h: number, c: RGB) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.px(x + i, y + j, c);
  }
  linha(x0: number, y0: number, x1: number, y1: number, c: RGB) {
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let e = dx + dy;
    for (;;) {
      this.px(x0, y0, c);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  disco(cx: number, cy: number, r: number, c: RGB) {
    for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r * 0.6) this.px(cx + x, cy + y, c);
  }
  /** escurece (k<0) ou clareia em direção a uma cor, pontilhado */
  velar(x: number, y: number, w: number, h: number, c: RGB, t: number) {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) if (t > bayer(x + i, y + j)) this.px(x + i, y + j, c);
  }
  /** sprite: linhas de texto, um caractere por pixel; '.' é transparente */
  sprite(arte: string[], cores: Record<string, RGB>, x: number, y: number, espelhar = false) {
    arte.forEach((linha, j) => {
      for (let i = 0; i < linha.length; i++) {
        const ch = linha[espelhar ? linha.length - 1 - i : i];
        if (ch === '.' || ch === ' ') continue;
        const c = cores[ch];
        if (c) this.px(x + i, y + j, c);
      }
    });
  }
}
