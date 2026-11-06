import React from 'react';
import { Composition } from 'remotion';
import { DURACAO_SHORT, FPS, Short002 } from './episodios/002-carro-no-rio/Short';
import { Teste001Pixel } from './episodios/001-aviao-amazonia/Teste';

export const Root: React.FC = () => (
  <>
    {/* Roteiro 002 · POV: seu carro caiu no rio (Short vertical) */}
    <Composition id="Short002CarroNoRio" component={Short002} durationInFrames={DURACAO_SHORT} fps={FPS} width={1080} height={1920} />
    {/* mesmo roteiro em estilo pixel art (teste de estilo) */}
    <Composition id="Short002Pixel" component={Short002} defaultProps={{ pixel: true }} durationInFrames={DURACAO_SHORT} fps={FPS} width={1080} height={1920} />
    {/* Roteiro 001 · amostra do estilo pixel art 2D */}
    <Composition id="Teste001Pixel" component={Teste001Pixel} durationInFrames={360} fps={30} width={1920} height={1080} />
  </>
);
