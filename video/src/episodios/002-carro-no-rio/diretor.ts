import * as THREE from 'three';
import { noise2D } from '@remotion/noise';
import narracao from '../../../public/narracao/002-short.json';
import { clamp, easeInOut, lerp, smoothstep } from '../../motor/matematica';
import type { EstadoCarro } from '../../mundo/rio/Carro';
import type { Vec3 } from '../../roteiro/tipos';

// "Diretor" do Short 002: para cada instante (segundos do vídeo) decide onde está o
// carro, onde está a câmera e o que acontece em cena. Os tempos vêm da narração
// (ElevenLabs, tempo de cada palavra), então imagem e voz ficam sempre sincronizadas.

export type Bloco = { texto: string; inicio: number; fim: number; palavras: { texto: string; inicio: number; fim: number }[] };
export const NARRACAO = narracao as { voz: string; duracao: number; blocos: Bloco[] };
export const B = NARRACAO.blocos;
export const OFFSET = 0.3; // respiro antes da primeira palavra
export const FIM_VIDEO = OFFSET + NARRACAO.duracao + 3.2;

/** tempo (no vídeo) de uma palavra: bloco i, palavra que começa com `p` */
export const tPalavra = (i: number, p: string, n = 0) => {
  const ws = B[i].palavras.filter((w) => w.texto.toLowerCase().replace(/[^\p{L}]/gu, '').startsWith(p.toLowerCase()));
  return OFFSET + (ws[n] ?? B[i].palavras[0]).inicio;
};
export const tBloco = (i: number) => OFFSET + B[i].inicio - (i === 0 ? OFFSET : 0.12);

export const T = {
  impacto: tPalavra(0, 'bateu') + 0.12,
  pov2ext: tPalavra(0, 'O') - 0.05, // sai do POV para o plano externo
  naoAbre: tPalavra(2, 'Não'),
  celular: tPalavra(3, 'Cada'),
  morrem: tPalavra(4, 'morrem'),
  palavras: [tPalavra(5, 'Cinto'), tPalavra(5, 'Janela'), tPalavra(5, 'Crianças'), tPalavra(5, 'Fora')],
  solta: tPalavra(6, 'solta'),
  abre: tPalavra(7, 'abre'),
  seNao: tPalavra(7, 'Se'),
  quebra: tPalavra(7, 'quebra'),
  maisVelha: tPalavra(8, 'velha'),
  maisNova: tPalavra(8, 'nova'),
  empurra: tPalavra(8, 'empurra'),
  soAi: tPalavra(9, 'Só'),
  final: tBloco(10),
};

export type ModoCamera = { tipo: 'carro'; olho: Vec3; alvo: Vec3; fov: number; tremor: number } | { tipo: 'mundo'; pos: Vec3; alvo: Vec3; fov: number; tremor: number };

export type Quadro = {
  cena: number;
  carroPos: Vec3;
  carroRot: Vec3; // pitch, yaw, roll
  carro: Omit<EstadoCarro, 'seg'>;
  camera: ModoCamera;
  chuva: boolean;
  alfaAgua: number;
  guardaQuebrado: boolean;
  respingo: number; // 0..1 após o impacto
  bolhas: boolean;
  telaFinal: boolean;
};

const YAW0 = Math.PI;
const YAW_DERRAPA = Math.PI - 0.9;
const PONTO_SAIDA: Vec3 = [4.6, 9, 2];
const V_QUEDA: Vec3 = [7, 0, -5];
const QUEDA = Math.sqrt((2 * 9) / 9.8);
export const PONTO_AGUA: Vec3 = [PONTO_SAIDA[0] + V_QUEDA[0] * QUEDA, 0, PONTO_SAIDA[2] + V_QUEDA[2] * QUEDA];

const poseCarroPonte = (s: number): { pos: Vec3; rot: Vec3 } => {
  const tSaida = T.impacto - QUEDA;
  const tDerrapa = tSaida - 0.75;
  if (s < tDerrapa) {
    const z = 14 + (tDerrapa - s) * 20;
    return { pos: [-2, 9, z], rot: [0, YAW0 + Math.sin(s * 9) * 0.01, 0] };
  }
  if (s < tSaida) {
    const k = (s - tDerrapa) / 0.75;
    return { pos: [lerp(-2, PONTO_SAIDA[0], k * k), 9, lerp(14, PONTO_SAIDA[2], k)], rot: [0, lerp(YAW0, YAW_DERRAPA, easeInOut(k)), -k * 0.08] };
  }
  const tau = Math.min(s - tSaida, QUEDA);
  return {
    pos: [PONTO_SAIDA[0] + V_QUEDA[0] * tau, 9 - 4.9 * tau * tau, PONTO_SAIDA[2] + V_QUEDA[2] * tau],
    rot: [tau * 0.42, YAW_DERRAPA, tau * 0.12],
  };
};

// nível da água dentro do carro = quanto o piso está abaixo da superfície
const pisoPorCena = [0, -0.1, -0.18, -0.2, -0.95, -2.6, -0.28, -0.45, -0.32, -1.2];

const tremer = (s: number, amp: number, canal = 0): Vec3 => [noise2D('cam', s * 1.7, canal) * amp, noise2D('cam', s * 1.7, canal + 9) * amp, noise2D('cam', s * 1.7, canal + 19) * amp];

export const cenaEm = (s: number) => {
  let c = 0;
  for (let i = 0; i < B.length; i++) if (s >= tBloco(i)) c = i;
  return c;
};

export const quadro = (s: number): Quadro => {
  const cena = cenaEm(s);
  const base: Quadro = {
    cena,
    carroPos: [PONTO_AGUA[0], 0, PONTO_AGUA[2]],
    carroRot: [0.15, YAW_DERRAPA, 0.04],
    carro: { farois: true, luzInterna: 1 },
    camera: { tipo: 'carro', olho: [-0.4, 1.17, -0.18], alvo: [-0.3, 0.9, 3], fov: 62, tremor: 0.4 },
    chuva: false,
    alfaAgua: 0.62,
    guardaQuebrado: s > T.impacto - QUEDA,
    respingo: s > T.impacto ? clamp((s - T.impacto) / 2.5) : 0,
    bolhas: false,
    telaFinal: false,
  };

  // flutuando: balança na água, nariz afundando aos poucos
  const pisoAlvo = pisoPorCena[cena] ?? -0.95;
  const bob = Math.sin(s * 1.3) * 0.03;
  base.carroPos = [PONTO_AGUA[0], pisoAlvo + bob - 0.3, PONTO_AGUA[2]];
  base.carroRot = [0.12 + (cena >= 4 ? 0.06 : 0) + Math.sin(s * 0.9) * 0.01, YAW_DERRAPA, 0.04 + Math.sin(s * 1.1) * 0.015];

  if (cena === 0) {
    const p = poseCarroPonte(s);
    base.carroPos = p.pos;
    base.carroRot = p.rot;
    base.chuva = true;
    base.alfaAgua = 0.97;
    if (s < T.pov2ext) {
      // POV no volante, derrapando
      const k = clamp((s - (T.impacto - QUEDA - 0.75)) / 0.75);
      base.camera = { tipo: 'carro', olho: [-0.4, 1.17, -0.18], alvo: [-0.4 + k * 1.5, 1.0 - k * 0.2, 10], fov: 64, tremor: 0.6 + k * 2.5 };
    } else {
      // plano externo: do nível da água, o carro atravessa o guarda-corpo e cai
      const k = clamp((s - T.pov2ext) / (T.impacto - T.pov2ext + 0.6));
      base.camera = { tipo: 'mundo', pos: [30 - k * 3, 1.4, 12 - k * 2], alvo: [lerp(5, PONTO_AGUA[0], k), lerp(8, 1, k), lerp(0, PONTO_AGUA[2], k)], fov: 46, tremor: s > T.impacto ? 3 * Math.max(0, 1 - (s - T.impacto) * 2) + 0.3 : 0.3 };
    }
    return base;
  }

  if (cena === 1) {
    // dentro do carro: a água entra pelo assoalho, o rio está na altura do capô
    const k = clamp((s - tBloco(1)) / 3);
    base.camera = { tipo: 'carro', olho: [-0.4, 1.17, -0.18], alvo: [lerp(-0.2, -0.35, k), lerp(0.75, 0.55, k), 2.4], fov: 64, tremor: 1.2 - k * 0.6 };
    base.carroPos[1] = lerp(-0.05, -0.18, k) + bob - 0.3;
  } else if (cena === 2) {
    const tentando = s < T.naoAbre + 0.6;
    base.carro.macaneta = tentando ? clamp(0.5 + 0.5 * Math.sin((s - tBloco(2)) * 9)) : 0;
    base.camera = { tipo: 'carro', olho: [-0.4, 1.1, 0.0], alvo: [-0.84, 0.86, 0.5], fov: 48, tremor: tentando ? 1.4 : 0.6 };
  } else if (cena === 3) {
    base.carro.celular = true;
    base.camera = { tipo: 'carro', olho: [-0.25, 1.1, -0.05], alvo: [0.36, 0.64, 0.05], fov: 42, tremor: 0.5 };
  } else if (cena === 4) {
    const k = clamp((s - tBloco(4)) / 2.6);
    base.camera = { tipo: 'carro', olho: [-0.4, lerp(1.17, 1.02, k), -0.18], alvo: [-0.3, 0.95, 3], fov: 66, tremor: 0.9 };
    base.carroPos[1] = lerp(-0.4, -0.95, k) + bob - 0.3;
  } else if (cena === 5) {
    // debaixo d'água: o carro afunda de nariz, faróis acesos
    const k = clamp((s - tBloco(5)) / 4.5);
    base.carroPos = [PONTO_AGUA[0], lerp(-1.6, -2.6, k), PONTO_AGUA[2]];
    base.carroRot = [0.42, YAW_DERRAPA, 0.06];
    const dir = new THREE.Vector3(Math.sin(YAW_DERRAPA), 0, Math.cos(YAW_DERRAPA));
    const lado = new THREE.Vector3(dir.z, 0, -dir.x);
    const alvo: Vec3 = [PONTO_AGUA[0], -1.8, PONTO_AGUA[2]];
    base.camera = { tipo: 'mundo', pos: [alvo[0] + lado.x * 6 + dir.x * (2 + k), -2.6 - k * 0.4, alvo[2] + lado.z * 6 + dir.z * (2 + k)], alvo, fov: 50, tremor: 0.4 };
    base.bolhas = true;
  } else if (cena === 6) {
    base.carro.fivela = smoothstep(T.solta, T.solta + 0.35, s);
    base.camera = { tipo: 'carro', olho: [-0.26, 1.08, 0.08], alvo: [-0.1, 0.56, -0.03], fov: 44, tremor: 0.5 };
  } else if (cena === 7) {
    base.carro.fivela = 1;
    base.carro.vidroMotorista = smoothstep(T.abre, T.abre + 1.4, s) * 0.18; // desce um pouco e trava
    base.carro.martelo = s > T.seNao + 0.3 ? clamp((s - (T.seNao + 0.3)) / 1.6) : 0;
    base.carro.vidroQuebrado = s > T.quebra + 0.2 ? clamp((s - (T.quebra + 0.2)) / 1.4) : 0;
    base.camera = { tipo: 'carro', olho: [-0.15, 1.14, -0.15], alvo: [-0.86, 1.08, 0.3], fov: 56, tremor: base.carro.vidroQuebrado > 0 && base.carro.vidroQuebrado < 0.6 ? 2 : 0.6 };
    if (base.carro.vidroQuebrado > 0.5) base.bolhas = true;
  } else if (cena === 8) {
    base.carro.fivela = 1;
    base.carro.vidroQuebrado = 1;
    base.carro.criancas = true;
    const virar = smoothstep(tBloco(8), tBloco(8) + 0.8, s);
    base.camera = { tipo: 'carro', olho: [lerp(-0.4, 0, virar), lerp(1.17, 1.3, virar), lerp(-0.18, 0.25, virar)], alvo: [lerp(-0.2, 0, virar), lerp(0.95, 0.86, virar), lerp(2, -1.05, virar)], fov: lerp(66, 80, virar), tremor: 0.7 };
  } else if (cena === 9) {
    base.carro.vidroQuebrado = 1;
    base.chuva = true;
    base.alfaAgua = 0.97;
    base.carroPos = [PONTO_AGUA[0], -1.35 + bob, PONTO_AGUA[2]];
    if (s < T.soAi) {
      const k = clamp((s - tBloco(9)) / (T.soAi - tBloco(9)));
      const z = lerp(PONTO_AGUA[2] + 3, 47, easeInOut(k));
      const nado = Math.sin(s * 5) * 0.08;
      base.camera = { tipo: 'mundo', pos: [PONTO_AGUA[0] + 1 + Math.sin(s * 2.5) * 0.15, 0.32 + nado, z], alvo: [PONTO_AGUA[0] + 1, 1.2 + nado * 2, z + 20], fov: 60, tremor: 1.2 };
    } else {
      // na margem: olha para o rio, liga para a emergência
      base.camera = { tipo: 'mundo', pos: [PONTO_AGUA[0] + 2, 3.1, 58], alvo: [PONTO_AGUA[0] - 6, 3, 0], fov: 50, tremor: 0.6 };
    }
  } else {
    base.telaFinal = true;
    base.chuva = true;
    base.alfaAgua = 0.97;
    base.carroPos = [PONTO_AGUA[0], -5, PONTO_AGUA[2]];
    const k = clamp((s - tBloco(10)) / 4);
    base.camera = { tipo: 'mundo', pos: [28 + k * 4, 6 + k * 3, 30 + k * 6], alvo: [4, 6, 0], fov: 50, tremor: 0.2 };
  }
  return base;
};

/** posição e alvo da câmera em coordenadas do mundo */
export const cameraMundo = (q: Quadro, s: number): { pos: THREE.Vector3; alvo: THREE.Vector3; fov: number } => {
  const c = q.camera;
  const tr = tremer(s, 0.012 * c.tremor);
  const tr2 = tremer(s * 1.3, 0.03 * c.tremor, 40);
  if (c.tipo === 'mundo') {
    const d = Math.hypot(c.alvo[0] - c.pos[0], c.alvo[1] - c.pos[1], c.alvo[2] - c.pos[2]);
    return {
      pos: new THREE.Vector3(c.pos[0] + tr[0] * 3, c.pos[1] + tr[1] * 3, c.pos[2] + tr[2] * 3),
      alvo: new THREE.Vector3(c.alvo[0] + tr2[0] * d * 0.2, c.alvo[1] + tr2[1] * d * 0.2, c.alvo[2] + tr2[2] * d * 0.2),
      fov: c.fov,
    };
  }
  const m = matrizCarro(q);
  const olho = new THREE.Vector3(c.olho[0] + tr[0], c.olho[1] + tr[1], c.olho[2] + tr[2]).applyMatrix4(m);
  const alvo = new THREE.Vector3(c.alvo[0] + tr2[0], c.alvo[1] + tr2[1], c.alvo[2] + tr2[2]).applyMatrix4(m);
  return { pos: olho, alvo, fov: c.fov };
};

export const matrizCarro = (q: Quadro) =>
  new THREE.Matrix4().compose(new THREE.Vector3(...q.carroPos), new THREE.Quaternion().setFromEuler(new THREE.Euler(q.carroRot[0], q.carroRot[1], q.carroRot[2], 'YXZ')), new THREE.Vector3(1, 1, 1));
