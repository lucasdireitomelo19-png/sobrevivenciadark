import React, { createContext, useContext } from 'react';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import type { Cena } from '../roteiro/tipos';

// Tempo da cena: t vai de 0 a 1 ao longo da cena; seg é o tempo em segundos.
export type TempoCena = { frame: number; t: number; seg: number; duracao: number; fps: number; cena: Cena };

const Ctx = createContext<Cena | null>(null);
export const ProvedorCena: React.FC<{ cena: Cena; children: React.ReactNode }> = ({ cena, children }) => (
  <Ctx.Provider value={cena}>{children}</Ctx.Provider>
);

export const useCena = (): TempoCena => {
  const cena = useContext(Ctx);
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  if (!cena) throw new Error('useCena fora de <ProvedorCena>');
  return { frame, fps, seg: frame / fps, duracao: durationInFrames, t: Math.min(1, frame / Math.max(1, durationInFrames - 1)), cena };
};
