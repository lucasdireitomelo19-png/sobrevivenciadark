import React from 'react';
import { AbsoluteFill, Audio, Loop, Sequence, interpolate, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import narracao from '../../../public/narracao/001-short.json';
import { TelaPixel } from '../../pixel/TelaPixel';
import type { Pincel } from '../../pixel/Pincel';
import * as C from '../../pixel/cenas-amazonia';
import { cenaCopaGirando } from '../../pixel/cenas-selva';
import { COR, PIXEL, carregarFontes } from '../../ui/fontes';
import { Triangulo } from '../../ui/Triangulo';
import { clamp, easeOut } from '../../motor/matematica';

carregarFontes();

// Short 001 · POV: você caiu de avião na Amazônia · pixel art 2D vertical.
// Roteiro e checagem de fontes: roteirista (roteiros/001, seção 6A). Conselhos sem alteração.

type Bloco = { texto: string; inicio: number; fim: number; palavras: { texto: string; inicio: number; fim: number }[] };
const N = narracao as { duracao: number; blocos: Bloco[] };
const B = N.blocos;
export const FPS = 30;
const OFFSET = 0.3;
const FIM = OFFSET + N.duracao + 3.4;
export const DURACAO_SHORT_001 = Math.ceil(FIM * FPS);
const f = (s: number) => Math.round(s * FPS);

const ini = (i: number) => (i === 0 ? 0 : OFFSET + B[i].inicio - 0.12);
const fim = (i: number) => (i + 1 < B.length ? ini(i + 1) : FIM);
const palavra = (i: number, prefixo: string) => {
  const w = B[i].palavras.find((x) => x.texto.toLowerCase().replace(/[^\p{L}\d]/gu, '').startsWith(prefixo.toLowerCase()));
  return OFFSET + (w ?? B[i].palavras[0]).inicio;
};
const blocoEm = (s: number) => {
  let c = 0;
  for (let i = 0; i < B.length; i++) if (s >= ini(i)) c = i;
  return c;
};
const T = { ninguem: palavra(2, 'ninguém'), depois: palavra(9, 'depois') };

// ── qual cena desenhar em cada instante
const desenhar = (p: Pincel, s: number) => {
  const b = blocoEm(s);
  const t = clamp((s - ini(b)) / (fim(b) - ini(b)));
  switch (b) {
    case 0: return C.cenaAcordar(p, s, t);
    case 1: return C.cenaPreso(p, s);
    case 2: return s < T.ninguem - 0.1 ? C.cenaPartiu(p, s, clamp((s - ini(2)) / (T.ninguem - ini(2)))) : C.cenaDestrocos(p, s);
    case 3: return C.cenaAndar(p, s, t);
    case 4: return C.cenaAndar(p, ini(4), 1);
    case 5: return C.cenaVistaDeCima(p, s, t);
    case 6: return C.cenaPerto(p, s, { pose: 'em-pe', x: 0.62 });
    case 7: return C.cenaPerto(p, s, { quente: 1, pose: 'sentado', x: 0.86 });
    case 8: return C.cenaPerto(p, s, { pose: 'respirando', x: 0.8 });
    case 9: return s < T.depois - 0.1 ? C.cenaPerto(p, s, { pose: 'enfaixando', x: 0.8 }) : C.cenaAbrigo(p, s);
    case 10: return cenaCopaGirando(p, s, { giro: 0.02, tontura: 0 });
    case 11: return C.cenaFogueiraFumaca(p, s);
    case 12: return C.cenaClaroDeCima(p, s, t);
    case 13: return C.cenaGarrafa(p, s);
    case 14: return C.cenaFerver(p, s);
    case 15: return C.cenaPreso(p, s, { garota: true });
    case 16: return C.cenaAviaoPassa(p, s, t);
    case 17: return C.cenaSinal(p, s, t);
    default: return C.cenaFinal(p, s);
  }
};

// ── textos na tela (fonte pixelada da marca)
const contorno = '6px 0 #000, -6px 0 #000, 0 6px #000, 0 -6px #000, 6px 6px #000, -6px 6px #000, 6px -6px #000, -6px -6px #000, 0 12px #000';
const DESTAQUE = ['amazônia', 'vivo', 'não', 'destroços', 'quente', 'combustível', 'respira', 'ferimentos', 'abrigo', 'fumaça', 'ver', 'céu', 'água', 'dias', 'minuto', '1971', 'ninguém', 'sinal', 'sobreviveria'];

const Legenda: React.FC<{ s: number }> = ({ s }) => {
  const b = blocoEm(s);
  if (b === B.length - 1) return null;
  const ws = B[b].palavras.map((w) => ({ ...w, inicio: w.inicio + OFFSET, fim: w.fim + OFFSET }));
  const grupos: (typeof ws)[] = [];
  let g: typeof ws = [];
  ws.forEach((w, i) => {
    g.push(w);
    if (/[.,:?!]$/.test(w.texto) || g.length === 3 || i === ws.length - 1) {
      grupos.push(g);
      g = [];
    }
  });
  const atual = grupos.filter((gr) => gr[0].inicio - 0.05 <= s).pop();
  if (!atual) return null;
  if (s > atual[atual.length - 1].fim + 0.6 && grupos.indexOf(atual) === grupos.length - 1) return null;
  return (
    <div style={{ position: 'absolute', top: 1440, left: 50, right: 50, textAlign: 'center', fontFamily: PIXEL, fontSize: 64, lineHeight: 1.45, textShadow: contorno }}>
      {atual.map((w, i) => {
        const on = s >= w.inicio - 0.03;
        const pop = easeOut(clamp((s - w.inicio + 0.03) / 0.1));
        const d = DESTAQUE.includes(w.texto.toLowerCase().replace(/[^\p{L}\d]/gu, ''));
        return (
          <span key={i} style={{ display: 'inline-block', margin: '0 12px', opacity: on ? 1 : 0, transform: `scale(${0.75 + 0.25 * pop})`, color: d ? COR.vermelho : COR.osso }}>
            {w.texto.replace(/[,:]$/, '').toUpperCase()}
          </span>
        );
      })}
    </div>
  );
};

const Caixa: React.FC<{ s: number; t0: number; t1: number; children: React.ReactNode; top?: number }> = ({ s, t0, t1, children, top = 300 }) => {
  if (s < t0 || s >= t1) return null;
  const k = clamp((s - t0) / 0.2);
  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: k, transform: `translateY(${(1 - easeOut(k)) * -24}px)` }}>
      {children}
    </div>
  );
};
const Passo: React.FC<{ n: number; texto: string }> = ({ n, texto }) => (
  <div style={{ display: 'flex', fontFamily: PIXEL, fontSize: 40, boxShadow: '0 0 0 6px #000' }}>
    <div style={{ background: COR.vermelho, color: COR.osso, padding: '18px 20px 14px' }}>PASSO {n}</div>
    <div style={{ background: COR.preto, color: COR.osso, padding: '18px 22px 14px', border: `6px solid ${COR.vermelho}` }}>{texto}</div>
  </div>
);
const Aviso: React.FC<{ texto: string; cor?: string; tam?: number }> = ({ texto, cor = COR.osso, tam = 52 }) => (
  <div style={{ fontFamily: PIXEL, fontSize: tam, color: cor, textAlign: 'center', lineHeight: 1.4, padding: '0 60px', textShadow: contorno }}>{texto}</div>
);
const XVermelho: React.FC<{ s: number; t0: number }> = ({ s, t0 }) => {
  const k = clamp((s - t0) / 0.25);
  const n = Math.ceil(k * 9);
  // X feito de blocos de pixel, desenhado diagonal por diagonal
  return (
    <svg width={540} height={540} viewBox="0 0 9 9" style={{ imageRendering: 'pixelated', shapeRendering: 'crispEdges' }}>
      {Array.from({ length: n }, (_, i) => (
        <React.Fragment key={i}>
          <rect x={i} y={i} width={1} height={1} fill={COR.vermelho} />
          <rect x={8 - i} y={i} width={1} height={1} fill={COR.vermelho} />
        </React.Fragment>
      ))}
    </svg>
  );
};

const Telas: React.FC<{ s: number }> = ({ s }) => (
  <>
    {s < 3 && (
      <div style={{ position: 'absolute', top: 220, left: 60, background: COR.vermelho, color: COR.osso, fontFamily: PIXEL, fontSize: 56, padding: '16px 22px 10px', opacity: clamp(s / 0.3) * clamp((3 - s) / 0.3) }}>POV</div>
    )}
    <Caixa s={s} t0={T.ninguem} t1={fim(2)} top={420}>
      <Aviso texto="NINGUÉM SABE QUE VOCÊ ESTÁ VIVO" />
    </Caixa>
    {s >= ini(4) && s < fim(4) && (
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 300, gap: 30 }}>
        <XVermelho s={s} t0={ini(4) + 0.1} />
        <Aviso texto="NÃO ENTRE NA MATA" />
      </AbsoluteFill>
    )}
    <Caixa s={s} t0={palavra(5, 'mais')} t1={fim(5)} top={260}>
      <Aviso texto="O AVIÃO É MAIS FÁCIL DE ACHAR" />
    </Caixa>
    <Caixa s={s} t0={ini(6)} t1={fim(7)} top={260}>
      <Passo n={1} texto="FIQUE PERTO" />
    </Caixa>
    {s >= palavra(7, 'motor') && s < fim(7) && (
      <AbsoluteFill style={{ alignItems: 'center', paddingTop: 470, gap: 24 }}>
        <Triangulo tamanho={220} />
        <Aviso texto="MOTOR QUENTE · COMBUSTÍVEL" cor={COR.vermelho} tam={40} />
      </AbsoluteFill>
    )}
    <Caixa s={s} t0={ini(8)} t1={fim(8)} top={260}>
      <Passo n={2} texto="RESPIRE" />
    </Caixa>
    <Caixa s={s} t0={ini(9)} t1={fim(9)} top={260}>
      <Passo n={3} texto="FERIDAS E ABRIGO" />
    </Caixa>
    <Caixa s={s} t0={ini(10)} t1={fim(12)} top={260}>
      <Passo n={4} texto="SEJA VISTO" />
    </Caixa>
    <Caixa s={s} t0={ini(13)} t1={fim(14)} top={260}>
      <Passo n={5} texto="ÁGUA" />
    </Caixa>
    <Caixa s={s} t0={palavra(13, 'dois')} t1={fim(13)} top={560}>
      <Aviso texto="2–4 DIAS" cor={COR.vermelho} tam={110} />
    </Caixa>
    <Caixa s={s} t0={palavra(14, 'minuto') - 0.3} t1={fim(14)} top={560}>
      <Aviso texto="FERVA 1 MIN" tam={80} />
    </Caixa>
    <Caixa s={s} t0={ini(15)} t1={fim(15)} top={380}>
      <Aviso texto="1971" cor={COR.vermelho} tam={130} />
    </Caixa>
    {s >= ini(18) && <TelaFinal s={s} />}
  </>
);

const TelaFinal: React.FC<{ s: number }> = ({ s }) => {
  const k = clamp((s - ini(18)) / 0.5);
  const k2 = clamp((s - ini(18) - 1.2) / 0.5);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', paddingBottom: 260 }}>
      <Triangulo tamanho={420} style={{ opacity: k, transform: `scale(${0.85 + 0.15 * easeOut(k)})` }} />
      <div style={{ fontFamily: PIXEL, fontSize: 92, lineHeight: 1.3, textAlign: 'center', color: COR.osso, marginTop: 50, opacity: k, textShadow: contorno }}>
        VOCÊ
        <br />
        <span style={{ color: COR.vermelho }}>SOBREVIVERIA?</span>
      </div>
      <div style={{ fontFamily: PIXEL, fontSize: 30, color: COR.osso, opacity: k2, marginTop: 50, textAlign: 'center', lineHeight: 1.6, padding: '0 90px' }}>
        COMENTA: QUANTOS DIAS VOCÊ AGUENTARIA NA AMAZÔNIA?
      </div>
    </AbsoluteFill>
  );
};

// ── som: narração na frente; ambiente baixa quando a voz fala
const falando = (s: number) => B.some((b) => s >= OFFSET + b.inicio - 0.15 && s <= OFFSET + b.fim + 0.25);
const arq = (som: string) => staticFile(`sons/${som}${/\./.test(som) ? '' : '.wav'}`);
const Amb: React.FC<{ som: string; de: number; ate: number; vol: number; loop: number }> = ({ som, de, ate, vol, loop }) => {
  const dur = f(ate - de);
  return (
    <Sequence from={f(de)} durationInFrames={dur} layout="none">
      <Loop durationInFrames={f(loop)} layout="none">
        <Audio src={arq(som)} volume={(fr) => vol * Math.min(1, fr / 12, (dur - fr) / 12) * (falando(de + fr / FPS) ? 0.55 : 1)} />
      </Loop>
    </Sequence>
  );
};
const Sfx: React.FC<{ som: string; em: number; vol?: number }> = ({ som, em, vol = 0.6 }) => (
  <Sequence from={Math.max(0, f(em))} layout="none">
    <Audio src={arq(som)} volume={vol} />
  </Sequence>
);

const Trilha: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <>
      <Sequence from={f(OFFSET)} layout="none">
        <Audio src={staticFile('narracao/001-short.mp3')} />
      </Sequence>
      <Loop durationInFrames={f(15.5)} layout="none">
        <Audio src={staticFile('sons/drone.wav')} volume={(fr) => interpolate(fr, [0, f(ini(3)), f(ini(6)), f(ini(16)), durationInFrames], [0.05, 0.1, 0.07, 0.12, 0], { extrapolateRight: 'clamp' })} />
      </Loop>
      <Sfx som="respira.mp3" em={0.4} vol={0.7} />
      <Amb som="selva.mp3" de={0} ate={ini(2)} vol={0.4} loop={12} />
      <Sfx som="queda-ar.mp3" em={palavra(2, 'partiu') - 0.3} vol={0.55} />
      <Sfx som="braam" em={T.ninguem} vol={0.25} />
      <Amb som="destrocos.mp3" de={T.ninguem} ate={fim(2)} vol={0.4} loop={8} />
      <Amb som="selva.mp3" de={ini(3)} ate={ini(10)} vol={0.35} loop={12} />
      <Sfx som="braam" em={ini(4)} vol={0.3} />
      <Amb som="destrocos.mp3" de={ini(7)} ate={fim(7)} vol={0.35} loop={8} />
      <Amb som="selva-chuva.mp3" de={T.depois} ate={fim(9)} vol={0.45} loop={10} />
      <Amb som="selva.mp3" de={ini(10)} ate={ini(18)} vol={0.3} loop={12} />
      <Amb som="fogueira.mp3" de={ini(11)} ate={fim(11)} vol={0.5} loop={8} />
      <Amb som="fogueira.mp3" de={ini(14)} ate={fim(14)} vol={0.35} loop={8} />
      <Amb som="fervura.mp3" de={ini(14)} ate={fim(14)} vol={0.45} loop={6} />
      <Sfx som="aviao-longe.mp3" em={ini(16)} vol={0.6} />
      <Sfx som="aviao-longe.mp3" em={ini(17) + 0.5} vol={0.45} />
      {[3, 6, 8, 9, 10, 13, 15].map((i) => (
        <Sfx key={i} som="whoosh" em={ini(i)} vol={0.07} />
      ))}
      <Sfx som="braam" em={ini(18)} vol={0.35} />
    </>
  );
};

export const Short001: React.FC = () => {
  const frame = useCurrentFrame();
  const s = frame / FPS;
  // flash ao se partir e corte para preto entre gancho e destroços
  const flash = s > palavra(2, 'partiu') && s < palavra(2, 'partiu') + 0.3 ? 1 - (s - palavra(2, 'partiu')) / 0.3 : 0;
  return (
    <AbsoluteFill style={{ background: '#060606' }}>
      <TelaPixel largura={135} altura={240} seg={s} desenhar={desenhar} />
      <AbsoluteFill style={{ background: '#fff', opacity: flash * 0.8 }} />
      <AbsoluteFill style={{ background: 'radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(0,0,0,.45) 100%)' }} />
      <Telas s={s} />
      <Legenda s={s} />
      <Trilha />
    </AbsoluteFill>
  );
};
