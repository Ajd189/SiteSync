import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { createRequire } from 'node:module';

// Optional QA utility. Playwright is installed outside the application's lockfile.
const require = createRequire('/tmp/sitesync-browser-tools/package.json');
const { chromium } = require('playwright');
const root = resolve('dist');
const mime = { '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml' };
const server = createServer(async (req,res) => {
  try {
    if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + '/')) throw new Error('Invalid path');
    const bytes = await readFile(path);
    res.writeHead(200, {'Content-Type':mime[extname(path)] || 'application/octet-stream'}); res.end(bytes);
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
const report = { candidates: [], errors: [] };
try {
  browser = await chromium.launch({headless:true,args:['--no-sandbox']});
  const page = await browser.newPage({viewport:{width:320,height:900},reducedMotion:'reduce'});
  const origin = `http://127.0.0.1:${server.address().port}`;
  await page.route('**/*',route=> {
    const req=route.request(),url=new URL(req.url());
    if(req.method==='GET' && (url.origin===origin || ['fonts.googleapis.com','fonts.gstatic.com'].includes(url.hostname))) return route.continue();
    return route.fulfill({status:204,body:''});
  });
  page.on('pageerror',e=>report.errors.push(e.message));
  await page.goto(origin,{waitUntil:'networkidle'});
  const measure = () => page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));
  report.before = await measure();
  report.overflowElements = await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=> {
    const r=e.getBoundingClientRect(); return r.width>0 && (r.right>innerWidth+1 || r.left < -1);
  }).map(e=>({tag:e.tagName,id:e.id,className:typeof e.className==='string'?e.className:'SVG',text:(e.textContent||'').trim().slice(0,65),left:Math.round(e.getBoundingClientRect().left),right:Math.round(e.getBoundingClientRect().right),width:Math.round(e.getBoundingClientRect().width),parent:e.parentElement?.className})).slice(0,60));
  const candidates = {
    header: '.nav-shell{gap:.5rem}.site-header .brand{flex-shrink:1;min-width:0}.site-header .brand small{font-size:.65rem}',
    footer: '.footer-grid{grid-template-columns:minmax(0,1fr)}.footer-grid p{grid-row:auto;grid-column:auto}',
    checker: '.score-card{flex-direction:column}.score-copy{max-width:100%}',
    grid: '.section-heading,.checker-copy,.consultation-copy,.cta-content,.builder-result,.comparison-intro,.proof-grid>*{min-width:0;max-width:100%}'
  };
  for(const [name,css] of Object.entries(candidates)) {
    const style=await page.addStyleTag({content:`@media(max-width:360px){${css}}`});
    report.candidates.push({name,...await measure()}); await style.evaluate(e=>e.remove());
  }
  await mkdir('dist/verification',{recursive:true});
  await page.screenshot({path:'dist/verification/320-review.jpg',type:'jpeg',quality:60});
} catch(e) {report.executionError=String(e.message);}
finally {
  if(browser) await browser.close(); await new Promise(r=>server.close(r));
  await mkdir('dist/verification',{recursive:true});
  await writeFile('dist/verification/narrow-audit.json',JSON.stringify(report,null,2));
  console.log('NARROW_AUDIT',JSON.stringify(report));
}
