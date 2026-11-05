// Gera todos os efeitos sonoros por síntese (nada de banco de sons): node scripts/gerar-sons.mjs
// Saída: public/sons/*.wav (44,1 kHz, mono, 16 bits). Determinístico (seed fixa).
import fs from 'node:fs';
import path from 'node:path';

const SR = 44100;
const DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..', 'public', 'sons');
fs.mkdirSync(DIR, { recursive: true });

let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const ruido = () => rnd() * 2 - 1;

// filtros (biquad RBJ) e utilitários
const biquad = (tipo, f, q = 0.707) => {
  const w = (2 * Math.PI * f) / SR, c = Math.cos(w), a = Math.sin(w) / (2 * q);
  let b0, b1, b2, a0, a1, a2;
  if (tipo === 'lp') [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
  else if (tipo === 'hp') [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
  else [b0, b1, b2] = [a, 0, -a]; // bp
  [a0, a1, a2] = [1 + a, -2 * c, 1 - a];
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x) => {
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
};
const buf = (seg) => new Float32Array(Math.floor(seg * SR));
const env = (t, a, d) => (t < a ? t / a : Math.exp(-(t - a) / d));
const normalizar = (b, pico = 0.9) => {
  let m = 0;
  for (const v of b) m = Math.max(m, Math.abs(v));
  for (let i = 0; i < b.length; i++) b[i] = (b[i] / (m || 1)) * pico;
  return b;
};
// laço sem emenda: cruza o fim com o começo
const loop = (b, cruz = 0.5) => {
  const n = Math.floor(cruz * SR);
  for (let i = 0; i < n; i++) {
    const k = i / n;
    b[i] = b[i] * k + b[b.length - n + i] * (1 - k);
  }
  return b.subarray(0, b.length - n);
};
const salvar = (nome, b) => {
  const dados = Buffer.alloc(44 + b.length * 2);
  dados.write('RIFF', 0); dados.writeUInt32LE(36 + b.length * 2, 4); dados.write('WAVE', 8);
  dados.write('fmt ', 12); dados.writeUInt32LE(16, 16); dados.writeUInt16LE(1, 20); dados.writeUInt16LE(1, 22);
  dados.writeUInt32LE(SR, 24); dados.writeUInt32LE(SR * 2, 28); dados.writeUInt16LE(2, 32); dados.writeUInt16LE(16, 34);
  dados.write('data', 36); dados.writeUInt32LE(b.length * 2, 40);
  for (let i = 0; i < b.length; i++) dados.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(b[i] * 32767))), 44 + i * 2);
  fs.writeFileSync(path.join(DIR, nome + '.wav'), dados);
  console.log('ok', nome, (b.length / SR).toFixed(1) + 's');
};

// ── chuva: chiado + gotas
{
  const b = buf(12.5), h = biquad('hp', 900), l = biquad('lp', 7000), g = biquad('bp', 3000, 3);
  for (let i = 0; i < b.length; i++) {
    let v = l(h(ruido())) * 0.35;
    if (rnd() < 0.004) v += ruido() * 0.9;
    b[i] = v + g(v) * 0.3;
  }
  salvar('chuva', normalizar(loop(b), 0.7));
}
// ── debaixo d'água: grave abafado + bolhas
{
  const b = buf(10.5), l = biquad('lp', 260), l2 = biquad('lp', 90);
  let bolha = 0, fb = 0, fase = 0;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = l(ruido()) * 0.8 + l2(ruido()) * 1.5;
    if (rnd() < 0.0006) { bolha = 1; fb = 300 + rnd() * 700; }
    bolha *= 0.9993; fb *= 1.00003;
    fase += (2 * Math.PI * fb) / SR;
    v += Math.sin(fase) * bolha * 0.25;
    b[i] = v * (0.8 + 0.2 * Math.sin(t * 0.6));
  }
  salvar('subaquatico', normalizar(loop(b), 0.8));
}
// ── água entrando / nado: gorgolejo
{
  const b = buf(8.5), bp = biquad('bp', 600, 1.5), l = biquad('lp', 1800);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const mod = 0.5 + 0.5 * Math.sin(t * 7 + Math.sin(t * 2.3) * 3);
    b[i] = l(bp(ruido()) * mod * 2 + ruido() * 0.05);
  }
  salvar('agua', normalizar(loop(b), 0.7));
}
// ── trilha de tensão: drone grave com batimento lento
{
  const b = buf(16.5), l = biquad('lp', 400);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = Math.sin(2 * Math.PI * 41.2 * t) * 0.6 + Math.sin(2 * Math.PI * 61.7 * t) * 0.25 + Math.sin(2 * Math.PI * 82.4 * t + Math.sin(t * 0.5)) * 0.2;
    v += Math.sin(2 * Math.PI * 87.3 * t) * 0.12 * (0.5 + 0.5 * Math.sin(t * 0.8)); // dissonância
    v += l(ruido()) * 0.15;
    b[i] = v * (0.75 + 0.25 * Math.sin((2 * Math.PI * t) / 4));
  }
  salvar('drone', normalizar(loop(b, 1), 0.8));
}
// ── derrapagem: chiado agudo de pneu
{
  const b = buf(1.6), bp = biquad('bp', 2400, 6), bp2 = biquad('bp', 3100, 8);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = (bp(ruido()) + bp2(ruido()) * 0.6) * env(t, 0.1, 0.8) * (1 + 0.3 * Math.sin(t * 60));
  }
  salvar('derrapagem', normalizar(b, 0.8));
}
// ── batida metálica (guarda-corpo)
{
  const b = buf(1.8), l = biquad('lp', 1200);
  const modos = [187, 431, 822, 1290, 1873];
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = l(ruido()) * env(t, 0.002, 0.06) * 2;
    modos.forEach((f, k) => (v += Math.sin(2 * Math.PI * f * t) * env(t, 0.001, 0.4 / (k + 1)) * 0.4));
    v += Math.sin(2 * Math.PI * 55 * t) * env(t, 0.003, 0.15);
    b[i] = v;
  }
  salvar('batida', normalizar(b, 0.95));
}
// ── splash grande: impacto do carro na água
{
  const b = buf(3.5), l = biquad('lp', 900), h = biquad('hp', 300), l2 = biquad('lp', 5000);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = Math.sin(2 * Math.PI * (60 - t * 20) * t) * env(t, 0.004, 0.35) * 1.6; // baque
    v += l(ruido()) * env(t, 0.005, 0.5) * 1.5;
    v += l2(h(ruido())) * env(t, 0.03, 0.9) * 0.9; // água espirrando
    if (t > 0.3 && rnd() < 0.002) v += ruido() * 0.5 * Math.exp(-t);
    b[i] = v;
  }
  salvar('splash', normalizar(b, 0.98));
}
// ── vidro: estalo + estilhaços
{
  const b = buf(2.2), h = biquad('hp', 2500);
  const tilin = Array.from({ length: 40 }, () => ({ t: 0.05 + rnd() * 1.2, f: 2500 + rnd() * 5000, a: 0.2 + rnd() * 0.5 }));
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = h(ruido()) * env(t, 0.001, 0.08) * 2;
    tilin.forEach((c) => {
      if (t > c.t) v += Math.sin(2 * Math.PI * c.f * (t - c.t)) * Math.exp(-(t - c.t) * 25) * c.a;
    });
    b[i] = v;
  }
  salvar('vidro', normalizar(b, 0.9));
}
// ── clique da fivela
{
  const b = buf(0.4), bp = biquad('bp', 3500, 4);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    b[i] = bp(ruido()) * env(t, 0.0005, 0.01) * 3 + (t > 0.07 ? bp(ruido()) * env(t - 0.07, 0.0005, 0.012) * 2 : 0);
  }
  salvar('clique', normalizar(b, 0.8));
}
// ── tique do relógio
{
  const b = buf(0.25), bp = biquad('bp', 1800, 8);
  for (let i = 0; i < b.length; i++) b[i] = bp(ruido()) * env(i / SR, 0.0005, 0.008) * 4;
  salvar('tique', normalizar(b, 0.6));
}
// ── batimento cardíaco (tum-tum)
{
  const b = buf(1.1);
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    const pulso = (t0, a) => (t > t0 ? Math.sin(2 * Math.PI * 48 * (t - t0)) * env(t - t0, 0.01, 0.09) * a : 0);
    b[i] = pulso(0, 1) + pulso(0.28, 0.7);
  }
  salvar('batimento', normalizar(b, 0.95));
}
// ── BRAAM: acorde grave de metais distorcido (para cada X / gancho)
{
  const b = buf(3.2), l = biquad('lp', 300);
  let ph = [0, 0, 0];
  const fs_ = [36.7, 55, 73.4];
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    let v = 0;
    fs_.forEach((f, k) => {
      ph[k] += f / SR;
      v += (2 * (ph[k] % 1) - 1) * (k === 0 ? 1 : 0.6);
    });
    l.f = 0;
    v = Math.tanh(l(v) * 3) * env(t, 0.03, 1.1);
    b[i] = v;
  }
  salvar('braam', normalizar(b, 0.9));
}
// ── whoosh (entrada de texto)
{
  const b = buf(0.7);
  let f = 300;
  for (let i = 0; i < b.length; i++) {
    const t = i / SR;
    f = 300 + 3000 * (t / 0.7);
    const bp = biquad('bp', f, 2);
    b[i] = bp(ruido()) * Math.sin((Math.PI * t) / 0.7) ** 2;
  }
  salvar('whoosh', normalizar(b, 0.6));
}
