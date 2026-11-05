# Narração pt-BR via edge-tts, com marcação de tempo por palavra (para a legenda).
# uso: python3 scripts/tts.py <arquivo-texto> <saida.mp3> <saida.json> [voz] [velocidade]
import asyncio, json, ssl, sys
import edge_tts, edge_tts.communicate as c
c._SSL_CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt') if len(sys.argv) < 7 else c._SSL_CTX

async def main():
    texto = open(sys.argv[1], encoding='utf-8').read().strip()
    voz = sys.argv[4] if len(sys.argv) > 4 else 'pt-BR-AntonioNeural'
    vel = sys.argv[5] if len(sys.argv) > 5 else '+0%'
    com = edge_tts.Communicate(texto, voz, rate=vel, boundary='WordBoundary')
    palavras = []
    with open(sys.argv[2], 'wb') as f:
        async for ch in com.stream():
            if ch['type'] == 'audio':
                f.write(ch['data'])
            elif ch['type'] == 'WordBoundary':
                palavras.append({'texto': ch['text'], 'inicio': ch['offset'] / 1e7, 'fim': (ch['offset'] + ch['duration']) / 1e7})
    json.dump(palavras, open(sys.argv[3], 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
    print(len(palavras), 'palavras')

asyncio.run(main())
