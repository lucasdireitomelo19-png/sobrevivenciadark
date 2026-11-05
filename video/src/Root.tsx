import React from 'react';
import { Composition } from 'remotion';
import { DURACAO_SHORT, FPS, Short002 } from './episodios/002-carro-no-rio/Short';

export const Root: React.FC = () => (
  <>
    {/* Roteiro 002 · POV: seu carro caiu no rio (Short vertical) */}
    <Composition id="Short002CarroNoRio" component={Short002} durationInFrames={DURACAO_SHORT} fps={FPS} width={1080} height={1920} />
  </>
);
