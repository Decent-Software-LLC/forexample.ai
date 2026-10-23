// Screenshot the built site (served locally) at desktop + mobile sizes.
// Usage: node scripts/preview/shoot.mjs <port> <outdir>
import { chromium } from 'playwright';
import http from 'http';
import fs from 'fs';
import path from 'path';

const port = parseInt(process.argv[2] || '4173', 10);
const outdir = process.argv[3] || 'scripts/preview/shots';
const root = path.resolve(process.cwd(), '.preview-site');
fs.mkdirSync(outdir, { recursive: true });

const mime = { '.html':'text/html','.css':'text/css','.js':'text/javascript','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.svg':'image/svg+xml','.xml':'application/xml','.json':'application/json','.ico':'image/x-icon' };
const server = http.createServer((req,res)=>{
  let p = decodeURIComponent(req.url.split('?')[0]);
  if (p === '/') p = '/index.html';
  let file = path.join(root, p);
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
    if (fs.existsSync(file + '/index.html')) file += '/index.html';
    else if (fs.existsSync(file + '.html')) file += '.html';
    else { res.writeHead(404); res.end('not found'); return; }
  }
  res.writeHead(200, {'Content-Type': mime[path.extname(file)] || 'application/octet-stream'});
  fs.createReadStream(file).pipe(res);
});

const views = [
  { name:'home-desktop', url:'/', w:1440, h:900, full:false },
  { name:'home-mobile',  url:'/', w:390,  h:844, full:false },
  { name:'explore-desktop', url:'/explore/', w:1440, h:900, full:false },
  { name:'explore-mobile',  url:'/explore/', w:390,  h:844, full:false },
  { name:'guide-desktop',url:'/guides/what-is-artificial-intelligence/', w:1440, h:900, full:false },
  { name:'guide-mobile', url:'/guides/what-is-artificial-intelligence/', w:390,  h:844, full:false },
];

server.listen(port, async ()=>{
  const browser = await chromium.launch();
  for (const v of views){
    const ctx = await browser.newContext({ viewport:{width:v.w,height:v.h}, deviceScaleFactor:2 });
    const page = await ctx.newPage();
    await page.goto(`http://localhost:${port}${v.url}`, { waitUntil:'networkidle' });
    await page.waitForTimeout(400);
    await page.screenshot({ path:`${outdir}/${v.name}.png`, fullPage:v.full });
    console.log('captured', v.name);
    await ctx.close();
  }
  await browser.close();
  server.close();
  console.log('done');
});
