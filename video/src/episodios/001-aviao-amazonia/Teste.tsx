import React from 'react';
import { Sequence, useCurrentFrame } from 'remotion';
import { TelaPixel } from '../../pixel/TelaPixel';
import { cenaAviaoTempestade, cenaChaoSelva, cenaCopaGirando } from '../../pixel/cenas-selva';

// Amostra do estilo pixel art 2D para o roteiro 001 (três cenas do gancho).
const Cena: React.FC<{ desenhar: Parameters<typeof TelaPixel>[0]['desenhar'] }> = ({ desenhar }) => {
  const f = useCurrentFrame();
  return <TelaPixel seg={f / 30} desenhar={desenhar} />;
};

export const Teste001Pixel: React.FC = () => (
  <>
    <Sequence durationInFrames={120}>
      <Cena desenhar={(p, s) => cenaCopaGirando(p, s)} />
    </Sequence>
    <Sequence from={120} durationInFrames={120}>
      <Cena desenhar={(p, s) => cenaAviaoTempestade(p, s, { clarao: s > 2 ? Math.min(1, (s - 2) * 2) : 0 })} />
    </Sequence>
    <Sequence from={240} durationInFrames={120}>
      <Cena desenhar={(p, s) => cenaChaoSelva(p, s, { panorama: 3 })} />
    </Sequence>
  </>
);
