// Tipos do roteiro. Um episódio é só DADOS: o motor (src/motor, src/mundo) monta
// tudo a partir daqui. Para um episódio novo, copie alasca.ts e troque o conteúdo.

export type Vec3 = [number, number, number];

export type MovimentoCamera =
  | 'drone' // voo alto e lento, avançando, com leve inclinação
  | 'dollyIn' // aproxima em linha reta do alvo
  | 'dollyOut' // afasta em linha reta, revelando o ambiente
  | 'orbit' // gira ao redor do alvo
  | 'handheld' // câmera na mão: tremor orgânico, respiração
  | 'slowZoom' // câmera parada, lente fechando devagar
  | 'crashZoom' // lente fecha de forma brusca nos primeiros frames
  | 'tracking' // acompanha um objeto em movimento (avião, helicóptero)
  | 'topDown'; // vista de cima, descendo ou subindo

export type Camera = {
  tipo: MovimentoCamera;
  de?: Vec3; // posição inicial
  para?: Vec3; // posição final
  alvo?: Vec3; // para onde a câmera olha
  segue?: 'aviao' | 'helicoptero'; // tracking: segue este objeto
  deslocamento?: Vec3; // tracking: posição da câmera relativa ao objeto
  raio?: number; // orbit
  altura?: number; // orbit
  voltas?: number; // orbit: fração de volta (0.25 = 90°)
  anguloInicial?: number; // orbit, em graus
  fov?: [number, number]; // lente: [inicial, final]
  tremor?: number; // 0..1, somado a qualquer movimento (turbulência, impacto)
};

export type Hora = 'dia' | 'crepusculo' | 'noite' | 'amanhecer';

export type Mundo = {
  hora: Hora;
  neve?: number; // 0..1 quantidade de neve caindo
  vento?: number; // 0..1 deriva lateral da neve e balanço das árvores
  neblina?: number; // 0..1 densidade da neblina volumétrica
  raios?: boolean; // relâmpagos na tempestade
  aviao?: {
    estado: 'voando' | 'caindo' | 'destrocos';
    de?: Vec3;
    para?: Vec3;
    impacto?: number; // 0..1 momento do impacto na cena (estado 'caindo')
  };
  fumacaDestrocos?: boolean;
  fogoDestrocos?: boolean;
  fogueira?: 'acendendo' | 'alta' | 'baixa';
  tresFogueiras?: boolean; // sinal internacional de socorro
  abrigo?: boolean;
  pegadas?: boolean;
  olhos?: boolean; // olhos de urso refletindo a fogueira
  helicoptero?: { modo: 'passando' | 'circulando' | 'pousando' | 'subindo' };
  rio?: 'intacto' | 'quebrando' | 'buraco';
  subaquatico?: boolean;
  sinalELT?: boolean; // anéis de rádio saindo dos destroços
  rotaVoo?: boolean; // linha vermelha da rota planejada vs. ponto da queda
  caixaSobrevivencia?: boolean;
  lata?: boolean; // lata derretendo neve na fogueira
  roupas?: boolean; // roupas secando perto do fogo
  geada?: boolean; // cristais de gelo crescendo na fuselagem
};

export type Destaque =
  | { tipo: 'gancho'; texto: string; inicio?: number } // frase de retenção no centro
  | { tipo: 'dado'; titulo: string; texto: string; inicio?: number } // dado surpreendente
  | { tipo: 'regra'; itens: string[]; inicio?: number } // lista numerada (ex.: regra dos 3)
  | { tipo: 'titulo'; texto: string; subtitulo?: string; inicio?: number } // título do episódio
  | { tipo: 'encerramento' }; // card final do canal

export type Som = {
  ambiente?: Array<{ arquivo: string; volume: number }>;
  sfx?: Array<{ arquivo: string; em: number; volume?: number }>; // em = 0..1 da cena
  tensao: number; // 0..1 intensidade da trilha de tensão
  descricao: string; // o que se ouve (para o editor de áudio)
};

export type Cena = {
  id: string;
  capitulo: number;
  narracao: string; // *palavra* = destaque em vermelho na legenda
  visual: string;
  camera: Camera;
  elementos3d: string[];
  efeitos: string[];
  som: Som;
  mundo: Mundo;
  hud?: { dia: number; hora: string; temperatura: number; sensacao?: number; horasRestantes: number; corporal?: [number, number] };
  destaque?: Destaque;
  entrada?: 'corte' | 'fade' | 'flash' | 'preto';
  saida?: 'corte' | 'preto' | 'flash';
  duracaoExtra?: number; // segundos de respiro além da narração
};

export type Capitulo = { numero: number; titulo: string };

export type Episodio = {
  id: string;
  titulo: string;
  tituloAlternativo: string[];
  thumbnail: { texto: string; subtexto: string; descricao: string };
  descricaoYoutube: string;
  capitulos: Capitulo[];
  cenas: Cena[];
};
