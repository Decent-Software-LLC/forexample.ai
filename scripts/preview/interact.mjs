// Test interactive features: search, difficulty filter, topic filter, theme toggle.
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const port = parseInt(process.argv[2] || '4176', 10);
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

function visibleCards(page){ return page.locator('.guide-card:visible').count(); }

server.listen(port, async ()=>{
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport:{width:1440,height:900} });
  const page = await ctx.newPage();
  await page.goto(`http://localhost:${port}/`, { waitUntil:'networkidle' });
  await page.waitForTimeout(300);

  const total = await visibleCards(page);
  console.log('Total visible cards:', total);

  // Search
  await page.fill('#search', 'transformer');
  await page.waitForTimeout(200);
  const searchCount = await visibleCards(page);
  console.log(`Search "transformer": ${searchCount} cards ${searchCount>0 && searchCount<total ? '✓' : '⚠️'}`);
  await page.fill('#search', '');
  await page.waitForTimeout(200);

  // Difficulty filter
  await page.click('.filter-btn[data-difficulty="advanced"]');
  await page.waitForTimeout(200);
  const advCount = await visibleCards(page);
  console.log(`Filter "advanced": ${advCount} cards ${advCount<total ? '✓' : '⚠️'}`);
  await page.click('.filter-btn[data-difficulty="all"]');
  await page.waitForTimeout(200);

  // Topic filter
  const firstTag = await page.locator('.topic-chip').first().getAttribute('data-tag');
  await page.locator(`.topic-chip[data-tag="${firstTag}"]`).click();
  await page.waitForTimeout(200);
  const tagCount = await visibleCards(page);
  console.log(`Topic "${firstTag}": ${tagCount} cards ${tagCount<total ? '✓' : '⚠️'}`);
  await page.click('#clear-filters');
  await page.waitForTimeout(200);
  const cleared = await visibleCards(page);
  console.log(`After clear: ${cleared} cards ${cleared===total ? '✓' : '⚠️'}`);

  // Theme toggle
  const before = await page.evaluate(()=>document.documentElement.getAttribute('data-theme'));
  await page.click('#theme-toggle');
  await page.waitForTimeout(200);
  const after = await page.evaluate(()=>document.documentElement.getAttribute('data-theme'));
  console.log(`Theme toggle: ${before} -> ${after} ${before!==after ? '✓' : '⚠️'}`);

  await ctx.close();
  await browser.close();
  server.close();
  console.log('done');
});
