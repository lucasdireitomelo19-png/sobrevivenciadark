// Gera os PNGs da marca: node marca/render.js
const { chromium } = require('playwright');
const path = require('path');
const dir = __dirname;
const saidas = [
  ['logo.html', 'logo.png', 1080, 1080],
  ['capa.html', 'capa-youtube.png', 2560, 1440],
  ['capa.html#guia', 'capa-youtube-guia.png', 2560, 1440],
];
(async () => {
  const b = await chromium.launch();
  for (const [html, png, w, h] of saidas) {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    await p.goto('file://' + path.join(dir, html));
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(dir, png) });
    await p.close();
    console.log('ok', png);
  }
  await b.close();
})();
