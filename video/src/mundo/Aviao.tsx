import React, { useMemo } from 'react';
import * as THREE from 'three';
import { rng } from '../motor/matematica';
import { altura } from '../motor/terreno';

// Monomotor de asa alta (tipo "bush plane"), modelado só com primitivas. Frente = +z.
const BRANCO = '#e6e1d8';
const VERMELHO = '#b8121b';
const ESCURO = '#14161a';
const METAL = '#7a7f86';

const Fuselagem: React.FC<{ comprimento?: number; frente?: boolean; tras?: boolean; fuligem?: number }> = ({ comprimento = 7.4, frente = true, tras = true, fuligem = 0 }) => {
  const cor = new THREE.Color(BRANCO).lerp(new THREE.Color('#1a1816'), fuligem).getStyle();
  return (
    <group>
      <mesh rotation={[Math.PI / 2, 0, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[frente ? 0.62 : 0.5, tras ? 0.24 : 0.5, comprimento, 14, 1, !frente || !tras]} />
        <meshStandardMaterial color={cor} roughness={0.45} metalness={0.25} side={THREE.DoubleSide} />
      </mesh>
      {/* faixa vermelha lateral */}
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[frente ? 0.635 : 0.51, tras ? 0.25 : 0.51, comprimento * 0.92, 14, 1, true, Math.PI * 0.42, Math.PI * 0.16]} />
        <meshStandardMaterial color={VERMELHO} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[frente ? 0.635 : 0.51, tras ? 0.25 : 0.51, comprimento * 0.92, 14, 1, true, Math.PI * 1.42, Math.PI * 0.16]} />
        <meshStandardMaterial color={VERMELHO} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};

const Asa: React.FC<{ envergadura?: number }> = ({ envergadura = 11 }) => (
  <group>
    <mesh castShadow receiveShadow>
      <boxGeometry args={[envergadura, 0.14, 1.55]} />
      <meshStandardMaterial color={BRANCO} roughness={0.5} metalness={0.2} />
    </mesh>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[(s * envergadura) / 2 - s * 0.5, 0.001, 0]}>
        <boxGeometry args={[1.01, 0.145, 1.56]} />
        <meshStandardMaterial color={VERMELHO} roughness={0.5} />
      </mesh>
    ))}
  </group>
);

const Cauda: React.FC = () => (
  <group>
    <mesh position={[0, 0.75, 0]} castShadow>
      <boxGeometry args={[0.08, 1.4, 1.2]} />
      <meshStandardMaterial color={VERMELHO} roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.15, -0.1]} castShadow>
      <boxGeometry args={[3.3, 0.08, 0.9]} />
      <meshStandardMaterial color={BRANCO} roughness={0.5} />
    </mesh>
  </group>
);

const Janelas: React.FC = () => (
  <group>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.55, 0.22, 1.7]} rotation={[0, s * 0.15, 0]}>
        <boxGeometry args={[0.08, 0.45, 1.3]} />
        <meshStandardMaterial color={ESCURO} roughness={0.1} metalness={0.6} />
      </mesh>
    ))}
    <mesh position={[0, 0.42, 2.45]} rotation={[-0.6, 0, 0]}>
      <boxGeometry args={[0.9, 0.05, 0.6]} />
      <meshStandardMaterial color={ESCURO} roughness={0.1} metalness={0.6} />
    </mesh>
  </group>
);

export const AviaoInteiro: React.FC<{ seg: number; luzes?: boolean }> = ({ seg, luzes = true }) => (
  <group>
    <Fuselagem />
    <Janelas />
    <group position={[0, 0.72, 1.3]}>
      <Asa />
    </group>
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 1.6, 0.15, 1.3]} rotation={[0, 0, s * -1.05]}>
        <cylinderGeometry args={[0.035, 0.035, 1.9, 5]} />
        <meshStandardMaterial color={METAL} />
      </mesh>
    ))}
    <group position={[0, 0, -3.5]}>
      <Cauda />
    </group>
    {/* motor e hélice */}
    <mesh position={[0, 0, 3.85]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.5, 0.62, 0.6, 14]} />
      <meshStandardMaterial color={BRANCO} roughness={0.4} metalness={0.3} />
    </mesh>
    <group position={[0, 0, 4.25]} rotation={[0, 0, seg * 70]}>
      <mesh>
        <boxGeometry args={[0.16, 2.1, 0.05]} />
        <meshStandardMaterial color={ESCURO} transparent opacity={0.35} />
      </mesh>
      <mesh position={[0, 0, 0.08]} rotation={[Math.PI / 2, 0, 0]}>
        <coneGeometry args={[0.18, 0.35, 10]} />
        <meshStandardMaterial color={VERMELHO} />
      </mesh>
    </group>
    {/* trem de pouso */}
    {[-1, 1].map((s) => (
      <mesh key={s} position={[s * 0.9, -0.9, 2]} rotation={[Math.PI / 2, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.28, 0.28, 0.16, 12]} />
        <meshStandardMaterial color={ESCURO} />
      </mesh>
    ))}
    {luzes && (
      <>
        <mesh position={[-5.5, 0.72, 1.3]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color={[6, 0.3, 0.3]} toneMapped={false} />
        </mesh>
        <mesh position={[5.5, 0.72, 1.3]}>
          <sphereGeometry args={[0.09, 8, 8]} />
          <meshBasicMaterial color={[0.3, 6, 0.6]} toneMapped={false} />
        </mesh>
        {Math.floor(seg * 1.2) % 2 === 0 && (
          <mesh position={[0, 1.5, -3.6]}>
            <sphereGeometry args={[0.1, 8, 8]} />
            <meshBasicMaterial color={[8, 8, 8]} toneMapped={false} />
          </mesh>
        )}
      </>
    )}
  </group>
);

// Destroços: fuselagem partida em duas, asa arrancada, peças espalhadas.
export const PONTO_FOGO_DESTROCOS: [number, number, number] = [0.3, 0.9, 3.2];
export const PONTO_CAUDA: [number, number, number] = [-3.6, 1.2, -8.5];

export const Destrocos: React.FC<{ fuligem?: number }> = ({ fuligem = 0.35 }) => {
  const pecas = useMemo(() => {
    const r = rng(11);
    return Array.from({ length: 34 }, () => {
      const a = r() * Math.PI * 2;
      const d = 2 + r() * 14;
      const x = Math.cos(a) * d * 0.7;
      const z = Math.sin(a) * d - 4;
      return { x, z, y: altura(x, z), s: [0.2 + r() * 0.9, 0.04 + r() * 0.1, 0.2 + r() * 0.7] as [number, number, number], rot: [r() * 0.6, r() * 6, r() * 0.6] as [number, number, number], branco: r() > 0.45 };
    });
  }, []);
  const y0 = altura(0, 0);
  return (
    <group>
      {/* metade da frente, nariz enterrado na neve */}
      <group position={[0, y0 + 0.35, 1]} rotation={[0.22, 0.25, 0.55]}>
        <group position={[0, 0, 0.9]}>
          <Fuselagem comprimento={4.2} tras={false} fuligem={fuligem} />
          <group position={[0, 0, -0.9]}>
            <Janelas />
          </group>
        </group>
        <mesh position={[0, 0, 3.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.45, 0.62, 0.6, 14]} />
          <meshStandardMaterial color="#3a3632" roughness={0.6} metalness={0.4} />
        </mesh>
        <group position={[2.6, 0.75, 0.6]} rotation={[0, 0, -0.15]}>
          <mesh castShadow receiveShadow>
            <boxGeometry args={[5.4, 0.14, 1.55]} />
            <meshStandardMaterial color={BRANCO} roughness={0.55} />
          </mesh>
        </group>
        {/* hélice torta */}
        <mesh position={[0, 0, 3.6]} rotation={[0.3, 0.2, 0.9]}>
          <boxGeometry args={[0.16, 1.9, 0.05]} />
          <meshStandardMaterial color={ESCURO} />
        </mesh>
      </group>
      {/* metade de trás */}
      <group position={[-3.4, y0 + 0.45, -7.5]} rotation={[-0.05, 0.85, -0.35]}>
        <group position={[0, 0, -0.6]}>
          <Fuselagem comprimento={3.6} frente={false} fuligem={fuligem * 0.5} />
        </group>
        <group position={[0, 0, -2.3]}>
          <Cauda />
        </group>
      </group>
      {/* asa arrancada pelas árvores */}
      <group position={[5, y0 + 0.4, -15]} rotation={[0.12, 1.25, 0.2]}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[5.4, 0.14, 1.55]} />
          <meshStandardMaterial color={BRANCO} roughness={0.55} />
        </mesh>
        <mesh position={[-2.2, 0.001, 0]}>
          <boxGeometry args={[1.01, 0.145, 1.56]} />
          <meshStandardMaterial color={VERMELHO} roughness={0.5} />
        </mesh>
      </group>
      {/* árvores quebradas no corredor */}
      {[[-6, -20], [-9, -27], [-3, -24], [-12, -36]].map(([x, z], i) => (
        <mesh key={i} position={[x, altura(x, z) + 1.2, z]} rotation={[0.2 * i, 0, 0.3 + i * 0.2]} castShadow>
          <cylinderGeometry args={[0.15, 0.2, 2.4, 6]} />
          <meshStandardMaterial color="#2a1f18" roughness={1} />
        </mesh>
      ))}
      {pecas.map((p, i) => (
        <mesh key={i} position={[p.x, p.y + 0.05, p.z]} rotation={p.rot} castShadow>
          <boxGeometry args={p.s} />
          <meshStandardMaterial color={p.branco ? BRANCO : '#2b2b2e'} roughness={0.6} metalness={0.3} />
        </mesh>
      ))}
    </group>
  );
};
