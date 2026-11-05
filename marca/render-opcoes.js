// node marca/render-opcoes.js -> opcoes/logo-1..4.png e opcoes/comparativo.png
const { chromium } = require('playwright');
const path = require('path'), fs = require('fs');
const dir = __dirname, out = path.join(dir, 'opcoes');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch();
  const p = await b.newPage({ viewport: { width: 1080, height: 1080 } });
  for (let i = 1; i <= 4; i++) {
    await p.goto('file://' + path.join(dir, 'logos-opcoes.html') + '?o=o' + i);
    await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(200);
    await p.screenshot({ path: path.join(out, `logo-${i}.png`) });
  }
  // comparativo: cada opção em círculo grande e no tamanho real de avatar
  const imgs = [1, 2, 3, 4].map(i => 'data:image/png;base64,' + fs.readFileSync(path.join(out, `logo-${i}.png`)).toString('base64'));
  const c = await b.newPage({ viewport: { width: 1800, height: 640 } });
  await c.setContent(`<body style="margin:0;background:#181818;font-family:sans-serif;color:#eee;display:flex;gap:40px;padding:40px">
    ${imgs.map((s, i) => `<div style="text-align:center"><img src="${s}" style="width:380px;border-radius:50%"><br>
      <img src="${s}" style="width:48px;border-radius:50%;margin-top:20px"> <img src="${s}" style="width:88px;border-radius:50%">
      <div style="font-size:34px;margin-top:8px">Opção ${i + 1}</div></div>`).join('')}</body>`);
  await c.screenshot({ path: path.join(out, 'comparativo.png') });
  await b.close(); console.log('ok');
})();
