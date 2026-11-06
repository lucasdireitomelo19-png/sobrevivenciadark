import React from 'react';
import { AbsoluteFill, interpolate, random } from 'remotion';
import { COR, FONTES, fs } from '../../ui/fontes';
import { Triangulo } from '../../ui/Triangulo';
import { clamp, easeOut } from '../../motor/matematica';
import { B, OFFSET, T, cenaEm, tBloco } from './diretor';

// Camada 2D por cima do 3D. Tudo calculado a partir de `s` (segundos do vídeo).

const SOMBRA_HD = '0 0 18px rgba(0,0,0,.9), 0 6px 0 #000, 0 0 2px #000';
// contorno duro em degraus (pixel art)
const SOMBRA_PIXEL = '6px 0 #000, -6px 0 #000, 0 6px #000, 0 -6px #000, 6px 6px #000, -6px 6px #000, 6px -6px #000, -6px -6px #000, 0 12px #000';
const sombraAtual = () => (FONTES.pixel ? SOMBRA_PIXEL : SOMBRA_HD);
const DESTAQUES = ['cinto', 'janela', 'crianças', 'fora', 'não', 'morrem', 'minuto', 'trava', 'lateral', 'margem', 'emergência', 'velha', 'nova', 'sobreviveria'];
const limpa = (w: string) => w.toLowerCase().replace(/[^\p{L}]/gu, '');

// ── Legenda palavra por palavra, em blocos de até 3 palavras (estilo Shorts)
export const Legenda: React.FC<{ s: number }> = ({ s }) => {
  const cena = cenaEm(s);
  if (cena === 5 || cena === 10) return null;
  const ws = B[cena].palavras.map((w) => ({ ...w, inicio: w.inicio + OFFSET, fim: w.fim + OFFSET }));
  const grupos: (typeof ws)[] = [];
  let g: typeof ws = [];
  ws.forEach((w, i) => {
    g.push(w);
    const quebra = /[.,:?!]$/.test(w.texto) || g.length === 3 || i === ws.length - 1;
    if (quebra) {
      grupos.push(g);
      g = [];
    }
  });
  const atual = grupos.filter((gr) => gr[0].inicio - 0.05 <= s).pop();
  if (!atual) return null;
  const ultimo = atual[atual.length - 1];
  if (s > ultimo.fim + 0.6 && grupos.indexOf(atual) === grupos.length - 1) return null;
  return (
    <div style={{ position: 'absolute', top: 1120, left: 60, right: 60, textAlign: 'center', fontFamily: FONTES.titulo, fontSize: fs(128), letterSpacing: FONTES.pixel ? 0 : 2, lineHeight: FONTES.pixel ? 1.5 : 1.02, textShadow: sombraAtual() }}>
      {atual.map((w, i) => {
        const ativo = s >= w.inicio - 0.03;
        const pop = easeOut(clamp((s - w.inicio + 0.03) / 0.12));
        const falando = s >= w.inicio && s <= w.fim + 0.08;
        const destaque = DESTAQUES.includes(limpa(w.texto));
        return (
          <span key={i} style={{ display: 'inline-block', margin: '0 14px', opacity: ativo ? 1 : 0, transform: `scale(${0.7 + 0.3 * pop + (falando ? 0.06 : 0)})`, color: destaque ? COR.vermelho : COR.osso }}>
            {w.texto.replace(/[,:]$/, '').toUpperCase()}
          </span>
        );
      })}
    </div>
  );
};

// ── "POV" no começo
export const SeloPOV: React.FC<{ s: number }> = ({ s }) => {
  if (s > 3.2) return null;
  const a = clamp(s / 0.2) * clamp((3.2 - s) / 0.3);
  return (
    <div style={{ position: 'absolute', top: 230, left: 70, opacity: a, display: 'flex', alignItems: 'center', gap: 18 }}>
      <div style={{ background: COR.vermelho, color: COR.osso, fontFamily: FONTES.titulo, fontSize: fs(92), padding: '4px 26px 0', letterSpacing: 4 }}>POV</div>
    </div>
  );
};

// ── Contador de 60 s até o carro afundar
export const Contador: React.FC<{ s: number }> = ({ s }) => {
  if (s < T.impacto + 0.6 || s >= T.final) return null;
  const restante = Math.max(0, 60 - (s - T.impacto));
  const seg = Math.ceil(restante);
  const frac = restante - Math.floor(restante);
  const pulso = frac > 0.85 ? 1.06 : 1;
  const a = clamp((s - T.impacto - 0.6) / 0.3);
  return (
    <div style={{ position: 'absolute', top: 200, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: a }}>
      <div style={{ fontFamily: FONTES.apoio, fontSize: fs(30), letterSpacing: 8, color: COR.osso, opacity: 0.85, textShadow: sombraAtual() }}>ATÉ AFUNDAR</div>
      <div style={{ fontFamily: FONTES.titulo, fontSize: fs(150), lineHeight: 1, color: seg <= 20 ? COR.vermelho : COR.osso, transform: `scale(${pulso})`, textShadow: sombraAtual() }}>
        00:{String(seg).padStart(2, '0')}
      </div>
    </div>
  );
};

// ── X vermelho riscado sobre o erro
const X: React.FC<{ k: number; texto: string }> = ({ k, texto }) => {
  const l1 = clamp(k / 0.5);
  const l2 = clamp((k - 0.4) / 0.5);
  const esc = 1.25 - 0.25 * easeOut(clamp(k));
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 260 }}>
      <svg width={560} height={560} viewBox="0 0 100 100" style={{ transform: `scale(${esc})`, filter: 'drop-shadow(0 0 22px rgba(227,20,31,.8))' }}>
        <line x1="12" y1="12" x2="88" y2="88" stroke={COR.vermelho} strokeWidth="13" strokeLinecap="round" strokeDasharray="108" strokeDashoffset={108 * (1 - l1)} />
        <line x1="88" y1="12" x2="12" y2="88" stroke={COR.vermelho} strokeWidth="13" strokeLinecap="round" strokeDasharray="108" strokeDashoffset={108 * (1 - l2)} />
      </svg>
      <div style={{ marginTop: 10, fontFamily: FONTES.titulo, fontSize: fs(96), color: COR.osso, background: 'rgba(6,6,6,.75)', padding: '6px 30px 0', letterSpacing: 3, opacity: clamp(k * 3 - 1) }}>{texto}</div>
    </AbsoluteFill>
  );
};

export const Erros: React.FC<{ s: number }> = ({ s }) => {
  const itens: [number, number, string][] = [
    [T.naoAbre, tBloco(3), 'NÃO ABRA A PORTA'],
    [T.celular, tBloco(4), 'NÃO LIGUE AGORA'],
    [T.morrem - 0.1, tBloco(5), 'NÃO ESPERE ENCHER'],
  ];
  const i = itens.find(([a, b]) => s >= a && s < b);
  if (!i) return null;
  return <X k={(s - i[0]) / 0.45} texto={i[2]} />;
};

// ── As quatro palavras (CINTO / JANELA / CRIANÇAS / FORA)
const PALAVRAS = ['CINTO', 'JANELA', 'CRIANÇAS', 'FORA'];
export const QuatroPalavras: React.FC<{ s: number }> = ({ s }) => {
  if (cenaEm(s) !== 5) return null;
  return (
    <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 6, paddingBottom: 120 }}>
      <div style={{ fontFamily: FONTES.apoio, fontSize: fs(44), letterSpacing: 12, color: COR.osso, opacity: clamp((s - tBloco(5)) / 0.3), textShadow: sombraAtual(), marginBottom: 20 }}>DECORA</div>
      {PALAVRAS.map((p, i) => {
        const t0 = T.palavras[i];
        const k = clamp((s - t0 + 0.05) / 0.18);
        const falando = s >= t0 && s < (T.palavras[i + 1] ?? t0 + 0.9);
        return (
          <div key={p} style={{ display: 'flex', alignItems: 'center', gap: 28, opacity: k, transform: `translateX(${(1 - easeOut(k)) * -80}px)` }}>
            <div style={{ fontFamily: FONTES.titulo, fontSize: fs(110), color: COR.vermelho, width: 90, textAlign: 'right', textShadow: sombraAtual() }}>{i + 1}</div>
            <div style={{ fontFamily: FONTES.titulo, fontSize: fs(falando ? 200 : 170), color: falando ? COR.osso : 'rgba(236,230,220,.75)', letterSpacing: 4, lineHeight: 1, textShadow: sombraAtual(), width: 640 }}>{p}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

// ── Selo do passo atual
export const Passo: React.FC<{ s: number }> = ({ s }) => {
  const cena = cenaEm(s);
  if (cena < 6 || cena > 9) return null;
  const n = cena - 5;
  const k = clamp((s - tBloco(cena)) / 0.25);
  return (
    <div style={{ position: 'absolute', top: 440, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - easeOut(k)) * -30}px)` }}>
      <div style={{ display: 'flex', alignItems: 'stretch', boxShadow: '0 10px 40px rgba(0,0,0,.6)' }}>
        <div style={{ background: COR.vermelho, color: COR.osso, fontFamily: FONTES.titulo, fontSize: fs(76), padding: '10px 26px 0', letterSpacing: 3 }}>PASSO {n}</div>
        <div style={{ background: COR.preto, color: COR.osso, fontFamily: FONTES.titulo, fontSize: fs(76), padding: '10px 30px 0', letterSpacing: 4, border: `4px solid ${COR.vermelho}` }}>{PALAVRAS[n - 1]}</div>
      </div>
    </div>
  );
};

// ── Rótulos da ordem das crianças
export const OrdemCriancas: React.FC<{ s: number }> = ({ s }) => {
  if (cenaEm(s) !== 8) return null;
  const rot = (t0: number, n: string, txt: string, x: number, y: number) => {
    const k = clamp((s - t0) / 0.25);
    return (
      <div style={{ position: 'absolute', left: x, top: y, opacity: k, transform: `scale(${0.6 + 0.4 * easeOut(k)})`, display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 110, height: 110, borderRadius: 60, background: COR.vermelho, color: COR.osso, fontFamily: FONTES.titulo, fontSize: fs(92), display: 'flex', alignItems: 'center', justifyContent: 'center', paddingTop: 8, boxShadow: '0 0 30px rgba(227,20,31,.7)' }}>{n}</div>
        <div style={{ fontFamily: FONTES.titulo, fontSize: fs(64), color: COR.osso, textShadow: sombraAtual(), letterSpacing: 2 }}>{txt}</div>
      </div>
    );
  };
  return (
    <>
      {rot(T.maisVelha, '1', 'MAIS VELHA', 600, 600)}
      {rot(T.maisNova, '2', 'MAIS NOVA', 90, 720)}
    </>
  );
};

// ── Só fora da água: ligar
export const Ligacao: React.FC<{ s: number }> = ({ s }) => {
  if (s < T.soAi + 0.2 || cenaEm(s) !== 9) return null;
  const k = easeOut(clamp((s - T.soAi - 0.2) / 0.4));
  return (
    <div style={{ position: 'absolute', left: 300, top: 560, width: 480, height: 540, transform: `translateY(${(1 - k) * 600}px) rotate(-4deg)`, background: '#0d1420', borderRadius: 54, border: '10px solid #111', boxShadow: '0 30px 80px rgba(0,0,0,.7), 0 0 60px rgba(120,170,255,.25)', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 80 }}>
      <div style={{ fontFamily: FONTES.apoio, fontSize: fs(30), color: COR.cinza, letterSpacing: 4 }}>CHAMANDO…</div>
      <div style={{ fontFamily: FONTES.titulo, fontSize: fs(92), color: COR.osso, marginTop: 10 }}>EMERGÊNCIA</div>
      <div style={{ fontFamily: FONTES.apoio, fontSize: fs(26), color: COR.osso, opacity: 0.8, marginTop: 20, textAlign: 'center', padding: '0 40px' }}>só depois de estar fora da água</div>
      <div style={{ marginTop: 'auto', marginBottom: 70, width: 120, height: 120, borderRadius: 60, background: COR.vermelho }} />
    </div>
  );
};

// ── Tela final
export const TelaFinal: React.FC<{ s: number }> = ({ s }) => {
  if (s < T.final) return null;
  const k = clamp((s - T.final) / 0.5);
  const k2 = clamp((s - T.final - 1.2) / 0.5);
  return (
    <AbsoluteFill style={{ background: `rgba(6,6,6,${0.55 + 0.35 * k})`, alignItems: 'center', justifyContent: 'center', paddingBottom: 200 }}>
      <Triangulo tamanho={420} style={{ opacity: k, transform: `scale(${0.85 + 0.15 * easeOut(k)})` }} />
      <div style={{ fontFamily: FONTES.titulo, fontSize: fs(168), lineHeight: 0.95, textAlign: 'center', color: COR.osso, marginTop: 40, opacity: k, textShadow: sombraAtual() }}>
        VOCÊ
        <br />
        <span style={{ color: COR.vermelho }}>SOBREVIVERIA?</span>
      </div>
      <div style={{ fontFamily: FONTES.apoio, fontSize: fs(40), color: COR.osso, opacity: k2 * 0.9, marginTop: 40, textAlign: 'center', letterSpacing: 2, padding: '0 80px' }}>
        COMENTA: QUAL SITUAÇÃO VOCÊ QUER NO PRÓXIMO POV?
      </div>
    </AbsoluteFill>
  );
};

// ── Flashes, grão de filme e vinheta
export const Acabamento: React.FC<{ s: number; frame: number }> = ({ s, frame }) => {
  const flash = Math.max(s > T.impacto ? Math.max(0, 1 - (s - T.impacto) / 0.35) : 0, s > T.quebra + 0.2 && s < T.quebra + 0.5 ? 0.5 * (1 - (s - T.quebra - 0.2) / 0.3) : 0);
  // corte seco para preto logo após o impacto
  const preto = s > T.impacto + 0.15 && s < tBloco(1) ? interpolate(s, [T.impacto + 0.15, T.impacto + 0.3, tBloco(1) - 0.15, tBloco(1)], [0, 1, 1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 0;
  return (
    <>
      <AbsoluteFill style={{ background: '#000', opacity: preto }} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash, mixBlendMode: 'screen' }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 45%, rgba(0,0,0,.55) 100%)' }} />
      <AbsoluteFill style={{ opacity: 0.11, mixBlendMode: 'overlay' }}>
        <svg width="100%" height="100%">
          <filter id="grao">
            <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={Math.floor(random(frame) * 1000)} stitchTiles="stitch" />
            <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grao)" />
        </svg>
      </AbsoluteFill>
    </>
  );
};
