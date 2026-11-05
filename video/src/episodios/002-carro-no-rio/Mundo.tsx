import React, { useLayoutEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { Carro } from '../../mundo/rio/Carro';
import { Agua, LuzesPonte, Margens, Ponte } from '../../mundo/rio/Cenario';
import { Particulas } from '../../mundo/Particulas';
import { cameraMundo, PONTO_AGUA, quadro, type Quadro } from './diretor';

const NEBLINA_AR = { cor: '#0a1119', dens: 0.016 };
const NEBLINA_AGUA = { cor: '#05212a', dens: 0.1 };

const Camera: React.FC<{ q: Quadro; seg: number }> = ({ q, seg }) => {
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  useLayoutEffect(() => {
    const c = cameraMundo(q, seg);
    camera.position.copy(c.pos);
    camera.lookAt(c.alvo);
    camera.fov = c.fov;
    camera.near = 0.03;
    camera.far = 1500;
    camera.updateProjectionMatrix();
    const submerso = c.pos.y < -0.05;
    const n = submerso ? NEBLINA_AGUA : NEBLINA_AR;
    scene.fog = new THREE.FogExp2(n.cor, n.dens);
    scene.background = new THREE.Color(submerso ? NEBLINA_AGUA.cor : '#070b10');
  });
  return null;
};

export const MundoCarroNoRio: React.FC<{ seg: number }> = ({ seg }) => {
  const q = quadro(seg);
  const submerso = cameraMundo(q, seg).pos.y < -0.05;
  const neb = submerso ? NEBLINA_AGUA : NEBLINA_AR;
  return (
    <>
      <Camera q={q} seg={seg} />
      <hemisphereLight args={['#3a5274', '#07080b', submerso ? 1.1 : 0.9]} />
      <directionalLight position={[-60, 80, 40]} intensity={0.9} color="#7d93c0" />
      <LuzesPonte />
      <Ponte guardaQuebrado={q.guardaQuebrado} />
      <Margens />
      <Agua seg={seg} neblina={neb.dens} corNeblina={neb.cor} alfa={q.alfaAgua} chuva={q.chuva ? 1 : 0.4} brilho={q.camera.tipo === 'carro' ? 0.15 : 0.6} />
      <group position={q.carroPos} rotation={new THREE.Euler(q.carroRot[0], q.carroRot[1], q.carroRot[2], 'YXZ')}>
        <Carro seg={seg} {...q.carro} />
        {q.bolhas && <Particulas tipo="bolha" quantidade={140} posicao={[-0.6, 0.6, 0.3]} raio={1.4} altura={4} vida={2.2} tamanho={0.05} cor1="#bfe6ff" opacidade={0.8} semente={4} />}
      </group>
      {q.respingo > 0 && q.respingo < 1 && (
        <Particulas tipo="respingo" quantidade={220} posicao={[PONTO_AGUA[0], 0, PONTO_AGUA[2]]} raio={2.5} altura={9 * (1 - q.respingo * 0.5)} vida={1.6} tamanho={1.6} cor1="#dfe9f0" cor2="#7f97a8" opacidade={0.75 * (1 - q.respingo)} semente={7} densidadeNeblina={neb.dens} corNeblina={neb.cor} />
      )}
      {q.chuva && !submerso && <Particulas tipo="chuva" quantidade={9000} tamanho={0.5} vento={[1.5, -16, 0.5]} caixa={[40, 24, 40]} cor1="#9fb3c8" opacidade={0.45} semente={3} densidadeNeblina={neb.dens} />}
      {submerso && <Particulas tipo="neve" quantidade={2500} tamanho={0.03} vento={[0.2, 0.9, 0.1]} caixa={[16, 10, 16]} cor1="#5f8a90" opacidade={0.6} semente={9} densidadeNeblina={0.08} />}
    </>
  );
};
