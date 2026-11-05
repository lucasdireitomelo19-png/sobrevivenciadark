import React, { useMemo } from 'react';
import * as THREE from 'three';
import { noise2D } from '@remotion/noise';
import { Particulas } from './Particulas';
import { altura, rioCentro, NIVEL_GELO, RIO_LARGURA } from '../motor/terreno';
import { clamp, rng, smoothstep } from '../motor/matematica';
import type { Vec3 } from '../roteiro/tipos';

type Neblina = { densidade: number; cor: string };

// ── Fogo: chama + brasas + fumaça + luz que tremula. intensidade 0..1.
export const Fogo: React.FC<{ pos: Vec3; intensidade: number; seg: number; neblina: Neblina; escala?: number; luz?: boolean; fumacaBranca?: boolean; vento?: number; semente?: number }> = ({
  pos,
  intensidade,
  seg,
  neblina,
  escala = 1,
  luz = true,
  fumacaBranca = false,
  vento = 0.2,
  semente = 1,
}) => {
  const k = clamp(intensidade);
  const tremula = 0.75 + 0.25 * noise2D('luz', seg * 6 + semente, 0) + 0.12 * noise2D('luz', seg * 17, semente);
  return (
    <group position={pos}>
      {k > 0.02 && (
        <>
          <Particulas tipo="fogo" quantidade={160 * escala} raio={0.35 * escala} altura={1.4 * escala * (0.4 + k * 0.6)} vida={0.9} tamanho={0.5 * escala * (0.5 + k * 0.5)} cor1="#ffd98a" cor2="#ff3d0a" opacidade={0.9 * k} semente={semente} densidadeNeblina={neblina.densidade} />
          <Particulas tipo="brasa" quantidade={40 * escala * k} raio={0.3 * escala} altura={3.5 * escala} vida={2.2} tamanho={0.04 * escala} cor1="#ffcf6a" cor2="#ff4a10" opacidade={1} vento={[vento * 0.4, 0, 0]} semente={semente + 2} densidadeNeblina={neblina.densidade} />
        </>
      )}
      <Particulas
        tipo="fumaca"
        quantidade={fumacaBranca ? 90 : 50}
        posicao={[0, 0.8 * escala, 0]}
        raio={0.4 * escala}
        altura={fumacaBranca ? 38 : 9 * escala}
        vida={fumacaBranca ? 11 : 6}
        tamanho={fumacaBranca ? 3.6 : 1.4 * escala}
        vento={[vento * 0.8, 0, vento * 0.2]}
        cor1={fumacaBranca ? '#e9ecef' : '#3b3734'}
        cor2={fumacaBranca ? '#c3c8cf' : '#1d1c1c'}
        opacidade={fumacaBranca ? 0.55 : 0.4 * (0.3 + k)}
        semente={semente + 4}
        densidadeNeblina={neblina.densidade}
        corNeblina={neblina.cor}
      />
      {luz && k > 0.02 && <pointLight position={[0, 0.6 * escala, 0]} color="#ff8a3a" intensity={(18 + 30 * escala) * k * tremula} distance={28 * escala} decay={1.6} castShadow={escala >= 1} shadow-mapSize={[512, 512]} />}
    </group>
  );
};

// Fogueira montada: pedras, lenha e casca de bétula + o fogo.
export const Fogueira: React.FC<{ pos: Vec3; intensidade: number; seg: number; neblina: Neblina; fumacaBranca?: boolean; semente?: number; luz?: boolean }> = (p) => {
  const pedras = useMemo(() => {
    const r = rng(p.semente ?? 3);
    return Array.from({ length: 9 }, (_, i) => {
      const a = (i / 9) * Math.PI * 2;
      return { x: Math.cos(a) * 0.75, z: Math.sin(a) * 0.75, s: 0.16 + r() * 0.1 };
    });
  }, [p.semente]);
  return (
    <group>
      <group position={p.pos}>
        {pedras.map((s, i) => (
          <mesh key={i} position={[s.x, s.s * 0.5, s.z]} castShadow>
            <dodecahedronGeometry args={[s.s, 0]} />
            <meshStandardMaterial color="#45464b" roughness={1} />
          </mesh>
        ))}
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} position={[0, 0.18, 0]} rotation={[0.35, (i * Math.PI) / 2, 0]}>
            <cylinderGeometry args={[0.06, 0.08, 1.2, 6]} />
            <meshStandardMaterial color="#2a1c12" roughness={1} emissive="#ff3a00" emissiveIntensity={0.6 * p.intensidade} />
          </mesh>
        ))}
        {/* casca de bétula: lascas brancas */}
        {[0, 1, 2, 3, 4].map((i) => (
          <mesh key={`b${i}`} position={[Math.cos(i * 1.3) * 0.25, 0.06, Math.sin(i * 1.3) * 0.25]} rotation={[Math.PI / 2, 0, i]}>
            <cylinderGeometry args={[0.05, 0.05, 0.25, 8, 1, true, 0, Math.PI * 1.3]} />
            <meshStandardMaterial color="#e8e2d6" roughness={0.8} side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
      <Fogo {...p} pos={[p.pos[0], p.pos[1] + 0.15, p.pos[2]]} />
    </group>
  );
};

// ── Abrigo inclinado (lean-to) encostado nos destroços, coberto de galhos e neve.
export const Abrigo: React.FC = () => {
  const x0 = 7;
  const z0 = 5;
  const y0 = altura(x0, z0);
  const troncos = Array.from({ length: 9 }, (_, i) => i);
  return (
    <group position={[x0, y0, z0]} rotation={[0, -0.5, 0]}>
      {/* viga horizontal entre dois apoios */}
      <mesh position={[0, 1.55, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
        <cylinderGeometry args={[0.09, 0.09, 3.6, 6]} />
        <meshStandardMaterial color="#3a2a1c" roughness={1} />
      </mesh>
      {[-1.6, 1.6].map((x) => (
        <mesh key={x} position={[x, 0.8, 0.1]} rotation={[0.1, 0, x > 0 ? -0.08 : 0.08]} castShadow>
          <cylinderGeometry args={[0.08, 0.1, 1.7, 6]} />
          <meshStandardMaterial color="#3a2a1c" roughness={1} />
        </mesh>
      ))}
      {troncos.map((i) => (
        <mesh key={i} position={[-1.6 + i * 0.4, 0.78, -0.75]} rotation={[-1.05, 0, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.06, 0.08, 2.0, 5]} />
          <meshStandardMaterial color="#33251a" roughness={1} />
        </mesh>
      ))}
      {/* cobertura de galhos (verde) e neve por cima */}
      <mesh position={[0, 0.82, -0.82]} rotation={[-1.05, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.7, 2.1, 0.22]} />
        <meshStandardMaterial color="#1a2b20" roughness={1} />
      </mesh>
      <mesh position={[0, 0.9, -0.95]} rotation={[-1.05, 0, 0]} castShadow receiveShadow>
        <boxGeometry args={[3.8, 2.15, 0.14]} />
        <meshStandardMaterial color="#e6ecf2" roughness={0.9} />
      </mesh>
      {/* cama de galhos de pinheiro no chão */}
      <mesh position={[0, 0.08, -0.3]} receiveShadow>
        <boxGeometry args={[3.2, 0.16, 1.5]} />
        <meshStandardMaterial color="#1d3324" roughness={1} />
      </mesh>
    </group>
  );
};

// ── Olhos refletindo a fogueira (tapetum lucidum) + silhueta na neblina.
export const Olhos: React.FC<{ seg: number; silhueta?: boolean }> = ({ seg, silhueta = true }) => {
  const x = -4;
  const z = 30;
  const y = altura(x, z) + 1.1;
  const piscada = (seg % 4.3 > 4.1 ? 0.1 : 1) * clamp(seg / 1.2);
  const deriva = Math.sin(seg * 0.35) * 0.4;
  return (
    <group position={[x + deriva, y, z]}>
      {[-0.16, 0.16].map((dx) => (
        <mesh key={dx} position={[dx, 0, 0]} scale={[1, piscada, 1]}>
          <sphereGeometry args={[0.045, 10, 8]} />
          <meshBasicMaterial color={[9, 6.5, 1.6]} toneMapped={false} fog={false} />
        </mesh>
      ))}
      {silhueta && (
        <mesh position={[0, -0.2, -0.9]} scale={[1.25, 1.05, 1.9]}>
          <sphereGeometry args={[0.8, 16, 12]} />
          <meshStandardMaterial color="#050506" roughness={1} />
        </mesh>
      )}
    </group>
  );
};

// ── Helicóptero de resgate com holofote volumétrico e luzes de navegação.
export const Helicoptero: React.FC<{ pos: Vec3; dir: Vec3; seg: number; holofote?: boolean }> = ({ pos, dir, seg, holofote = true }) => {
  const yaw = Math.atan2(dir[0], dir[2]);
  const cone = useMemo(() => {
    const g = new THREE.ConeGeometry(14, 60, 24, 1, true);
    g.translate(0, -30, 0);
    return g;
  }, []);
  const matCone = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        uniforms: {},
        vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float a = smoothstep(-60.0, 0.0, vY); float borda = pow(abs(dot(vN, vV)), 1.5); gl_FragColor = vec4(vec3(0.85,0.9,1.0) * a * borda * 0.35, 1.0); }`,
      }),
    [],
  );
  const alvoHolofote = useMemo(() => new THREE.Object3D(), []);
  const pisca = Math.floor(seg * 1.5) % 2 === 0;
  return (
    <group position={pos} rotation={[0, yaw, 0]}>
      <group rotation={[0.12, 0, 0]}>
        <mesh scale={[1.3, 1.25, 2.4]} castShadow>
          <sphereGeometry args={[1, 18, 12]} />
          <meshStandardMaterial color="#c8161e" roughness={0.4} metalness={0.3} />
        </mesh>
        <mesh position={[0, 0.25, 1.45]} scale={[1.05, 0.75, 0.9]}>
          <sphereGeometry args={[1, 16, 10]} />
          <meshStandardMaterial color="#0d1218" roughness={0.05} metalness={0.8} />
        </mesh>
        <mesh position={[0, 0.35, -4.2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.18, 0.4, 5, 8]} />
          <meshStandardMaterial color="#c8161e" roughness={0.4} />
        </mesh>
        <mesh position={[0, 1.0, -6.6]}>
          <boxGeometry args={[0.1, 1.5, 0.9]} />
          <meshStandardMaterial color="#e8e2d8" roughness={0.5} />
        </mesh>
        {/* rotor principal e de cauda */}
        <group position={[0, 1.45, 0]} rotation={[0, seg * 32, 0]}>
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} rotation={[0, (i * Math.PI) / 2, 0]} position={[0, 0, 0]}>
              <boxGeometry args={[0.3, 0.04, 11]} />
              <meshStandardMaterial color="#111" transparent opacity={0.45} />
            </mesh>
          ))}
        </group>
        <group position={[0.2, 1.0, -6.6]} rotation={[seg * 60, 0, 0]}>
          <mesh>
            <boxGeometry args={[0.04, 2, 0.15]} />
            <meshStandardMaterial color="#111" transparent opacity={0.5} />
          </mesh>
        </group>
        {/* esquis */}
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 1.1, -1.5, 0.2]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 4, 6]} />
            <meshStandardMaterial color="#222" />
          </mesh>
        ))}
        {/* luzes */}
        <mesh position={[-1.3, 0, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={[8, 0.4, 0.4]} toneMapped={false} fog={false} />
        </mesh>
        <mesh position={[1.3, 0, 0]}>
          <sphereGeometry args={[0.12, 8, 8]} />
          <meshBasicMaterial color={[0.4, 8, 0.8]} toneMapped={false} fog={false} />
        </mesh>
        {pisca && (
          <mesh position={[0, 1.9, -1]}>
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshBasicMaterial color={[12, 12, 12]} toneMapped={false} fog={false} />
          </mesh>
        )}
      </group>
      {holofote && (
        <group position={[0, -1.2, 1.6]} rotation={[0.55 + Math.sin(seg * 0.7) * 0.25, 0, Math.sin(seg * 0.5) * 0.35]}>
          <mesh>
            <sphereGeometry args={[0.25, 10, 8]} />
            <meshBasicMaterial color={[14, 14, 13]} toneMapped={false} fog={false} />
          </mesh>
          <mesh geometry={cone} material={matCone} />
          <primitive object={alvoHolofote} position={[0, -60, 0]} />
          <spotLight position={[0, 0, 0]} target={alvoHolofote} angle={0.3} penumbra={0.6} intensity={9000} distance={260} decay={1.8} color="#e6eeff" />
        </group>
      )}
    </group>
  );
};

// ── Rio congelado: gelo, rachaduras crescendo, buraco e água escura.
export const Rio: React.FC<{ estado: 'intacto' | 'quebrando' | 'buraco'; t: number; seg: number }> = ({ estado, t }) => {
  const geo = useMemo(() => {
    const pts: number[] = [];
    const idx: number[] = [];
    const N = 220;
    for (let i = 0; i <= N; i++) {
      const z = -500 + (i / N) * 1000;
      const cx = rioCentro(z);
      pts.push(cx - RIO_LARGURA - 2, NIVEL_GELO, z, cx + RIO_LARGURA + 2, NIVEL_GELO, z);
      if (i < N) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }, []);

  // rachaduras: ramos aleatórios saindo do ponto do pé
  const rachaduras = useMemo(() => {
    const r = rng(77);
    const segs: number[] = [];
    const ramo = (x: number, z: number, a: number, len: number, prof: number) => {
      let px = x;
      let pz = z;
      const passos = 6;
      for (let i = 0; i < passos; i++) {
        a += (r() - 0.5) * 0.9;
        const nx = px + Math.cos(a) * (len / passos);
        const nz = pz + Math.sin(a) * (len / passos);
        segs.push(px, NIVEL_GELO + 0.02, pz, nx, NIVEL_GELO + 0.02, nz);
        px = nx;
        pz = nz;
        if (prof > 0 && r() > 0.6) ramo(px, pz, a + (r() > 0.5 ? 0.8 : -0.8), len * 0.5, prof - 1);
      }
    };
    const cx = rioCentro(0);
    for (let i = 0; i < 9; i++) ramo(cx, 0, (i / 9) * Math.PI * 2, 2.5 + r() * 4, 2);
    return segs;
  }, []);
  const progresso = estado === 'intacto' ? 0 : estado === 'quebrando' ? smoothstep(0, 0.12, t) : 1;
  const linhas = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(rachaduras, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f4fbff', transparent: true, opacity: 0.9 }));
  }, [rachaduras]);
  linhas.geometry.setDrawRange(0, Math.floor((rachaduras.length / 3) * progresso));
  const cx = rioCentro(0);
  return (
    <group>
      <mesh geometry={geo} receiveShadow>
        <meshStandardMaterial color="#9fb9cf" roughness={0.18} metalness={0.15} transparent opacity={estado === 'intacto' ? 0.96 : 0.9} side={THREE.DoubleSide} />
      </mesh>
      {progresso > 0 && <primitive object={linhas} />}
      {estado !== 'intacto' && (
        <mesh position={[cx, NIVEL_GELO + 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} scale={progresso}>
          <circleGeometry args={[1.3, 20]} />
          <meshStandardMaterial color="#04121b" roughness={0.05} metalness={0.4} />
        </mesh>
      )}
      {estado === 'buraco' && (
        // marcas de rolar na neve do gelo, saindo do buraco
        <mesh position={[cx - 3.2, NIVEL_GELO + 0.015, 0.4]} rotation={[-Math.PI / 2, 0, 0.15]}>
          <planeGeometry args={[4.5, 0.9]} />
          <meshStandardMaterial color="#7d93a8" roughness={0.5} transparent opacity={0.7} />
        </mesh>
      )}
    </group>
  );
};

// ── Pegadas fundas saindo dos destroços em direção à floresta.
export const Pegadas: React.FC<{ ate?: number }> = ({ ate = 1 }) => {
  const passos = useMemo(() => {
    const lista: { x: number; z: number; a: number }[] = [];
    for (let i = 0; i < 60; i++) {
      const k = i / 60;
      const x = 2 - k * 12 + (i % 2 ? 0.22 : -0.22) + Math.sin(k * 5) * 1.5;
      const z = 5 + k * 30;
      lista.push({ x, z, a: Math.atan2(-12, 30) });
    }
    return lista;
  }, []);
  return (
    <group>
      {passos.slice(0, Math.floor(passos.length * ate)).map((p, i) => (
        <mesh key={i} position={[p.x, altura(p.x, p.z) + 0.02, p.z]} rotation={[-Math.PI / 2, 0, p.a]}>
          <circleGeometry args={[0.16, 10]} />
          <meshStandardMaterial color="#8996a8" roughness={1} />
        </mesh>
      ))}
    </group>
  );
};

// ── Sinal do ELT: anéis vermelhos se expandindo a partir da cauda.
export const SinalELT: React.FC<{ pos: Vec3; seg: number }> = ({ pos, seg }) => (
  <group position={pos}>
    {[0, 1, 2, 3].map((i) => {
      const k = ((seg / 2.4 + i / 4) % 1);
      return (
        <mesh key={i} rotation={[-Math.PI / 2, 0, 0]} scale={2 + k * 160}>
          <ringGeometry args={[0.97, 1, 64]} />
          <meshBasicMaterial color={[4, 0.2, 0.25]} transparent opacity={(1 - k) * 0.9} toneMapped={false} depthWrite={false} side={THREE.DoubleSide} fog={false} />
        </mesh>
      );
    })}
    <mesh>
      <sphereGeometry args={[0.18, 10, 8]} />
      <meshBasicMaterial color={[8, 0.4, 0.4]} toneMapped={false} fog={false} />
    </mesh>
  </group>
);

// ── Rota planejada (linha vermelha tracejada) e o desvio até a queda.
export const RotaVoo: React.FC<{ t: number }> = ({ t }) => {
  const obj = useMemo(() => {
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i <= 80; i++) {
      const z = -1200 + i * 30;
      const x = -300 + i * 4.5;
      pts.push(new THREE.Vector3(x, altura(x, z) + 4, z));
    }
    const g = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.Line(g, new THREE.LineDashedMaterial({ color: '#ff2a32', dashSize: 14, gapSize: 9, fog: false, toneMapped: false }));
    l.computeLineDistances();
    return l;
  }, []);
  obj.geometry.setDrawRange(0, Math.floor(81 * smoothstep(0, 0.5, t)));
  return <primitive object={obj} />;
};

// ── Pequenos objetos de cena.
export const CaixaSobrevivencia: React.FC = () => (
  <group position={[-2.5, altura(-2.5, -3) + 0.18, -3]} rotation={[0.1, 0.7, 0.15]}>
    <mesh castShadow>
      <boxGeometry args={[0.8, 0.4, 0.5]} />
      <meshStandardMaterial color="#e2571a" roughness={0.5} />
    </mesh>
    <mesh position={[0, 0.21, 0]}>
      <boxGeometry args={[0.82, 0.03, 0.12]} />
      <meshStandardMaterial color="#ece6dc" />
    </mesh>
  </group>
);

export const Lata: React.FC<{ t: number; seg: number; neblina: Neblina }> = ({ t, neblina }) => (
  <group position={[5.75, altura(5.75, 9.2) + 0.25, 9.2]}>
    <mesh castShadow>
      <cylinderGeometry args={[0.13, 0.13, 0.3, 16, 1, true]} />
      <meshStandardMaterial color="#9aa0a6" metalness={0.8} roughness={0.35} side={THREE.DoubleSide} />
    </mesh>
    <mesh position={[0, 0.12 - t * 0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
      <circleGeometry args={[0.125, 16]} />
      <meshStandardMaterial color={new THREE.Color('#f2f5f8').lerp(new THREE.Color('#2b3a48'), smoothstep(0.2, 0.8, t))} roughness={0.3 - t * 0.25} />
    </mesh>
    <Particulas tipo="vapor" quantidade={30} posicao={[0, 0.2, 0]} raio={0.08} altura={1.4} vida={2.5} tamanho={0.35} cor1="#e8ecf0" cor2="#c0c6cc" opacidade={0.25 + t * 0.3} semente={21} densidadeNeblina={neblina.densidade} corNeblina={neblina.cor} />
  </group>
);

export const Roupas: React.FC<{ seg: number; neblina: Neblina }> = ({ seg, neblina }) => (
  <group position={[6.3, altura(6.3, 7.7), 7.7]} rotation={[0, 0.4, 0]}>
    <mesh position={[0, 1.2, 0]} rotation={[0, 0, Math.PI / 2]}>
      <cylinderGeometry args={[0.03, 0.03, 2.2, 5]} />
      <meshStandardMaterial color="#3a2a1c" />
    </mesh>
    {[-0.6, 0.1, 0.7].map((x, i) => (
      <mesh key={i} position={[x, 0.85, 0]} rotation={[Math.sin(seg + i) * 0.05, 0, 0]} castShadow>
        <boxGeometry args={[0.5, 0.65, 0.03]} />
        <meshStandardMaterial color={['#2f3b2a', '#4a2320', '#22303f'][i]} roughness={1} />
      </mesh>
    ))}
    <Particulas tipo="vapor" quantidade={40} posicao={[0, 0.9, 0]} raio={0.7} altura={1.6} vida={3} tamanho={0.4} cor1="#e6e9ec" cor2="#c0c6cc" opacidade={0.18} semente={23} densidadeNeblina={neblina.densidade} corNeblina={neblina.cor} />
  </group>
);

// Geada: espinhos brancos crescendo sobre o metal (agulhas instanciadas).
export const Geada: React.FC<{ t: number }> = ({ t }) => {
  const agulhas = useMemo(() => {
    const r = rng(91);
    return Array.from({ length: 140 }, () => ({ x: (r() - 0.5) * 1.2, y: 0.6 + r() * 0.9, z: (r() - 0.5) * 2.4, a: r() * 6, s: 0.03 + r() * 0.1, d: r() }));
  }, []);
  return (
    <group position={[0.65, altura(0.6, 1), 1.5]}>
      {agulhas.map((g, i) => {
        const k = clamp((t * 1.4 - g.d * 0.6) * 2);
        if (k <= 0) return null;
        return (
          <mesh key={i} position={[g.x * 0.4 + 0.45, g.y, g.z]} rotation={[g.a, 0, g.a * 0.5]} scale={[1, k, 1]}>
            <coneGeometry args={[0.008, g.s * 2, 3]} />
            <meshStandardMaterial color="#f2f8ff" emissive="#9fc4ff" emissiveIntensity={0.25} roughness={0.2} />
          </mesh>
        );
      })}
    </group>
  );
};
