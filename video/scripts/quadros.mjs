// Renderiza quadros de conferência e monta uma folha de contato.
// uso: node scripts/quadros.mjs <composição> <seg1,seg2,...> [escala]
import { bundle } from '@remotion/bundler';
import { renderStill, selectComposition } from '@remotion/renderer';
import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
const [comp, lista, esc = '0.4'] = process.argv.slice(2);
const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const serveUrl = await bundle({ entryPoint: path.join(raiz, 'src/index.ts') });
const composition = await selectComposition({ serveUrl, id: comp, chromiumOptions: { gl: 'swangle' } });
fs.mkdirSync(path.join(raiz, 'out/quadros'), { recursive: true });
const arqs = [];
for (const s of lista.split(',').map(Number)) {
  const out = path.join(raiz, `out/quadros/${String(s).padStart(5, '0')}.png`);
  await renderStill({ serveUrl, composition, output: out, frame: Math.min(composition.durationInFrames - 1, Math.round(s * composition.fps)), scale: Number(esc), chromiumOptions: { gl: 'swangle' } });
  arqs.push(out);
  console.log('ok', s);
}
const n = arqs.length;
execSync(`ffmpeg -y -loglevel error ${arqs.map((a) => `-i ${a}`).join(' ')} -filter_complex "${arqs.map((_, i) => `[${i}]drawtext=text='${lista.split(',')[i]}s':x=10:y=10:fontsize=28:fontcolor=yellow[v${i}]`).join(';')};${arqs.map((_, i) => `[v${i}]`).join('')}xstack=inputs=${n}:layout=${arqs.map((_, i) => `${(i % 6) ? Array.from({ length: i % 6 }, () => 'w0').join('+') : '0'}_${Math.floor(i / 6) ? Array.from({ length: Math.floor(i / 6) }, () => 'h0').join('+') : '0'}`).join('|')}" ${path.join(raiz, 'out/folha.png')}`);
console.log('folha: out/folha.png');
