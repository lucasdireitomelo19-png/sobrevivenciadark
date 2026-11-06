import { continueRender, delayRender, staticFile } from 'remotion';

// Fontes da marca (Bebas Neue para títulos, Oswald para apoio), servidas de public/fonte.
export const BEBAS = 'BebasSD';
export const OSWALD = 'OswaldSD';
export const PIXEL = 'PixelSD';

// Fontes em uso no vídeo atual (o estilo pixel art troca para a fonte pixelada).
export const FONTES = { titulo: BEBAS, apoio: OSWALD, escala: 1, pixel: false };
export const usarEstilo = (pixel: boolean) => {
  FONTES.titulo = pixel ? PIXEL : BEBAS;
  FONTES.apoio = pixel ? PIXEL : OSWALD;
  FONTES.escala = pixel ? 0.52 : 1;
  FONTES.pixel = pixel;
};
export const fs = (n: number) => Math.round(n * FONTES.escala);

export const COR = { preto: '#060606', vermelho: '#e3141f', osso: '#ece6dc', cinza: '#8a8580' };

let carregado = false;
export const carregarFontes = () => {
  if (carregado || typeof document === 'undefined') return;
  carregado = true;
  const h = delayRender('fontes da marca');
  Promise.all([
    new FontFace(BEBAS, `url(${staticFile('fonte/BebasNeue.ttf')})`).load(),
    new FontFace(OSWALD, `url(${staticFile('fonte/Oswald-Medium.ttf')})`, { weight: '500' }).load(),
    new FontFace(PIXEL, `url(${staticFile('fonte/PressStart2P.woff2')})`).load(),
  ])
    .then((fs) => {
      fs.forEach((f) => (document.fonts as unknown as { add: (f: FontFace) => void }).add(f));
      continueRender(h);
    })
    .catch((e) => {
      console.error(e);
      continueRender(h);
    });
};
