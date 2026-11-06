import { P, Pincel, RGB } from './Pincel';

// Personagem em pixel art (você, o sobrevivente), montado por partes para animar.
// Desenha numa camada própria e depois aplica contorno escuro de 1 px (estilo 16 bits).

export type Pose = 'em-pe' | 'andando' | 'sentado' | 'acenando' | 'deitado' | 'enfaixando' | 'respirando';

const PELE = P.pele;
const PELE2 = P.pele2;
const CABELO = P.tronco0;
const CAMISA = hex2('#c9c3b6');
const CAMISA2 = hex2('#8e8a80');
const CALCA = hex2('#2c3a52');
const CALCA2 = hex2('#1c2638');
const BOTA = hex2('#2a1c12');
const FAIXA = hex2('#f4f1ea');
const SANGUE = P.vermelho2;

function hex2(h: string): RGB {
  return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
}

/**
 * Desenha o boneco com os pés em (x, y). `f` = tempo (s) para animar; `lado` 1 = olhando à direita.
 */
export const boneco = (alvo: Pincel, x: number, y: number, pose: Pose, f: number, lado: 1 | -1 = 1, costas = false) => {
  const W = 26;
  const H = 34;
  const c = new Pincel(W, H);
  const r = (x0: number, y0: number, w: number, h: number, cor: RGB) => c.ret(x0, y0, w, h, cor);
  const bx = 9; // origem do tronco na camada
  const pe = H - 1;

  if (pose === 'deitado') {
    // deitado de costas, cabeça à esquerda
    r(2, pe - 6, 6, 6, PELE);
    r(2, pe - 7, 6, 2, CABELO);
    r(8, pe - 6, 9, 5, CAMISA);
    r(8, pe - 2, 9, 1, CAMISA2);
    r(17, pe - 5, 7, 4, CALCA);
    r(23, pe - 5, 2, 4, BOTA);
  } else {
    const sentado = pose === 'sentado' || pose === 'enfaixando' || pose === 'respirando';
    const passo = pose === 'andando' ? Math.round(Math.sin(f * 9) * 2) : 0;
    const resp = pose === 'respirando' ? Math.round((Math.sin(f * 2.2) + 1) * 0.5) : 0;
    const quadril = sentado ? pe - 6 : pe - 11;
    const ombro = quadril - 10 - resp;
    // pernas
    if (sentado) {
      r(bx, quadril, 8, 3, CALCA);
      r(bx + 6, quadril, 3, 6, CALCA2);
      r(bx + 1, quadril + 3, 5, 3, CALCA);
      r(bx + 6, pe - 1, 4, 2, BOTA);
      r(bx + 1, pe - 1, 4, 2, BOTA);
    } else {
      r(bx + 1 + passo, quadril, 3, 10, CALCA);
      r(bx + 5 - passo, quadril, 3, 10, CALCA2);
      r(bx + passo, pe - 1, 4, 2, BOTA);
      r(bx + 5 - passo, pe - 1, 4, 2, BOTA);
    }
    // tronco
    r(bx, ombro, 9, 11, CAMISA);
    r(bx + 7, ombro + 1, 2, 10, CAMISA2);
    r(bx + 2, ombro + 4, 2, 2, SANGUE); // camisa rasgada / manchada
    // braços
    if (pose === 'acenando') {
      const a = Math.round(Math.sin(f * 10) * 2);
      r(bx - 2 + a, ombro - 8, 2, 9, PELE);
      r(bx + 9 - a, ombro - 8, 2, 9, PELE2);
      r(bx - 2, ombro, 2, 3, CAMISA);
      r(bx + 9, ombro, 2, 3, CAMISA2);
    } else if (pose === 'enfaixando') {
      r(bx - 2, ombro + 1, 2, 9, PELE);
      r(bx - 2, ombro + 3, 2, 4, FAIXA);
      const m = Math.round(Math.sin(f * 6) * 1);
      r(bx + 1, ombro + 4 + m, 5, 2, PELE2); // a outra mão enrolando a faixa
    } else {
      const bal = pose === 'andando' ? Math.round(Math.sin(f * 9 + 3) * 1) : 0;
      r(bx - 2, ombro + 1 + bal, 2, 10, PELE);
      r(bx + 9, ombro + 1 - bal, 2, 10, PELE2);
      r(bx - 2, ombro + 1, 2, 3, CAMISA);
      r(bx + 9, ombro + 1, 2, 3, CAMISA2);
    }
    // cabeça
    const cy = ombro - 7;
    r(bx + 1, cy, 7, 7, PELE);
    r(bx + 6, cy + 1, 2, 6, PELE2);
    r(bx + 1, cy - 1, 7, 2, CABELO);
    if (costas) r(bx + 1, cy, 7, 5, CABELO);
    else {
      r(bx, cy, 2, 3, CABELO);
      c.px(bx + 5, cy + 3, P.preto); // olho
      c.px(bx + 3, cy + 3, P.preto);
      r(bx + 5, cy + 5, 2, 1, PELE2);
    }
  }

  // blit com contorno escuro e espelhamento
  const pinta = (i: number, j: number) => c.d[(j * W + i) * 4 + 3] > 0;
  const ox = x - Math.floor(W / 2);
  const oy = y - H + 1;
  for (let j = 0; j < H; j++) {
    for (let i = 0; i < W; i++) {
      const si = lado === 1 ? i : W - 1 - i;
      if (pinta(si, j)) {
        alvo.px(ox + i, oy + j, c.ler(si, j));
      } else {
        const viz = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => {
          const ni = si + a, nj = j + b;
          return ni >= 0 && nj >= 0 && ni < W && nj < H && pinta(ni, nj);
        });
        if (viz) alvo.px(ox + i, oy + j, P.preto);
      }
    }
  }
};
