import React, { useLayoutEffect, useRef } from 'react';
import { AbsoluteFill, useVideoConfig } from 'remotion';
import { Pincel } from './Pincel';

/**
 * Tela de pixel art: desenha numa resolução baixa (padrão 320x180) e amplia sem
 * suavização até o tamanho do vídeo. `desenhar` recebe o pincel e os segundos.
 */
export const TelaPixel: React.FC<{ largura?: number; altura?: number; seg: number; desenhar: (p: Pincel, seg: number) => void }> = ({ largura = 320, altura = 180, seg, desenhar }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const { width, height } = useVideoConfig();
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    const img = g.createImageData(largura, altura);
    const p = new Pincel(largura, altura, img.data);
    desenhar(p, seg);
    g.putImageData(img, 0, 0);
  });
  // ampliação inteira para os pixels ficarem todos do mesmo tamanho
  const k = Math.min(width / largura, height / altura);
  return (
    <AbsoluteFill style={{ background: '#060606', alignItems: 'center', justifyContent: 'center' }}>
      <canvas ref={ref} width={largura} height={altura} style={{ width: largura * k, height: altura * k, imageRendering: 'pixelated' }} />
    </AbsoluteFill>
  );
};
