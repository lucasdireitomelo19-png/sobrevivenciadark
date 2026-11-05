import React from 'react';

// Símbolo do canal: triângulo de perigo com pessoa fugindo (mesmo desenho de marca/logo.html).
export const Triangulo: React.FC<{ tamanho: number; brilho?: boolean; style?: React.CSSProperties }> = ({ tamanho, brilho = true, style }) => (
  <svg width={tamanho} height={tamanho} viewBox="100 120 880 800" style={style}>
    <defs>
      <filter id="glowTri" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="18" result="b" />
        <feMerge>
          <feMergeNode in="b" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
    <path d="M540 170 L930 860 L150 860 Z" fill="none" stroke="#e3141f" strokeWidth={46} strokeLinejoin="round" filter={brilho ? 'url(#glowTri)' : undefined} />
    <g fill="#ece6dc" transform="translate(540 600) scale(1.25)">
      <circle cx="28" cy="-150" r="30" />
      <path d="M-10 -110 L40 -112 L70 -50 L120 -30 L112 -10 L52 -30 L36 -60 L22 0 L80 50 L70 150 L44 148 L52 66 L4 30 L-30 110 L-110 120 L-108 94 L-52 86 L-20 -10 L-6 -80 L-40 -60 L-60 -10 L-84 -18 L-56 -86 Z" />
    </g>
  </svg>
);
