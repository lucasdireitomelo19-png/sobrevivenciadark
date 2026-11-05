# Gerador de vídeos · Sobrevivência Dark

Vídeos 100% em Remotion + Three.js (sem imagem de banco). O roteirista entrega o roteiro;
aqui ele vira narração (ElevenLabs), cenas 3D, textos na tela e trilha.

## Fluxo de um roteiro
1. Texto da narração em `roteiros/<id>/short-narracao.txt` (uma linha = um bloco/cena).
2. Narração + tempo de cada palavra:
   `python3 scripts/narrar.py roteiros/<id>/short-narracao.txt public/narracao/<id>-short`
   (key em `$ELEVENLABS_API_KEY`; voz padrão: David, `7i7dgyCkKt4c16dLtwT3`)
3. Efeitos sonoros sintetizados: `npm run sons`
4. Cenas: `src/episodios/<id>/diretor.ts` decide câmera/carro/eventos a partir dos tempos da narração;
   `Mundo.tsx` é o 3D, `Telas.tsx` são os textos (legenda, contador, PASSO, X, tela final).
5. Conferir quadros: `node scripts/quadros.mjs Short002CarroNoRio 1,5,9 0.3` → `out/folha.png`
6. Render: `npm run render:short002` (em servidor sem GPU: `--gl=swangle`).

## Peças reutilizáveis
- `src/mundo/Particulas.tsx`: fogo, brasa, fumaça, vapor, neve, chuva, bolhas, respingo (shader, determinístico)
- `src/mundo/rio/`: água com ondas e gotas, ponte, margens, carro com cabine POV (cinto, janela, quebra-vidros, celular, crianças)
- `src/mundo/`: terreno/floresta/céu/raios, fogueira, abrigo, helicóptero, gelo do rio, olhos no escuro
- `src/ui/`: fontes da marca e triângulo do canal
