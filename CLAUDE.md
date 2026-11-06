# Sobrevivência Dark

Canal dark de sobrevivência (YouTube, TikTok, Instagram). Marca, logo, capa e descrição em `marca/`.

## TEMA DO CANAL (regra do dono, 05/11/2026)
**Todo vídeo é um POV de "como sobreviver a tal situação".**
- Narrado em segunda pessoa e no presente: "POV: você está num carro que acabou de cair no rio. A água já está no seu tornozelo."
- O espectador é o protagonista. Nada de documentário em terceira pessoa ("em 1971, Juliane…"). Casos reais podem servir de base e de prova ("foi assim que uma garota de 17 anos sobreviveu"), mas a narrativa é sempre o "você" dentro da situação.
- Estrutura base:
  1. **Gancho (0–3 s):** a situação e o tempo que resta. "Você tem 60 segundos."
  2. **O erro que mata:** o que a maioria faz por instinto e por que dá errado.
  3. **Passo a passo para sair vivo:** ações concretas, em ordem, com o porquê de cada uma.
  4. **Fecho:** "Você sobreviveria?" + pergunta para comentários (qual situação no próximo vídeo).
- Situações: desastres naturais, acidentes, ataques de animais, perdido na natureza, emergências urbanas, cenários extremos.
- Shorts/Reels/TikTok (30–60 s) e longos (8–15 min, vários cenários ou um cenário detalhado).

## Segurança da informação
Conselho errado de sobrevivência pode matar alguém. Todo passo a passo precisa ser conferido em fonte oficial (Defesa Civil, Corpo de Bombeiros, Cruz Vermelha, CDC, FEMA, serviços de parques, guias de resgate). Nada de mito ("chupar veneno de cobra", "fingir de morto para qualquer urso"). Na dúvida, corte.

## Identidade
Preto #060606, vermelho #e3141f, osso #ece6dc. Fontes Bebas Neue e Oswald. Símbolo: triângulo de perigo com pessoa fugindo. Bordão: "Você sobreviveria?"

## Observatório Sobrevivência Dark (status em tempo real, desde 06/11/2026)
O dono acompanha as conversas e os vídeos deste canal no artefato **"Observatório Sobrevivência Dark"**: https://claude.ai/artifact/9MTqrG3cEHwtM5pZrvH3w7 (código em `observatorio/observatorio.html`). Não use o Observatório do Lado Sombrio para este canal.

Cada conversa avisa o próprio status gravando **um** documento novo na coleção `eventos` desse artefato, com a ferramenta `ArtifactData` (carregue com ToolSearch `select:ArtifactData` na primeira vez).

**Quando avisar:** só duas vezes por pedido do dono:
1. **Ao começar** um pedido que leva mais que uma resposta rápida: `estado: "work"`, `faz` = o que vai fazer (1 frase curta), `pedido` = o pedido do dono resumido (até 120 caracteres).
2. **Ao terminar:** `estado` = `"idle"` (concluído), `"wait"` (esperando o dono) ou `"fail"` (não conseguiu). `faz` = o que entregou ou o que espera.

Não avise em notificações automáticas nem em respostas de uma linha, e não leia o banco antes de gravar.

**Como gravar** (uma chamada, sem `if_version`, porque o documento é sempre novo):
- `action: "set"`, `url`: o do Observatório, `collection: "eventos"`
- `doc_id`: `<id da sessão>-<timestamp em ms>`. O id da sessão é a variável `CLAUDE_CODE_REMOTE_SESSION_ID` com o prefixo `cse_` trocado por `session_`.
- `data`: `{ "sessao": "<id da sessão>", "titulo": "<título curto da conversa>", "estado": "...", "faz": "...", "pedido": "...", "ts": "<agora em ISO UTC>", "andar": "<setor>" }`. `andar`: "Direção & Marca", "Pesquisa & Roteiros" ou "Produção de Vídeo".

**Vídeo entregue** vai para a coleção `videos`: `{ nome, tipo: "short"|"longo", ordem (número: 1, 2, 3…; o vídeo é chamado sd-1, sd-2…), status: "Pronto", data_pub (AAAA-MM-DD, opcional), video_url, thumb_url, legendas: { yt_titulo, yt_desc, tiktok, reels, tags, comentario }, notas }`. Suba o MP4 e a thumb como assets do próprio Observatório (`Artifact` publish com `url` do Observatório e `asset: true`) e use as `url` retornadas.

Agente novo ou conversa trocada: atualize o `sessao` (e `anteriores`) do agente na coleção `agentes`.

Se a gravação falhar, siga o trabalho e não tente de novo.
