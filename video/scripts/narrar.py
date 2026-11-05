# Gera a narração com ElevenLabs e o tempo de cada palavra e de cada linha.
# uso: python3 scripts/narrar.py <texto.txt> <saida-sem-extensao> [voice_id]
# Cada linha do texto vira um "bloco" (uma cena). Key: $ELEVENLABS_API_KEY ou /root/.elevenlabs_key
import base64, json, os, sys, urllib.request
texto_linhas = [l.strip() for l in open(sys.argv[1], encoding='utf-8') if l.strip()]
saida = sys.argv[2]
voz = sys.argv[3] if len(sys.argv) > 3 else '7i7dgyCkKt4c16dLtwT3'  # David
key = os.environ.get('ELEVENLABS_API_KEY') or open('/root/.elevenlabs_key').read().strip()
PAUSA = ' <break time="0.35s" /> '
texto = PAUSA.join(texto_linhas)
corpo = json.dumps({
    'text': texto,
    'model_id': 'eleven_multilingual_v2',
    'voice_settings': {'stability': 0.42, 'similarity_boost': 0.82, 'style': 0.4, 'use_speaker_boost': True, 'speed': 1.1},
}).encode()
req = urllib.request.Request(f'https://api.elevenlabs.io/v1/text-to-speech/{voz}/with-timestamps?output_format=mp3_44100_192',
                             data=corpo, headers={'xi-api-key': key, 'Content-Type': 'application/json'})
r = json.load(urllib.request.urlopen(req, timeout=300))
open(saida + '.mp3', 'wb').write(base64.b64decode(r['audio_base64']))
al = r['alignment']
chars, ini, fim = al['characters'], al['character_start_times_seconds'], al['character_end_times_seconds']
# reconstrói palavras, ignorando as tags <break>
palavras, atual, t0, t1, dentro_tag = [], '', None, None, False
for c, a, b in zip(chars, ini, fim):
    if c == '<': dentro_tag = True
    if dentro_tag:
        if c == '>': dentro_tag = False
        continue
    if c.isspace():
        if atual: palavras.append({'texto': atual, 'inicio': t0, 'fim': t1}); atual = ''
        continue
    if not atual: t0 = a
    atual += c; t1 = b
if atual: palavras.append({'texto': atual, 'inicio': t0, 'fim': t1})
# agrupa por linha
blocos, i = [], 0
for linha in texto_linhas:
    n = len(linha.split())
    ws = palavras[i:i + n]; i += n
    blocos.append({'texto': linha, 'inicio': ws[0]['inicio'], 'fim': ws[-1]['fim'], 'palavras': ws})
json.dump({'voz': voz, 'duracao': fim[-1], 'blocos': blocos}, open(saida + '.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
for b in blocos: print(f"{b['inicio']:6.2f} {b['fim']:6.2f}  {b['texto'][:60]}")
print('total', fim[-1], 'palavras', len(palavras))
