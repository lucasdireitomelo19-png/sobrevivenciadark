import type { Hora } from '../roteiro/tipos';

// Paletas de luz por hora do dia. Color grading "documentário": sombras frias, luz quente.
export type Atmosfera = {
  ceuTopo: string;
  ceuHorizonte: string;
  neblina: string;
  sol: string;
  solIntensidade: number;
  solDirecao: [number, number, number];
  hemisferioCeu: string;
  hemisferioChao: string;
  hemisferioIntensidade: number;
  neblinaBase: number; // densidade FogExp2 base
  exposicao: number;
  lua?: boolean;
};

export const ATMOSFERAS: Record<Hora, Atmosfera> = {
  noite: {
    ceuTopo: '#010207',
    ceuHorizonte: '#0c1626',
    neblina: '#0b1422',
    sol: '#8ea6d6',
    solIntensidade: 0.55,
    solDirecao: [-0.4, 0.7, -0.6],
    hemisferioCeu: '#2a3c5e',
    hemisferioChao: '#06070b',
    hemisferioIntensidade: 0.55,
    neblinaBase: 0.0026,
    exposicao: 1.05,
    lua: true,
  },
  crepusculo: {
    ceuTopo: '#121a33',
    ceuHorizonte: '#c4582c',
    neblina: '#3d3446',
    sol: '#ff9156',
    solIntensidade: 1.8,
    solDirecao: [-0.8, 0.12, -0.55],
    hemisferioCeu: '#5b6a92',
    hemisferioChao: '#1c1418',
    hemisferioIntensidade: 0.6,
    neblinaBase: 0.0018,
    exposicao: 1,
  },
  amanhecer: {
    ceuTopo: '#22365e',
    ceuHorizonte: '#e8a59a',
    neblina: '#7f86a4',
    sol: '#ffc29c',
    solIntensidade: 1.4,
    solDirecao: [0.75, 0.16, -0.6],
    hemisferioCeu: '#8a9cc6',
    hemisferioChao: '#2a2630',
    hemisferioIntensidade: 0.7,
    neblinaBase: 0.0016,
    exposicao: 1,
  },
  dia: {
    ceuTopo: '#5f7189',
    ceuHorizonte: '#b6c0cb',
    neblina: '#a3adba',
    sol: '#e6ecf3',
    solIntensidade: 1.25,
    solDirecao: [0.3, 0.55, -0.7],
    hemisferioCeu: '#c3ccd8',
    hemisferioChao: '#3c4048',
    hemisferioIntensidade: 0.8,
    neblinaBase: 0.0014,
    exposicao: 0.95,
  },
};

export const densidadeNeblina = (hora: Hora, neblina = 0.3) => ATMOSFERAS[hora].neblinaBase * (0.35 + neblina * 2.4);
