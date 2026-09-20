const { createServer } = require('node:http');
const { readFile, writeFile, mkdir } = require('node:fs/promises');
const { resolve, extname, sep } = require('node:path');
const { createRequire } = require('node:module');
const assert = require('node:assert/strict');
const delay = ms => new Promise(r => setTimeout(r, ms));
(async () => {
 const requireAudit = createRequire(resolve(process.env.AUDIT_MODULES, 'package.json'));
 const puppeteer = requireAudit('puppeteer-core');
 const chromium = requireAudit('@sparticuz/chromium');
 const root = resolve('dist');
 const types = {'.html':'text/html','.js':'application/javascript','.css':'text/css','.png':'image/png','.webp':'image/webp','.json':'application/json','.jpg':'image/jpeg'};
 const server = createServer(async (req, res) => {
  if (req.method !== 'GET') { res.writeHead(405); res.end(); return; }
  const pathname = new URL(req.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + (pathname === '/' ? '/index.html' : pathname));
  if (!file.startsWith(root + sep)) { res.writeHead(403); res.end(); return; }
  try { const data = await readFile(file); res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream'); res.end(data); }
  catch { res.writeHead(404); res.end(); }
 });
 await new Promise(r => server.listen(0, '127.0.0.1', r));
 const base = `http://127.0.0.1:${server.address().port}`;
 const browser = await puppeteer.launch({ args: chromium.args, executablePath: await chromium.executablePath(), headless: true });
 const page = await browser.newPage();
 const errors = [], badAssets = [], tests = [];
 let formMode = 'failure', submission = null;
 page.on('pageerror', e => errors.push(e.message));
 page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400 && !r.url().includes('/api/')) badAssets.push([r.url(),r.status()]); });
 await page.setRequestInterception(true);
 page.on('request', req => {
  if (req.url().includes('/api/consultation')) {
   submission = req.postData();
   req.respond({status: formMode === 'success' ? 200 : 503, contentType:'application/json',body:JSON.stringify({ok:formMode === 'success'})});
  } else if (req.url().startsWith(base) || /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(req.url()) || req.url().startsWith('data:')) req.continue();
  else req.abort();
 });
 const check = async (name, fn) => { try { const details=await fn(); tests.push({name,passed:true,...(details?{details}:{})}); } catch(e) { tests.push({name,passed:false,error:e.message}); console.error('AUDIT_FAILURE',name,e.message); } };
 const click = sel => page.$eval(sel, el => el.click());
 const load = async width => { await page.setViewport({width,height:900}); await page.goto(base,{waitUntil:'networkidle0'}); await page.evaluate(()=>document.fonts.ready); await delay(200); };
 try {
  await load(1440);
  await check('Homepage, email-inbox copy, and electric layer',async()=>assert.equal(await page.evaluate(()=>!!document.querySelector('[data-sitesync-electric]') && !!document.querySelector('#ss-circuit-field') && !!document.querySelector('link[href*="site-repair.css"]') && document.body.textContent.includes('SiteSync’s email inbox') && !document.querySelector('#ownership-handoff')),true));
  await check('Current package prices and support remain intact',async()=>{ const rows=await page.$$eval('.comparison-table tbody tr',els=>els.map(e=>e.textContent)); assert.ok(rows.some(s=>s.includes('6 months')&&s.includes('1 year')));assert.ok(rows.some(s=>s.includes('$100/month')&&s.includes('$50/month')&&s.includes('$25/month')));assert.ok(rows.some(s=>s.includes('$249')&&s.includes('$500')&&s.includes('$899')&&s.includes('$1,499'))); });
  await check('Internal links have targets',async()=>assert.deepEqual(await page.$$eval('a[href^="#"]',els=>els.map(e=>e.getAttribute('href')).filter(h=>h.length>1&&!document.getElementById(h.slice(1)))),[]));
  await check('Images load',async()=>assert.deepEqual(await page.$$eval('img',els=>els.filter(e=>!e.complete||!e.naturalWidth).map(e=>e.src)),[]));
  await check('Motion pause and persistence',async()=>{await click('.ss-motion-toggle');assert.equal(await page.$eval('html',e=>e.dataset.ssMotion),'off');await page.reload({waitUntil:'networkidle0'});assert.equal(await page.$eval('html',e=>e.dataset.ssMotion),'off');await click('.ss-motion-toggle');assert.equal(await page.$eval('html',e=>e.dataset.ssMotion),'on');});
  await check('All four demo tabs',async()=>{for(const name of ['website','connections','journey','analytics']){await click(`[data-demo-tab="${name}"]`);assert.equal(await page.$eval(`[data-demo-panel="${name}"]`,e=>e.hidden),false);}});
  await check('Website themes and device previews',async()=>{await click('[data-demo-tab="website"]');for(const theme of ['ember','midnight']){await click(`[data-sample-theme="${theme}"]`);assert.equal(await page.$eval('.sample-site',e=>e.dataset.theme),theme);}for(const device of ['mobile','desktop']){await click(`[data-device="${device}"]`);assert.equal(await page.$eval('.website-preview-shell',e=>e.dataset.deviceMode),device);}});
  await check('Connection toggles and reset',async()=>{await click('[data-demo-tab="connections"]');await click('[data-connection]');assert.notEqual(await page.$eval('#connection-score',e=>e.textContent),'100%');await click('#reset-connections');assert.equal(await page.$eval('#connection-score',e=>e.textContent),'100%');});
  await check('Journey controls',async()=>{await click('[data-demo-tab="journey"]');await click('#journey-toggle');assert.equal(await page.$eval('#journey-toggle',e=>e.getAttribute('aria-pressed')),'true');await page.$$eval('[data-journey-step]',els=>els[2].click());assert.equal(await page.$eval('[data-journey-step].active',e=>e.dataset.journeyStep),'2');});
  await check('Analytics sample ranges',async()=>{await click('[data-demo-tab="analytics"]');await click('[data-range="7"]');assert.equal(await page.$eval('[data-metric="visits"]',e=>e.textContent),'721');await click('[data-range="90"]');assert.equal(await page.$eval('[data-metric="visits"]',e=>e.textContent),'8,914');});
  await check('All 48 package-builder combinations',async()=>{const failures=await page.evaluate(()=>{const names=['Website Build','Connected Launch','Business Setup','Full SiteSync'];const errors=[];for(const [goal,min] of Object.entries({website:0,connect:1,setup:2,growth:3}))for(const platforms of [0,3,5,10])for(const support of ['handoff','six-months','year']){for(const [field,val] of [['goal',goal],['platforms',platforms],['support',support]])document.querySelector(`[name="builder-${field}"][value="${val}"]`).checked=true;document.querySelector('#setup-builder').dispatchEvent(new Event('change',{bubbles:true}));const level=Math.max(min,platforms===10?3:platforms===5?2:platforms===3?1:0,support==='year'?3:support==='six-months'?2:0);if(document.querySelector('#builder-package').textContent!==names[level])errors.push([goal,platforms,support]);}return errors;});assert.deepEqual(failures,[]);});
  await check('Package buttons fill consultation choice',async()=>{const pairs=await page.$$eval('[data-package]',els=>els.map(e=>[e.dataset.package]));for(const [value] of pairs){await page.$$eval('[data-package]',(els,v)=>els.find(e=>e.dataset.package===v).click(),value);assert.equal(await page.$eval('#package-choice',e=>e.value),value);}});
  await check('Concept gallery handoff',async()=>{await click('[data-concept="salon"]');await click('#concept-consult');assert.match(await page.$eval('#project-goals',e=>e.value),/Halo & Hue/);});
  await check('Transformation slider',async()=>{await page.$eval('#transformation-slider',e=>{e.value=70;e.dispatchEvent(new Event('input',{bubbles:true}));});assert.equal(await page.$eval('#transformation-value',e=>e.textContent),'70%');});
  await check('Self-check and FAQ',async()=>{await click('[data-check="website"]');await click('#use-check-results');assert.match(await page.$eval('#project-goals',e=>e.value),/self-check/);await click('.faq-grid summary');assert.equal(await page.$eval('.faq-grid details',e=>e.open),true);});
  await check('Required form fields prevent empty send',async()=>{await page.$eval('#consultation-form',f=>f.reset());submission=null;await click('.form-submit');assert.equal(submission,null);});
  await check('Failed form submission preserves data',async()=>{await page.$eval('#contact-name',e=>e.value='Internal Browser Test');await page.$eval('#business-name',e=>e.value='SiteSync QA');await page.$eval('#contact-email',e=>e.value='test@example.invalid');await page.$eval('#project-goals',e=>e.value='Internal browser-only verification, not a customer inquiry.');formMode='failure';await click('.form-submit');await page.waitForFunction(()=>!document.querySelector('#form-status').hidden);assert.equal(await page.$eval('#business-name',e=>e.value),'SiteSync QA');assert.equal(await page.$eval('.form-submit',e=>e.disabled),false);});
  await check('Mock successful form submission opens thanks page',async()=>{formMode='success';await Promise.all([page.waitForNavigation({waitUntil:'networkidle0'}),click('.form-submit')]);assert.ok(page.url().endsWith('/thanks.html'));assert.equal(JSON.parse(submission).Business,'SiteSync QA');});
  for(const width of [320,360,375,390,768,1024,1440]) await check(`No document overflow at ${width}px`,async()=>{await load(width);const d=await page.evaluate(()=>({viewport:innerWidth,document:document.documentElement.scrollWidth,body:document.body.scrollWidth,offenders:[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1&&r.width&&getComputedStyle(e).position!=='fixed';}).slice(0,12).map(e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',right:e.getBoundingClientRect().right}))}));assert.ok(d.document<=width+1&&d.body<=width+1,JSON.stringify(d));return {viewport:width,document:d.document,body:d.body};});
  await check('Mobile menu opens and closes',async()=>{await load(375);await page.click('.menu-button');assert.equal(await page.$eval('.menu-button',e=>e.getAttribute('aria-expanded')),'true');await page.click('.site-nav a[href="#pricing"]');assert.equal(await page.$eval('.menu-button',e=>e.getAttribute('aria-expanded')),'false');});
  await check('Reduced motion',async()=>{await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);await load(320);assert.equal(await page.$eval('html',e=>e.dataset.ssMotion),'off');assert.equal(await page.$eval('.ss-motion-toggle',e=>e.disabled),true);});
  await check('No runtime errors or broken local assets',async()=>{assert.deepEqual(errors,[]);assert.deepEqual([...new Set(badAssets.map(e=>JSON.stringify(e)))],[]);});
  await mkdir(resolve(root,'verification'),{recursive:true});
  await load(375);await page.screenshot({path:resolve(root,'verification/inbox-mobile.jpg'),type:'jpeg',quality:72});
  await load(1440);await page.screenshot({path:resolve(root,'verification/inbox-desktop.jpg'),type:'jpeg',quality:72});
  await check('Page works without JavaScript',async()=>{await page.setJavaScriptEnabled(false);await page.goto(base,{waitUntil:'networkidle0'});assert.match(await page.$eval('h1',e=>e.textContent),/Your business/);assert.equal(await page.$eval('#consultation-form',e=>e.getAttribute('action')),'/api/consultation');});
 } finally {
  const report={engine:'Chromium',target:'complete built homepage served locally',tests,passed:tests.filter(t=>t.passed).length,failed:tests.filter(t=>!t.passed).length,pageErrors:errors,badAssets,realSubmissions:0,completedAt:new Date().toISOString()};
  await mkdir(resolve(root,'verification'),{recursive:true});
  await writeFile(resolve(root,'verification/email-repair-audit.json'),JSON.stringify(report,null,2));
  console.log('BROWSER_AUDIT',JSON.stringify(report));
  await browser.close();server.close();
  if(report.failed)process.exitCode=1;
 }
})().catch(e=>{console.error(e);process.exit(1);});
