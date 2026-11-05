import { useCurrentFrame, useVideoConfig } from 'remotion';

// Tempo local da <Sequence> atual: frame, segundos e progresso 0..1.
export const useTempo = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  return { frame, fps, seg: frame / fps, duracao: durationInFrames, t: Math.min(1, frame / Math.max(1, durationInFrames - 1)) };
};
