# Efeitos sonoros realistas com a API de Sound Effects da ElevenLabs.
# uso: python3 scripts/sfx.py <nome> <segundos> "<descrição em inglês>" [loop]
import json, os, sys, urllib.request
nome, dur, prompt = sys.argv[1], float(sys.argv[2]), sys.argv[3]
loop = len(sys.argv) > 4 and sys.argv[4] == 'loop'
key = os.environ.get('ELEVENLABS_API_KEY') or open('/root/.elevenlabs_key').read().strip()
corpo = {'text': prompt, 'duration_seconds': dur, 'prompt_influence': 0.5}
if loop: corpo['loop'] = True
req = urllib.request.Request('https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128', data=json.dumps(corpo).encode(),
                             headers={'xi-api-key': key, 'Content-Type': 'application/json'})
saida = os.path.join(os.path.dirname(__file__), '..', 'public', 'sons', nome + '.mp3')
open(saida, 'wb').write(urllib.request.urlopen(req, timeout=300).read())
print('ok', nome)
