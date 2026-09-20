const {createServer}=require('node:http');
const {readFile,writeFile,mkdir}=require('node:fs/promises');
const {resolve,extname,sep}=require('node:path');
const {createRequire}=require('node:module');
(async()=>{
 const req=createRequire(resolve(process.env.AUDIT_MODULES,'package.json'));
 const puppeteer=req('puppeteer-core'),chromium=req('@sparticuz/chromium');
 const root=resolve('dist');
 const types={'.html':'text/html','.css':'text/css','.js':'application/javascript','.png':'image/png','.webp':'image/webp'};
 const server=createServer(async(q,r)=>{
  const p=resolve(root,'.'+(q.url.split('?')[0]==='/'?'/index.html':q.url.split('?')[0]));
  if(q.method!=='GET'||!p.startsWith(root+sep)){r.writeHead(403);r.end();return;}
  try{r.setHeader('Content-Type',types[extname(p)]||'application/octet-stream');r.end(await readFile(p));}catch{r.writeHead(404);r.end();}
 });
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await puppeteer.launch({args:chromium.args,executablePath:await chromium.executablePath(),headless:true});
 try{
  const page=await browser.newPage();await page.setViewport({width:320,height:900});
  await page.setRequestInterception(true);
  page.on('request',r=>r.url().startsWith(base)||/^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(r.url())?r.continue():r.abort());
  await page.goto(base,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
  const report=await page.evaluate(()=>{
   const width=()=>({document:document.documentElement.scrollWidth,body:document.body.scrollWidth});
   const describe=e=>({tag:e.tagName,cls:typeof e.className==='string'?e.className:'svg',id:e.id,text:e.textContent.trim().slice(0,100),width:e.getBoundingClientRect().width,right:e.getBoundingClientRect().right,scroll:e.scrollWidth,client:e.clientWidth,minWidth:getComputedStyle(e).minWidth,display:getComputedStyle(e).display});
   const visibleRight=(e,r)=>{for(let p=e.parentElement;p&&p!==document.body;p=p.parentElement){const s=getComputedStyle(p);if(['auto','scroll','hidden','clip'].includes(s.overflowX)||s.contain.includes('paint')||s.contain==='strict')r=Math.min(r,p.getBoundingClientRect().right);}return r;};
   const before=width();
   const elements=[...document.querySelectorAll('body *')].filter(e=>{const r=e.getBoundingClientRect();return r.width&&visibleRight(e,r.right)>innerWidth+1;}).map(describe);
   const text=[];const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let n;
   while(n=walker.nextNode()){if(!n.textContent.trim()||!n.parentElement)continue;const range=document.createRange();range.selectNodeContents(n);for(const r of range.getClientRects())if(r.width&&visibleRight(n.parentElement,r.right)>innerWidth+1){text.push({...describe(n.parentElement),node:n.textContent.trim().slice(0,100),textRight:r.right});break;}}
   const candidates={fieldset:'fieldset{min-inline-size:0!important;min-width:0!important}',platformChoices:'.platform-choices>div{grid-template-columns:minmax(0,1fr)!important}',formGrid:'.form-grid,.field{min-width:0!important}.field input,.field select,.field textarea{min-width:0!important;max-width:100%!important}',buttons:'.button{max-width:100%!important;white-space:normal!important}',revealBlur:'.motion-ready .reveal.pending{filter:none!important}',priceHeader:'.price-top{flex-wrap:wrap!important}',gridMinimum:'.section-shell>*{min-width:0!important}'};
   const trials={};for(const [name,css] of Object.entries(candidates)){const s=document.createElement('style');s.textContent=css;document.head.append(s);trials[name]=width();s.remove();}
   document.querySelectorAll('.pending').forEach(e=>e.classList.remove('pending'));
   return {viewport:innerWidth,before,elements,text,trials,afterReveals:width()};
  });
  await mkdir(resolve(root,'verification'),{recursive:true});
  await writeFile(resolve(root,'verification/viewport-diagnostic.json'),JSON.stringify(report,null,2));
  console.log('VIEWPORT_DIAGNOSTIC',JSON.stringify(report));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e.message);process.exit(1);});
