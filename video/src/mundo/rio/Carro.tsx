import React, { useMemo } from 'react';
import * as THREE from 'three';
import { clamp, rng, smoothstep } from '../../motor/matematica';

// Sedã modelado com primitivas, oco por dentro para a câmera POV do motorista.
// Espaço local: frente = +z, piso da cabine em y = 0.3, motorista à esquerda (x < 0).
export const OLHO_MOTORISTA: [number, number, number] = [-0.4, 1.17, -0.18];

const COR = '#7d0f15';
const PRETO = '#0b0c0e';
const INTERNO = '#1b1c1f';
const PLASTICO = '#26272b';

export type EstadoCarro = {
  seg: number;
  farois?: boolean;
  vidroMotorista?: number; // 0 fechado .. 1 aberto
  vidroQuebrado?: number; // 0..1 (rachando -> estilhaçado)
  martelo?: number; // 0..1 animação do quebra-vidros
  fivela?: number; // 0 presa .. 1 solta
  macaneta?: number; // 0..1 puxando
  celular?: boolean;
  criancas?: boolean;
  luzInterna?: number;
};

const Vidro: React.FC<{ args: [number, number]; position: [number, number, number]; rotation?: [number, number, number]; opacidade?: number }> = ({ args, position, rotation, opacidade = 0.22 }) => (
  <group position={position} rotation={rotation}>
    <mesh renderOrder={5}>
      <planeGeometry args={args} />
      <meshPhysicalMaterial color="#9fb6c6" transparent opacity={opacidade} roughness={0.05} metalness={0.1} side={THREE.DoubleSide} depthWrite={false} />
    </mesh>
    {/* moldura de borracha */}
    {[1, -1].map((s) => (
      <mesh key={s} position={[0, (s * args[1]) / 2, 0]}>
        <boxGeometry args={[args[0], 0.025, 0.02]} />
        <meshStandardMaterial color="#050505" />
      </mesh>
    ))}
  </group>
);

// textura da tela do celular (gerada em canvas, nada externo)
let texturaTela: THREE.CanvasTexture | null = null;
const telaCelular = () => {
  if (texturaTela) return texturaTela;
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 512;
  const g = c.getContext('2d')!;
  g.fillStyle = '#0d1420';
  g.fillRect(0, 0, 256, 512);
  g.fillStyle = '#ece6dc';
  g.font = 'bold 34px sans-serif';
  g.textAlign = 'center';
  g.fillText('Emergência', 128, 120);
  g.font = '22px sans-serif';
  g.fillStyle = '#8a96a8';
  g.fillText('chamando...', 128, 160);
  g.fillStyle = '#e3141f';
  g.beginPath();
  g.arc(128, 420, 44, 0, Math.PI * 2);
  g.fill();
  texturaTela = new THREE.CanvasTexture(c);
  texturaTela.colorSpace = THREE.SRGBColorSpace;
  return texturaTela;
};

const Banco: React.FC<{ position: [number, number, number]; largura?: number }> = ({ position, largura = 0.55 }) => (
  <group position={position}>
    <mesh position={[0, 0.25, 0]} castShadow receiveShadow>
      <boxGeometry args={[largura, 0.16, 0.55]} />
      <meshStandardMaterial color={INTERNO} roughness={0.95} />
    </mesh>
    <mesh position={[0, 0.62, -0.28]} rotation={[-0.18, 0, 0]} castShadow receiveShadow>
      <boxGeometry args={[largura, 0.7, 0.14]} />
      <meshStandardMaterial color={INTERNO} roughness={0.95} />
    </mesh>
    <mesh position={[0, 1.06, -0.36]} rotation={[-0.18, 0, 0]}>
      <boxGeometry args={[largura * 0.5, 0.2, 0.12]} />
      <meshStandardMaterial color={INTERNO} roughness={0.95} />
    </mesh>
  </group>
);

// Criança simplificada (silhueta), sentada; escala define a idade.
const Crianca: React.FC<{ position: [number, number, number]; escala: number; cadeirinha?: boolean; cor: string }> = ({ position, escala, cadeirinha, cor }) => (
  <group position={position}>
    {cadeirinha && (
      <group>
        <mesh position={[0, 0.42, -0.05]}>
          <boxGeometry args={[0.46, 0.14, 0.42]} />
          <meshStandardMaterial color="#202a3a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0.72, -0.24]}>
          <boxGeometry args={[0.46, 0.62, 0.1]} />
          <meshStandardMaterial color="#202a3a" roughness={0.9} />
        </mesh>
        {[-1, 1].map((s) => (
          <mesh key={s} position={[s * 0.22, 0.68, -0.08]}>
            <boxGeometry args={[0.05, 0.45, 0.34]} />
            <meshStandardMaterial color="#202a3a" roughness={0.9} />
          </mesh>
        ))}
      </group>
    )}
    <group position={[0, cadeirinha ? 0.48 : 0.36, 0]} scale={escala}>
      <mesh position={[0, 0.28, -0.05]} castShadow>
        <capsuleGeometry args={[0.13, 0.28, 4, 10]} />
        <meshStandardMaterial color={cor} roughness={0.9} />
      </mesh>
      <mesh position={[0, 0.66, -0.04]} castShadow>
        <sphereGeometry args={[0.12, 16, 12]} />
        <meshStandardMaterial color="#b98c6f" roughness={0.8} />
      </mesh>
      <mesh position={[0, 0.72, -0.07]}>
        <sphereGeometry args={[0.125, 16, 12, 0, Math.PI * 2, 0, Math.PI * 0.55]} />
        <meshStandardMaterial color="#1c140f" roughness={1} />
      </mesh>
      {/* pernas */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.07, 0.08, 0.14]} rotation={[Math.PI / 2, 0, 0]}>
          <capsuleGeometry args={[0.05, 0.2, 4, 8]} />
          <meshStandardMaterial color="#2b3344" roughness={0.9} />
        </mesh>
      ))}
    </group>
  </group>
);

const FarolCone: React.FC = () => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
        fog: false,
        vertexShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ vY = position.y; vec4 mv = modelViewMatrix*vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
        fragmentShader: `varying float vY; varying vec3 vN; varying vec3 vV; void main(){ float a = smoothstep(-14.0, 0.0, vY); float borda = pow(abs(dot(vN, vV)), 2.0); gl_FragColor = vec4(vec3(1.0,0.92,0.75) * a * borda * 0.22, 1.0); }`,
      }),
    [],
  );
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(2.2, 14, 20, 1, true);
    g.translate(0, -7, 0);
    return g;
  }, []);
  return <mesh geometry={geo} material={mat} rotation={[-Math.PI / 2 - 0.08, 0, 0]} />;
};

export const Carro: React.FC<EstadoCarro> = ({
  seg,
  farois = true,
  vidroMotorista = 0,
  vidroQuebrado = 0,
  martelo = 0,
  fivela = 0,
  macaneta = 0,
  celular = false,
  criancas = false,
  luzInterna = 1,
}) => {
  const alvoFarol = useMemo(() => {
    const o = new THREE.Object3D();
    o.position.set(0, -0.4, 14);
    return o;
  }, []);
  const cacos = useMemo(() => {
    const r = rng(8);
    return Array.from({ length: 40 }, () => ({ y: 0.98 + r() * 0.42, z: -0.15 + r() * 0.72, v: [r() - 0.5, r() * 0.6, r() - 0.5] as [number, number, number], s: 0.02 + r() * 0.04, rot: r() * 6 }));
  }, []);
  const estilhacado = vidroQuebrado >= 0.5;
  const fiv = clamp(fivela);
  return (
    <group>
      {/* ── carroceria externa */}
      <mesh position={[0, 0.62, 1.62]} castShadow>
        <boxGeometry args={[1.8, 0.62, 1.25]} />
        <meshStandardMaterial color={COR} roughness={0.25} metalness={0.6} />
      </mesh>
      <mesh position={[0, 0.62, -1.82]} castShadow>
        <boxGeometry args={[1.8, 0.62, 0.95]} />
        <meshStandardMaterial color={COR} roughness={0.25} metalness={0.6} />
      </mesh>
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.88, 0.62, -0.17]} castShadow>
          <boxGeometry args={[0.06, 0.66, 2.3]} />
          <meshStandardMaterial color={COR} roughness={0.25} metalness={0.6} side={THREE.DoubleSide} />
        </mesh>
      ))}
      <mesh position={[0, 0.3, -0.17]} receiveShadow>
        <boxGeometry args={[1.76, 0.05, 2.3]} />
        <meshStandardMaterial color="#111214" roughness={1} />
      </mesh>
      {/* teto e colunas */}
      <mesh position={[0, 1.45, -0.3]} castShadow>
        <boxGeometry args={[1.6, 0.06, 1.55]} />
        <meshStandardMaterial color={COR} roughness={0.25} metalness={0.6} side={THREE.DoubleSide} />
      </mesh>
      <mesh position={[0, 1.415, -0.3]}>
        <boxGeometry args={[1.56, 0.01, 1.5]} />
        <meshStandardMaterial color="#3a3a3c" roughness={1} />
      </mesh>
      {[-1, 1].map((s) => (
        <group key={s}>
          <mesh position={[s * 0.8, 1.2, 0.78]} rotation={[-0.75, 0, 0]}>
            <boxGeometry args={[0.07, 0.62, 0.07]} />
            <meshStandardMaterial color={PRETO} />
          </mesh>
          <mesh position={[s * 0.82, 1.2, -0.2]}>
            <boxGeometry args={[0.07, 0.5, 0.1]} />
            <meshStandardMaterial color={PRETO} />
          </mesh>
          <mesh position={[s * 0.8, 1.2, -1.15]} rotation={[0.6, 0, 0]}>
            <boxGeometry args={[0.07, 0.6, 0.1]} />
            <meshStandardMaterial color={PRETO} />
          </mesh>
        </group>
      ))}
      {/* vidros */}
      <Vidro args={[1.56, 0.66]} position={[0, 1.2, 0.79]} rotation={[-0.86, 0, 0]} />
      <Vidro args={[1.56, 0.6]} position={[0, 1.2, -1.2]} rotation={[0.72, 0, 0]} />
      <Vidro args={[0.92, 0.46]} position={[0.86, 1.19, -0.67]} rotation={[0, Math.PI / 2, 0]} />
      <Vidro args={[0.92, 0.46]} position={[-0.86, 1.19, -0.67]} rotation={[0, Math.PI / 2, 0]} />
      <Vidro args={[0.78, 0.46]} position={[0.86, 1.19, 0.25]} rotation={[0, Math.PI / 2, 0]} />
      {/* vidro do motorista: desce, ou racha e estilhaça */}
      {!estilhacado && (
        <group position={[-0.86, 1.19 - clamp(vidroMotorista) * 0.42, 0.25]}>
          <Vidro args={[0.78, 0.46]} position={[0, 0, 0]} rotation={[0, Math.PI / 2, 0]} opacidade={0.22 + vidroQuebrado * 0.5} />
          {vidroQuebrado > 0 && <Rachaduras k={vidroQuebrado * 2} />}
        </group>
      )}
      {estilhacado &&
        cacos.map((c, i) => {
          const k = (vidroQuebrado - 0.5) * 2;
          return (
            <mesh key={i} position={[-0.86 + c.v[0] * k * 0.6 + 0.3 * k, c.y + c.v[1] * k - k * k * 0.8, c.z + c.v[2] * k * 0.5]} rotation={[c.rot, c.rot * 2, k * 4]}>
              <planeGeometry args={[c.s, c.s * 1.3]} />
              <meshStandardMaterial color="#cfe0ea" transparent opacity={0.7 * (1 - k)} metalness={0.5} roughness={0.05} side={THREE.DoubleSide} />
            </mesh>
          );
        })}
      {/* ── interior */}
      <mesh position={[0, 0.86, 0.93]} castShadow>
        <boxGeometry args={[1.7, 0.26, 0.32]} />
        <meshStandardMaterial color={PLASTICO} roughness={0.8} />
      </mesh>
      {/* painel de instrumentos acesos */}
      <mesh position={[-0.4, 0.98, 0.77]} rotation={[-0.5, 0, 0]}>
        <planeGeometry args={[0.42, 0.13]} />
        <meshBasicMaterial color={[0.25 * luzInterna, 0.85 * luzInterna, 1.4 * luzInterna]} toneMapped={false} />
      </mesh>
      <mesh position={[0.05, 0.9, 0.77]} rotation={[-0.3, 0, 0]}>
        <planeGeometry args={[0.24, 0.14]} />
        <meshBasicMaterial color={[0.6 * luzInterna, 0.7 * luzInterna, 0.9 * luzInterna]} toneMapped={false} />
      </mesh>
      {/* volante */}
      <group position={[-0.4, 0.97, 0.5]} rotation={[-0.42, 0, 0]}>
        <mesh>
          <torusGeometry args={[0.19, 0.022, 10, 30]} />
          <meshStandardMaterial color={PRETO} roughness={0.6} />
        </mesh>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.05, 16]} />
          <meshStandardMaterial color={PRETO} roughness={0.6} />
        </mesh>
        <mesh rotation={[0, 0, Math.PI / 2]}>
          <boxGeometry args={[0.03, 0.38, 0.02]} />
          <meshStandardMaterial color={PRETO} />
        </mesh>
      </group>
      {!criancas && <Banco position={[-0.4, 0.3, -0.05]} />}
      {!criancas && <Banco position={[0.4, 0.3, -0.05]} />}
      <Banco position={[0, 0.3, -1.0]} largura={1.5} />
      {/* maçaneta interna da porta do motorista */}
      <group position={[-0.84, 0.86, 0.5]}>
        <mesh>
          <boxGeometry args={[0.04, 0.08, 0.26]} />
          <meshStandardMaterial color="#111" />
        </mesh>
        <mesh position={[0.035 + macaneta * 0.05, 0, 0.02]} rotation={[0, -macaneta * 0.6, 0]}>
          <boxGeometry args={[0.035, 0.05, 0.2]} />
          <meshStandardMaterial color="#d2d6dc" metalness={0.7} roughness={0.25} emissive="#556070" emissiveIntensity={0.5} />
        </mesh>
      </group>
      <mesh position={[-0.845, 0.64, 0.15]}>
        <boxGeometry args={[0.02, 0.62, 1.2]} />
        <meshStandardMaterial color={INTERNO} roughness={0.9} />
      </mesh>
      {/* botão do vidro elétrico */}
      <mesh position={[-0.83, 0.82, 0.25]}>
        <boxGeometry args={[0.05, 0.03, 0.1]} />
        <meshStandardMaterial color="#333" emissive="#4a7dff" emissiveIntensity={0.12} />
      </mesh>
      {/* cinto: fita do pilar B até a fivela */}
      <CintoMotorista fivela={fiv} />
      {celular && (
        <group position={[0.36, 0.645, 0.05]} rotation={[-Math.PI / 2, 0, 0.5]}>
          <mesh>
            <boxGeometry args={[0.075, 0.155, 0.009]} />
            <meshStandardMaterial color="#0a0a0a" metalness={0.6} roughness={0.2} />
          </mesh>
          <mesh position={[0, 0, 0.005]}>
            <planeGeometry args={[0.068, 0.145]} />
            <meshBasicMaterial map={telaCelular()} toneMapped={false} />
          </mesh>
          <pointLight position={[0, 0, 0.12]} color="#9ec4ff" intensity={0.12} distance={0.6} decay={2} />
        </group>
      )}
      {criancas && (
        <>
          <Crianca position={[0.32, 0.3, -0.95]} escala={1.15} cor="#4b2a22" />
          <Crianca position={[-0.32, 0.3, -0.95]} escala={0.8} cadeirinha cor="#2f4a3a" />
        </>
      )}
      {/* luz da cabine (bem fraca, fria) */}
      <pointLight position={[0, 1.32, 0.1]} color="#7d9ccc" intensity={5 * luzInterna} distance={3.5} decay={2} />
      <pointLight position={[0.3, 1.25, -1.2]} color="#5f7fb0" intensity={3 * luzInterna} distance={2.5} decay={2} />
      {/* luz dos postes da ponte entrando pela janela do motorista */}
      <pointLight position={[-2.2, 2.2, 0.6]} color="#ffa055" intensity={6 * luzInterna} distance={6} decay={2} />
      {/* quebra-vidros */}
      {martelo > 0 && <Martelo k={martelo} />}
      {/* rodas */}
      {[[-0.85, 1.35], [0.85, 1.35], [-0.85, -1.4], [0.85, -1.4]].map(([x, z], i) => (
        <mesh key={i} position={[x, 0.33, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.33, 0.33, 0.22, 18]} />
          <meshStandardMaterial color="#0c0c0c" roughness={0.9} />
        </mesh>
      ))}
      {/* faróis e lanternas */}
      {[-0.6, 0.6].map((x) => (
        <group key={x}>
          <mesh position={[x, 0.72, 2.26]}>
            <boxGeometry args={[0.38, 0.12, 0.02]} />
            <meshBasicMaterial color={farois ? [10, 9, 7] : [0.2, 0.2, 0.2]} toneMapped={false} />
          </mesh>
          <mesh position={[x, 0.75, -2.3]}>
            <boxGeometry args={[0.36, 0.1, 0.02]} />
            <meshBasicMaterial color={[5, 0.15, 0.15]} toneMapped={false} />
          </mesh>
          {farois && (
            <group position={[x, 0.72, 2.3]}>
              <FarolCone />
            </group>
          )}
        </group>
      ))}
      {farois && (
        <>
          <primitive object={alvoFarol} />
          <spotLight position={[0, 0.72, 2.3]} target={alvoFarol} angle={0.45} penumbra={0.5} intensity={120} distance={40} decay={1.6} color="#fff0d8" />
        </>
      )}
    </group>
  );
};

const CintoMotorista: React.FC<{ fivela: number }> = ({ fivela }) => {
  // fita diagonal (ombro -> fivela) e abdominal; ao soltar, a lingueta sai e a fita recolhe
  const a = new THREE.Vector3(-0.8, 1.32, -0.22);
  const b = new THREE.Vector3(-0.12 + fivela * 0.25, 0.58 + fivela * 0.35, -0.05 - fivela * 0.1);
  const c = new THREE.Vector3(-0.72, 0.5, -0.12);
  const fita = (p: THREE.Vector3, q: THREE.Vector3, k: string) => {
    const m = p.clone().add(q).multiplyScalar(0.5);
    const d = q.clone().sub(p);
    const quat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().normalize());
    return (
      <mesh key={k} position={m} quaternion={quat}>
        <boxGeometry args={[0.05, d.length(), 0.006]} />
        <meshStandardMaterial color="#121315" roughness={0.9} />
      </mesh>
    );
  };
  return (
    <group>
      {fita(a, b, 'ombro')}
      {fita(c, b, 'colo')}
      {/* receptor da fivela, preso ao banco */}
      <mesh position={[-0.1, 0.52, -0.03]}>
        <boxGeometry args={[0.05, 0.1, 0.04]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.1, 0.575, -0.008]}>
        <boxGeometry args={[0.03, 0.015, 0.012]} />
        <meshStandardMaterial color="#e3141f" emissive="#e3141f" emissiveIntensity={0.6} />
      </mesh>
      {/* lingueta metálica */}
      <mesh position={b} rotation={[0, 0, fivela * 0.8]}>
        <boxGeometry args={[0.045, 0.07, 0.01]} />
        <meshStandardMaterial color="#b9bec5" metalness={0.95} roughness={0.2} />
      </mesh>
    </group>
  );
};

const Rachaduras: React.FC<{ k: number }> = ({ k }) => {
  const obj = useMemo(() => {
    const r = rng(31);
    const pts: number[] = [];
    const ox = 0.3;
    const oy = -0.17; // perto do canto inferior traseiro
    for (let i = 0; i < 16; i++) {
      let a = (i / 16) * Math.PI * 2;
      let x = ox;
      let y = oy;
      for (let j = 0; j < 5; j++) {
        a += (r() - 0.5) * 0.6;
        const nx = x + Math.cos(a) * 0.09;
        const ny = y + Math.sin(a) * 0.09;
        pts.push(0.005, y, x, 0.005, ny, nx);
        x = nx;
        y = ny;
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    return new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: '#f2f8ff', transparent: true, opacity: 0.95 }));
  }, []);
  obj.geometry.setDrawRange(0, Math.floor((obj.geometry.getAttribute('position').count) * clamp(k)));
  return <primitive object={obj} />;
};

const Martelo: React.FC<{ k: number }> = ({ k }) => {
  // aproxima e golpeia o canto da janela lateral
  const golpe = smoothstep(0.35, 0.5, k) - smoothstep(0.55, 0.75, k) * 0.5;
  return (
    <group position={[-0.62 - golpe * 0.2, 1.02, 0.52]} rotation={[0, -Math.PI / 2, -0.4 + golpe * 0.6]}>
      <mesh>
        <boxGeometry args={[0.04, 0.16, 0.035]} />
        <meshStandardMaterial color="#e3141f" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.1, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.018, 0.018, 0.09, 8]} />
        <meshStandardMaterial color="#c8ccd2" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0.05, 0.1, 0]} rotation={[0, 0, -Math.PI / 2]}>
        <coneGeometry args={[0.018, 0.03, 8]} />
        <meshStandardMaterial color="#e8ecf0" metalness={0.9} roughness={0.15} />
      </mesh>
    </group>
  );
};
