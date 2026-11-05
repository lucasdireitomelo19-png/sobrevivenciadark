import React from 'react';
import { AbsoluteFill, Audio, Loop, Sequence, staticFile, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import { ThreeCanvas } from '@remotion/three';
import * as THREE from 'three';
import { MundoCarroNoRio } from './Mundo';
import { Acabamento, Contador, Erros, Legenda, Ligacao, OrdemCriancas, Passo, QuatroPalavras, SeloPOV, TelaFinal } from './Telas';
import { B, FIM_VIDEO, OFFSET, T, tBloco } from './diretor';
import { carregarFontes } from '../../ui/fontes';

carregarFontes();

export const FPS = 30;
export const DURACAO_SHORT = Math.ceil(FIM_VIDEO * FPS);

const f = (s: number) => Math.round(s * FPS);

// ambiente em laço entre dois instantes, com fade
// sons .mp3 = gravados pela ElevenLabs (Sound Effects); .wav = sintetizados em scripts/gerar-sons.mjs
const arq = (som: string) => staticFile(`sons/${som}${/\./.test(som) ? '' : '.wav'}`);

// abaixa os ambientes enquanto a voz fala (ducking)
const falando = (s: number) => B.some((b) => s >= OFFSET + b.inicio - 0.15 && s <= OFFSET + b.fim + 0.25);

const Ambiente: React.FC<{ som: string; de: number; ate: number; volume: number; duracaoLoop: number }> = ({ som, de, ate, volume, duracaoLoop }) => {
  const dur = f(ate - de);
  return (
    <Sequence from={f(de)} durationInFrames={dur} layout="none">
      <Loop durationInFrames={f(duracaoLoop)} layout="none">
        <Audio src={arq(som)} volume={(fr) => volume * Math.min(1, fr / 10, (dur - fr) / 10) * (falando(de + fr / FPS) ? 0.5 : 1)} />
      </Loop>
    </Sequence>
  );
};
const Sfx: React.FC<{ som: string; em: number; volume?: number }> = ({ som, em, volume = 1 }) => (
  <Sequence from={Math.max(0, f(em))} layout="none">
    <Audio src={arq(som)} volume={volume} />
  </Sequence>
);

const Trilha: React.FC = () => {
  const { durationInFrames } = useVideoConfig();
  return (
    <>
      <Sequence from={f(OFFSET)} layout="none">
        <Audio src={staticFile('narracao/002-short.mp3')} volume={1} />
      </Sequence>
      {/* trilha de tensão, sobe no meio e cai no final */}
      <Loop durationInFrames={f(15.5)} layout="none">
        <Audio src={staticFile('sons/drone.wav')} volume={(fr) => interpolate(fr, [0, f(T.impacto), f(tBloco(4)), f(T.final), durationInFrames], [0.12, 0.25, 0.4, 0.3, 0], { extrapolateRight: 'clamp' }) * 0.4} />
      </Loop>
      <Ambiente som="chuva.mp3" de={0} ate={T.impacto + 0.2} volume={0.09} duracaoLoop={10} />
      <Ambiente som="chuva.mp3" de={tBloco(9)} ate={FIM_VIDEO} volume={0.08} duracaoLoop={10} />
      <Ambiente som="subaquatico.mp3" de={tBloco(1)} ate={tBloco(9)} volume={0.12} duracaoLoop={10} />
      <Ambiente som="agua.mp3" de={tBloco(1)} ate={tBloco(5)} volume={0.13} duracaoLoop={10} />
      <Ambiente som="nado.mp3" de={tBloco(9)} ate={T.soAi} volume={0.36} duracaoLoop={8} />
      <Sfx som="derrapagem" em={T.impacto - 2.2} volume={0.45} />
      <Sfx som="batida" em={T.impacto - 1.36} volume={0.9} />
      <Sfx som="splash.mp3" em={T.impacto - 0.1} volume={0.3} />
      <Sfx som="braam" em={T.naoAbre} volume={0.25} />
      <Sfx som="braam" em={T.celular} volume={0.22} />
      <Sfx som="braam" em={T.morrem - 0.1} volume={0.28} />
      <Sfx som="batimento" em={tBloco(4) + 0.2} volume={0.5} />
      <Sfx som="batimento" em={tBloco(4) + 1.2} volume={0.5} />
      <Sfx som="batimento" em={tBloco(4) + 2.1} volume={0.55} />
      {T.palavras.map((t, i) => (
        <Sfx key={i} som="whoosh" em={t - 0.1} volume={0.1} />
      ))}
      {[6, 7, 8, 9].map((c) => (
        <Sfx key={c} som="whoosh" em={tBloco(c)} volume={0.08} />
      ))}
      <Sfx som="clique" em={T.solta + 0.05} volume={0.7} />
      <Sfx som="vidro" em={T.quebra + 0.2} volume={0.35} />
      <Sfx som="vidro-agua.mp3" em={T.quebra + 0.2} volume={0.17} />
      <Sfx som="braam" em={T.final} volume={0.35} />
      {/* tique-taque do contador */}
      {Array.from({ length: Math.floor(T.final - T.impacto - 1) }, (_, i) => (
        <Sfx key={`t${i}`} som="tique" em={T.impacto + 1 + i} volume={0.18} />
      ))}
    </>
  );
};

export const Short002: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const s = frame / FPS;
  return (
    <AbsoluteFill style={{ background: '#060606' }}>
      <ThreeCanvas
        width={width}
        height={height}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.15, outputColorSpace: THREE.SRGBColorSpace }}
        camera={{ fov: 60, near: 0.03, far: 1500, position: [0, 10, 30] }}
        style={{ filter: 'contrast(1.08) saturate(0.9)' }}
      >
        <MundoCarroNoRio seg={s} />
      </ThreeCanvas>
      <Acabamento s={s} frame={frame} />
      <SeloPOV s={s} />
      <Contador s={s} />
      <Passo s={s} />
      <Erros s={s} />
      <QuatroPalavras s={s} />
      <OrdemCriancas s={s} />
      <Ligacao s={s} />
      <Legenda s={s} />
      <TelaFinal s={s} />
      <Trilha />
    </AbsoluteFill>
  );
};
