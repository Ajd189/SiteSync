// The delivery destination is provided as a private runtime value, never in assets.
const SITE_ASSETS = /*__SITE_ASSETS__*/ {};
const PACKAGES = new Set(['Not sure — help me choose', 'Website Build — $249', 'Connected Launch — $500', 'Business Setup — $899', 'Full SiteSync — $1,499', 'Ongoing support / custom project']);
const PLATFORMS = ['Google', 'Facebook', 'Instagram', 'Shopify', 'Square', 'WordPress', 'Wix / Squarespace', 'Other / none yet'];
const MAX_BYTES = 20000;
const PUBLIC_ORIGIN = 'https://sitesync.us.com';
const DELIVERY_ERROR = 'We couldn’t send your request right now. Please try again in a moment.';
const CSP = "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'self'; object-src 'none'";

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}

function inboxResponse(request, status, body) {
  return new Response(request.method === 'HEAD' ? null : body, {
    status,
    headers: securityHeaders({'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','Content-Security-Policy':CSP})
  });
}

async function renderInbox(request, env) {
  const owner = typeof env.OWNER_EMAIL === 'string' ? env.OWNER_EMAIL.trim().toLowerCase() : '';
  const viewer = (request.headers.get('oai-authenticated-user-email') || '').trim().toLowerCase();
  if (!viewer) {
    return inboxResponse(request, 401, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>SiteSync Lead Inbox</title><link rel="stylesheet" href="/styles.css"><body class="inbox-shell"><main class="inbox-gate"><p class="eyebrow">PRIVATE WORKSPACE</p><h1>SiteSync Lead Inbox</h1><p>Sign in with the ChatGPT account that owns SiteSync to review consultation requests.</p><a class="button button-primary" href="/signin-with-chatgpt?return_to=%2Finbox" target="_top">Sign in with ChatGPT <span aria-hidden="true">↗</span></a></main></body></html>`);
  }
  if (!owner || viewer !== owner) {
    return inboxResponse(request, 403, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Access denied | SiteSync</title><link rel="stylesheet" href="/styles.css"><body class="inbox-shell"><main class="inbox-gate"><p class="eyebrow">PRIVATE WORKSPACE</p><h1>Access denied</h1><p>This inbox is limited to the SiteSync owner.</p><a class="button button-quiet" href="/signout-with-chatgpt?return_to=%2Finbox" target="_top">Use another account</a></main></body></html>`);
  }
  if (!env.DB || typeof env.DB.prepare !== 'function') {
    return inboxResponse(request, 503, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Inbox unavailable | SiteSync</title><link rel="stylesheet" href="/styles.css"><body class="inbox-shell"><main class="inbox-gate"><h1>Inbox unavailable</h1><p>Please try again in a moment.</p></main></body></html>`);
  }
  let rows;
  try {
    const response = await env.DB.prepare(`SELECT id, created_at, name, business, email, phone, website, selected_package, budget, goals, platforms, extended_support, delivery_status
      FROM consultation_requests ORDER BY created_at DESC LIMIT 100`).all();
    rows = response.results || [];
  } catch (error) {
    console.error('consultation_inbox_unavailable: '+String(error?.message || 'unknown').slice(0,120));
    return inboxResponse(request, 503, `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Inbox unavailable | SiteSync</title><link rel="stylesheet" href="/styles.css"><body class="inbox-shell"><main class="inbox-gate"><h1>Inbox unavailable</h1><p>Please try again in a moment.</p></main></body></html>`);
  }
  const cards = rows.map(row => `<article class="lead-card">
    <header><div><p class="lead-time">${escapeHTML(new Date(row.created_at).toLocaleString('en-US',{dateStyle:'medium',timeStyle:'short',timeZone:'America/New_York'}))}</p><h2>${escapeHTML(row.name)}</h2><p class="lead-business">${escapeHTML(row.business)}</p></div><span class="lead-status ${row.delivery_status === 'emailed' ? 'emailed' : ''}">${row.delivery_status === 'emailed' ? 'Saved + emailed' : 'Saved in inbox'}</span></header>
    <dl class="lead-grid"><div><dt>Email</dt><dd><a href="mailto:${escapeHTML(row.email)}">${escapeHTML(row.email)}</a></dd></div><div><dt>Phone</dt><dd>${escapeHTML(row.phone)}</dd></div><div><dt>Package</dt><dd>${escapeHTML(row.selected_package)}</dd></div><div><dt>Budget</dt><dd>${escapeHTML(row.budget)}</dd></div><div><dt>Website</dt><dd>${escapeHTML(row.website)}</dd></div><div><dt>Platforms</dt><dd>${escapeHTML(row.platforms)}</dd></div><div><dt>Extended support</dt><dd>${escapeHTML(row.extended_support)}</dd></div></dl>
    <section class="lead-goals"><h3>Project goals</h3><p>${escapeHTML(row.goals)}</p></section>
  </article>`).join('');
  return inboxResponse(request, 200, `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex,nofollow"><meta name="theme-color" content="#060807"><title>SiteSync Lead Inbox</title><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&family=Space+Grotesk:wght@500;600;700&display=swap" rel="stylesheet"><link rel="stylesheet" href="/styles.css"></head><body class="inbox-shell"><header class="inbox-header"><a class="brand" href="/"><img class="brand-logo" src="/assets/sitesync-logo.png" alt="" width="1254" height="1254"><span>Site<span class="brand-accent">Sync</span></span></a><a class="inbox-signout" href="/signout-with-chatgpt?return_to=%2F" target="_top">Sign out</a></header><main class="inbox-main"><div class="inbox-title"><div><p class="eyebrow">OWNER WORKSPACE</p><h1>Lead Inbox</h1><p>${rows.length} consultation request${rows.length === 1 ? '' : 's'} saved</p></div><a class="button button-quiet" href="/inbox">Refresh</a></div>${cards || '<section class="inbox-empty"><h2>No requests yet</h2><p>New consultation requests will appear here automatically.</p></section>'}</main></body></html>`);
}

function securityHeaders(extra = {}) {
  return { 'X-Content-Type-Options': 'nosniff', 'X-SiteSync-Revision':'capability-showcase-2', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'Permissions-Policy': 'camera=(), microphone=(), geolocation=()', ...extra };
}
function result(request, status, body) {
  const headers = securityHeaders({ 'Cache-Control': 'no-store' });
  if (request.headers.get('Accept')?.includes('application/json')) {
    return Response.json(body, { status, headers });
  }
  if (body.ok) return new Response(null, { status:303, headers:{...headers, Location:'/thanks.html'} });
  return new Response(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Request needs attention | SiteSync</title><link rel="stylesheet" href="/styles.css"><body class="thanks-page"><main class="thanks-card"><h1>Please try again.</h1><p>${body.error || DELIVERY_ERROR}</p><p>Go back to your form to review your details and submit again.</p><a class="button button-primary" href="/#consultation">Return to the form</a></main></body></html>`, {status, headers:{...headers,'Content-Type':'text/html; charset=utf-8','Content-Security-Policy':CSP}});
}
function textField(data, name, limit) {
  const value = data[name];
  if (value === undefined || value === null) return '';
  if (typeof value !== 'string' || value.length > limit) throw new Error('invalid-field');
  return value.trim();
}
export function validateSubmission(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid-body');
  const name = textField(data,'name',100);
  const business = textField(data,'Business',150);
  const email = textField(data,'email',254);
  const goals = textField(data,'Goals',5000);
  const selectedPackage = textField(data,'Package',100) || 'Not sure — help me choose';
  const phone = textField(data,'Phone',40);
  const website = textField(data,'Website',300);
  if (name.length < 1 || business.length < 1 || goals.length < 10 || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email) || /[\r\n]/.test(name+business+email+phone+website) || !PACKAGES.has(selectedPackage)) throw new Error('invalid-fields');
  const platforms = PLATFORMS.filter(platform => data[`Platform: ${platform}`] === 'Yes');
  return {
    name, email, Business:business, Phone:phone || 'Not provided', Website:website || 'Not provided',
    Package:selectedPackage, Budget:textField(data,'Budget',100) || 'Let’s discuss', Goals:goals,
    Platforms:platforms.join(', ') || 'Not selected',
    'Extended support':data['Extended support'] === 'Please include ongoing support options' ? 'Requested' : 'Not requested',
    'Preferred reply':'Email'
  };
}

async function saveConsultation(env, details) {
  if (!env.DB || typeof env.DB.prepare !== 'function') throw new Error('consultation_storage_not_configured');
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await env.DB.prepare(`INSERT INTO consultation_requests
    (id, created_at, name, business, email, phone, website, selected_package, budget, goals, platforms, extended_support, delivery_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(id, createdAt, details.name, details.Business, details.email, details.Phone, details.Website, details.Package, details.Budget, details.Goals, details.Platforms, details['Extended support'], 'saved')
    .run();
  return id;
}

async function markDelivered(env, id) {
  await env.DB.prepare('UPDATE consultation_requests SET delivery_status = ? WHERE id = ?')
    .bind('emailed', id)
    .run();
}
async function readBody(request) {
  if (Number(request.headers.get('Content-Length') || 0) > MAX_BYTES) throw new Error('too-large');
  if (!request.body) throw new Error('empty-body');
  const reader = request.body.getReader();
  const chunks = []; let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) { await reader.cancel(); throw new Error('too-large'); }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk,offset); offset += chunk.byteLength; }
  const body = new TextDecoder().decode(bytes);
  const type = request.headers.get('Content-Type') || '';
  if (type.includes('application/json')) return JSON.parse(body);
  if (type.includes('application/x-www-form-urlencoded')) return Object.fromEntries(new URLSearchParams(body));
  throw new Error('unsupported-type');
}
export async function handleRequest(request, env, fetcher = (input, options) => fetch(input, options)) {
  const url = new URL(request.url);
  if (url.pathname === '/inbox' || url.pathname === '/inbox/') {
    if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:securityHeaders({Allow:'GET, HEAD'})});
    return renderInbox(request, env);
  }
  if (url.pathname === '/api/consultation') {
    if (request.method !== 'POST') return result(request,405,{ok:false,error:'Please submit the consultation form.'});
    const origin = request.headers.get('Origin');
    if (origin && origin !== url.origin) return result(request,403,{ok:false,error:'Please submit this form from the SiteSync website.'});
    if (request.headers.get('Sec-Fetch-Site') === 'cross-site') return result(request,403,{ok:false,error:'Please submit this form from the SiteSync website.'});
    let data, details;
    try {
      data = await readBody(request);
      if (typeof data?.company_fax === 'string' && data.company_fax.trim()) return result(request,422,{ok:false,error:'Please review your form and try again.'});
      details = validateSubmission(data);
    } catch {
      return result(request,422,{ok:false,error:'Please check your name, business, email, and project details, then try again.'});
    }
    let requestId;
    try {
      requestId = await saveConsultation(env, details);
    } catch (error) {
      console.error('consultation_storage_unavailable: '+String(error?.message || 'unknown').slice(0,120));
      return result(request,503,{ok:false,error:DELIVERY_ERROR});
    }
    const recipient = env.CONSULTATION_RECIPIENT;
    if (typeof recipient !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient)) {
      console.warn('consultation_saved_email_not_configured');
      return result(request,200,{ok:true,saved:true});
    }
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetcher(`https://formsubmit.co/ajax/${encodeURIComponent(recipient)}`, {
        method:'POST',
        headers:{'Content-Type':'application/json','Accept':'application/json','Referer':`${PUBLIC_ORIGIN}/`},
        body:JSON.stringify({...details,_subject:'New SiteSync consultation request',_template:'table',_captcha:'false',_url:PUBLIC_ORIGIN}),
        signal:controller.signal,
        redirect:'manual'
      });
      const relay = await response.json();
      if (!response.ok || ![true,'true'].includes(relay.success)) {
        console.warn('consultation_saved_email_deferred: '+response.status);
        return result(request,200,{ok:true,saved:true});
      }
      // Relay responses can contain the owner's address. Never forward them.
      const message = typeof relay.message === 'string' ? relay.message : '';
      if (/activat|confirm.{0,30}email|check.{0,30}(inbox|email)|verif.{0,30}email/i.test(message)) {
        console.warn('consultation_saved_email_awaiting_activation');
        return result(request,200,{ok:true,saved:true});
      }
      await markDelivered(env, requestId);
      return result(request,200,{ok:true});
    } catch (error) {
      const diagnostic = String(error?.message || 'Unknown delivery error').replaceAll(recipient,'[private destination]').replace(/https?:\/\/[^\s]+/g,'[service URL]').slice(0,300);
      console.error('consultation_delivery_unavailable: '+(error?.name || 'Error')+': '+diagnostic);
      return result(request,200,{ok:true,saved:true});
    } finally { clearTimeout(timeout); }
  }
  if (!['GET','HEAD'].includes(request.method)) return new Response('Method not allowed',{status:405,headers:securityHeaders({Allow:'GET, HEAD'})});
  const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
  const asset = SITE_ASSETS[pathname];
  if (!asset) return new Response('Page not found',{status:404,headers:securityHeaders({'Content-Type':'text/plain; charset=utf-8'})});
  const body = asset.encoding === 'base64' ? Uint8Array.from(atob(asset.body),char=>char.charCodeAt(0)) : asset.body;
  const revalidate = pathname.endsWith('.html') || pathname.endsWith('.css') || pathname.endsWith('.js');
  const headers = securityHeaders({'Content-Type':asset.type,'Cache-Control':revalidate ? 'no-cache' : 'public, max-age=3600','Content-Security-Policy':CSP});
  return new Response(request.method === 'HEAD' ? null : body,{headers});
}
export default { fetch(request, env) { return handleRequest(request, env); } };
