// Verify the built site: overflow, broken images, console errors, design tokens.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const port = parseInt(process.argv[2] || '4175', 10);
const root = path.resolve(process.cwd(), '.preview-site');
const mime = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.xml':'application/xml','.json':'application/json','.ico':'image/x-icon' };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let file = path.join(root, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (fs.existsSync(file + '/index.html')) file += '/index.html';
    else if (fs.existsSync(file + '.html')) file += '.html';
    else { res.writeHead(404); res.end('nf'); return; }
  }
  res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});

const pages = [
  { name:'home', url:'/', w:1440, h:900 },
  { name:'home-mobile', url:'/', w:390, h:844 },
  { name:'guide', url:'/guides/what-is-artificial-intelligence/', w:1440, h:900 },
  { name:'guide-mobile', url:'/guides/what-is-artificial-intelligence/', w:390, h:844 },
];

server.listen(port, async ()=>{
  const browser = await chromium.launch();
  let problems = 0;
  for (const p of pages){
    const ctx = await browser.newContext({ viewport:{width:p.w,height:p.h}, deviceScaleFactor:2 });
    const page = await ctx.newPage();
    const errors = [];
    page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
    page.on('pageerror', e => errors.push('PAGEERROR: '+e.message));
    await page.goto(`http://localhost:${port}${p.url}`, { waitUntil:'networkidle' });
    await page.waitForTimeout(300);

    const report = await page.evaluate(() => {
      const de = document.documentElement;
      const overflow = de.scrollWidth - de.clientWidth;
      const imgs = [...document.images];
      const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => i.src);
      const bodyFont = getComputedStyle(document.body).fontFamily;
      const h1 = document.querySelector('h1');
      const h1Font = h1 ? getComputedStyle(h1).fontFamily : 'n/a';
      const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim();
      return {
        overflow, imgCount: imgs.length, broken, bodyFont, h1Font, accent,
        scrollH: de.scrollHeight
      };
    });

    console.log(`\n[${p.name}] ${p.w}x${p.h}`);
    console.log(`  horizontal overflow: ${report.overflow}px ${report.overflow>0?'⚠️':'✓'}`);
    console.log(`  images: ${report.imgCount} total, ${report.broken.length} broken ${report.broken.length? '⚠️ '+report.broken.join(', '):'✓'}`);
    console.log(`  body font: ${report.bodyFont}`);
    console.log(`  h1 font: ${report.h1Font}`);
    console.log(`  --accent: ${report.accent}`);
    console.log(`  console errors: ${errors.length ? '⚠️ '+errors.join(' | ') : 'none ✓'}`);
    if (report.overflow>0 || report.broken.length || errors.length) problems++;

    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log(`\n${problems===0 ? 'ALL CLEAN ✓' : problems+' page(s) with issues ⚠️'}`);
});
