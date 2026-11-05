import type { Cena, Episodio } from './tipos';

export const FPS = 30;
// Narração dramática em PT-BR: ~2,4 palavras por segundo (≈145 ppm).
export const PALAVRAS_POR_SEGUNDO = 2.4;
const RESPIRO = 0.8; // segundos de ar no fim de cada cena

export const textoLimpo = (t: string) => t.replace(/\*/g, '');
export const contarPalavras = (t: string) => textoLimpo(t).split(/\s+/).filter(Boolean).length;

export const duracaoCena = (c: Cena) =>
  Math.ceil((contarPalavras(c.narracao) / PALAVRAS_POR_SEGUNDO + RESPIRO + (c.duracaoExtra ?? 0)) * FPS);

export type CenaNoTempo = Cena & { inicio: number; duracao: number };

export const linhaDoTempo = (ep: Episodio): CenaNoTempo[] => {
  let t = 0;
  return ep.cenas.map((c) => {
    const d = duracaoCena(c);
    const r = { ...c, inicio: t, duracao: d };
    t += d;
    return r;
  });
};

export const duracaoTotal = (ep: Episodio) => ep.cenas.reduce((s, c) => s + duracaoCena(c), 0);

export const formatarTempo = (frames: number) => {
  const s = Math.floor(frames / FPS);
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
};
