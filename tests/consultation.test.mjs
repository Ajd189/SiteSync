import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { handleRequest } from '../worker/index.js';
const origin='https://sitesync.us.com';
function createDB() {
  const calls=[];
  return {
    calls,
    prepare(sql) {
      return {
        bind(...values) { return { run: async() => { calls.push({sql,values}); return {success:true}; } }; },
        all: async() => ({results:[valid]})
      };
    }
  };
}
const env={CONSULTATION_RECIPIENT:'owner@example.invalid',OWNER_EMAIL:'owner@example.invalid',DB:createDB()};
const valid={name:'SiteSync QA',Business:'Test request',email:'visitor@example.invalid',Goals:'Testing the consultation form safely.',Package:'Full SiteSync — $1,499','Platform: Square':'Yes',company_fax:''};
function req(data=valid,extra={}){return new Request(origin+'/api/consultation',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json',Origin:origin,...extra},body:JSON.stringify(data)});}
test('valid submission stays private and preserves selected package, platforms, and reply address',async()=>{
  let calls=0;
  const response=await handleRequest(req(),env,async(url,options)=>{
    calls++;
    assert.equal(url,'https://formsubmit.co/ajax/owner%40example.invalid');
    const payload=JSON.parse(options.body);
    assert.equal(payload.email,valid.email);
    assert.equal(payload.Package,'Full SiteSync — $1,499');
    assert.equal(payload.Platforms,'Square');
    assert.equal(payload._subject,'New SiteSync consultation request');
    assert.equal(payload['Preferred reply'],'Email');
    assert.equal(payload.company_fax,undefined);
    return Response.json({success:'true',message:'Form submitted successfully'});
  });
  assert.equal(calls,1);assert.equal(response.status,200);assert.deepEqual(await response.json(),{ok:true});
  assert.equal(env.DB.calls.filter(call=>call.sql.startsWith('INSERT')).length,1);
  assert.equal(env.DB.calls.filter(call=>call.sql.startsWith('UPDATE')).length,1);
});
test('required fields, arbitrary package values, header injection, spam, and oversize requests never reach delivery',async()=>{
  let calls=0;
  const relay=async()=>{calls++;return Response.json({success:true});};
  const bad=[{...valid,email:'invalid'},{...valid,Goals:'short'},{...valid,Business:''},{...valid,Package:'free'},{...valid,name:'A\r\nB'},{...valid,company_fax:'spam'},{...valid,Goals:'x'.repeat(21000)}];
  for(const payload of bad){const response=await handleRequest(req(payload),env,relay);assert.equal(response.status,422);}
  assert.equal(calls,0);
});
test('cross-origin submission is refused',async()=>{
  let called=false;const response=await handleRequest(req(valid,{Origin:'https://elsewhere.example'}),env,async()=>{called=true;});
  assert.equal(response.status,403);assert.equal(called,false);
});
test('email provider failures and activation preserve the request and return success without revealing the destination',async()=>{
  for(const payload of [{success:false,message:env.CONSULTATION_RECIPIENT},{success:true,message:'Check your email to activate this form at '+env.CONSULTATION_RECIPIENT}]){
    const response=await handleRequest(req(),env,async()=>Response.json(payload));
    assert.equal(response.status,200);assert.ok(!(await response.text()).includes(env.CONSULTATION_RECIPIENT));
  }
  const response=await handleRequest(req(),env,async()=>{throw new Error('provider timeout with '+env.CONSULTATION_RECIPIENT);});
  assert.equal(response.status,200);assert.ok(!(await response.text()).includes(env.CONSULTATION_RECIPIENT));
});
test('missing durable storage is reported as a failure',async()=>{const r=await handleRequest(req(),{});assert.equal(r.status,503);assert.equal((await r.json()).ok,false);});
test('native no-JavaScript form uses same validation and only redirects after acceptance',async()=>{
  const request=new Request(origin+'/api/consultation',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded',Origin:origin},body:new URLSearchParams(valid)});
  const r=await handleRequest(request,env,async()=>Response.json({success:true}));
  assert.equal(r.status,303);assert.equal(r.headers.get('Location'),'/thanks.html');
});
test('lead inbox requires ChatGPT sign-in and the configured owner account',async()=>{
  const anonymous=await handleRequest(new Request(origin+'/inbox'),env);assert.equal(anonymous.status,401);assert.match(await anonymous.text(),/signin-with-chatgpt/);
  const stranger=await handleRequest(new Request(origin+'/inbox',{headers:{'oai-authenticated-user-email':'stranger@example.invalid'}}),env);assert.equal(stranger.status,403);
  const owner=await handleRequest(new Request(origin+'/inbox',{headers:{'oai-authenticated-user-email':'owner@example.invalid'}}),env);assert.equal(owner.status,200);assert.match(await owner.text(),/Lead Inbox/);
});
test('owner address and mailto links are absent from every delivered public text file',async()=>{
  for(const name of await readdir('public')){
    if(!/\.(html|css|js)$/.test(name)) continue;
    const content=await readFile('public/'+name,'utf8');
    assert.ok(!/icloud\.com|mailto:|formsubmit\.co\/ajax\//i.test(content),name);
  }
});
test('built Worker serves all public assets with MIME types and protects internal source',async()=>{
  const worker=(await import('../dist/server/index.js')).default;
  for(const route of ['/','/styles.css','/showcase.css','/script.js','/thanks.html','/assets/sitesync-logo.png','/assets/harbor-pine-dish.png','/assets/concept-contractor.webp','/assets/concept-salon.webp']){
    const r=await worker.fetch(new Request(origin+route),env,{});assert.equal(r.status,200);assert.ok(r.headers.get('Content-Type'));assert.ok((await r.arrayBuffer()).byteLength>0);
  }
  for(const route of ['/','/styles.css','/showcase.css','/script.js']){
    const r=await worker.fetch(new Request(origin+route),env,{});assert.equal(r.headers.get('Cache-Control'),'no-cache');
  }
  for(const route of ['/worker/index.js','/.env','/.openai/hosting.json']){const r=await worker.fetch(new Request(origin+route),env,{});assert.equal(r.status,404);}
  const invalid=await worker.fetch(req({...valid,email:''}),env,{});assert.equal(invalid.status,422);
});
