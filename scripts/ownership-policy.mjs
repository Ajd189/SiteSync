import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const ownershipVersion = 'ownership-handoff-1';
export const ownershipSummary = 'The client is the legal owner of the website. SiteSync retains administrative possession and control of the website, including its files, hosting configuration, and administrator access, throughout the included support period and any additional monthly support purchased. The client receives possession of the website files and administrative access when the active support period ends. If no ongoing support is selected, handoff takes place at project completion.';
export const ownershipDetails = 'Administrative possession does not transfer legal ownership to SiteSync or delay the public launch of the website. Your domain, business accounts, and client-provided content remain yours. Third-party platforms, software, and licensed components remain subject to their own ownership and license terms. The signed service agreement defines the ownership rights, support term, and handoff process.';
const htmlMarker = `<!-- ${ownershipVersion} -->`;
const jsMarker = `/* ${ownershipVersion} */`;
const supportedHandoff = 'Client-owned; administrative handoff after active support';
const standardHandoff = 'Website files and administrative access at completion, unless support is added';

function replaceCount(source, before, after, expected = 1) {
  const count = source.split(before).length - 1;
  if (count !== expected) throw new Error(`Expected ${expected} ownership-copy target(s), found ${count}: ${before.slice(0, 90)}`);
  return source.split(before).join(after);
}
function validateHtml(html) {
  if ((html.match(/id="ownership-handoff"/g) || []).length !== 1 || !html.includes(ownershipSummary) || !html.includes(ownershipDetails)) throw new Error('Missing or duplicate ownership disclosure');
  if (html.includes('You receive a launch handoff.') || html.includes('Website files and launch handoff')) throw new Error('Conflicting launch-handoff promise');
  return html;
}

/** Runs after the support-policy normalization; the shipped page is static HTML. */
export function updateOwnershipHtml(source) {
  if (typeof source !== 'string') throw new TypeError('Expected HTML source');
  if (source.includes(htmlMarker)) return validateHtml(source);
  let html = source;
  html = replaceCount(html, 'Website files and launch handoff', standardHandoff, 2);
  html = replaceCount(html, 'A professionally built website delivered to you without ongoing service.', 'A professionally built website with optional ongoing support and a clearly defined handoff.');
  html = replaceCount(html, 'A focused, mobile-ready website with a clean launch handoff.', 'A focused, mobile-ready website with a clearly defined administrative handoff.');
  html = replaceCount(html, 'You receive a launch handoff.', 'Your website remains client-owned while SiteSync manages it during active support. Administrative handoff takes place when support ends, or at project completion if no ongoing support is selected.');
  html = replaceCount(html, 'You do. Whenever possible, business-critical accounts are created in your name and remain under your control.', 'Your domain and business accounts remain yours. Website ownership is separate from website administration: SiteSync retains administrative possession of the website during active support, as explained below.');
  html = replaceCount(html, '<b>Owner handoff guide</b><small>Clear notes on ownership, access, and next steps.</small>', '<b>Ownership &amp; handoff guide</b><small>Ownership and support responsibilities documented; administrative access transferred at the agreed handoff.</small>');

  const supportRow = '<tr><th scope="row">Additional support</th><td>$100/month</td><td>$100/month</td><td>$50/month</td><td>$25/month</td></tr>';
  const ownershipRows = '<tr><th scope="row">Legal website owner</th><td>Client</td><td>Client</td><td>Client</td><td>Client</td></tr><tr><th scope="row">Administrative handoff</th><td>At completion, unless support is added</td><td>At completion, unless support is added</td><td>After active support ends</td><td>After active support ends</td></tr>';
  html = replaceCount(html, supportRow, supportRow + ownershipRows);
  const pricingEnd = '      </section>\n\n      <section class="consultation-section" id="consultation">';
  const note = `        <div class="support-note reveal" id="ownership-handoff" role="note" aria-labelledby="ownership-heading">\n          <span>OWNERSHIP &amp; HANDOFF</span>\n          <div><b id="ownership-heading">Your website. Managed by SiteSync during support.</b><p>${ownershipSummary}</p><p>${ownershipDetails}</p></div>\n        </div>\n`;
  html = replaceCount(html, pricingEnd, note + pricingEnd);
  const faqAnchor = '<details><summary>Who owns the domain and accounts?';
  html = replaceCount(html, faqAnchor, `<details><summary>Who owns the website, and when do I take possession?<span>+</span></summary><p>${ownershipSummary}</p></details>\n          ${faqAnchor}`);
  const formAnchor = '<p class="form-privacy">';
  html = replaceCount(html, formAnchor, '<p class="form-footnote">Client ownership and SiteSync administration are separate. <a href="#ownership-handoff">Review website possession and handoff during support.</a> The terms are documented in the signed service agreement.</p>\n            ' + formAnchor);
  html = replaceCount(html, './script.js?v=support-20260919', './script.js?v=support-20260919&amp;ownership=1');
  html = replaceCount(html, '</head>', `${htmlMarker}\n  </head>`);
  return validateHtml(html);
}

export function updateOwnershipScript(source) {
  if (typeof source !== 'string') throw new TypeError('Expected script source');
  if (source.includes(jsMarker)) {
    if (source.includes('Website files and launch handoff') || !source.includes(supportedHandoff)) throw new Error('Incomplete ownership script');
    return source;
  }
  let js = source;
  js = replaceCount(js, 'A focused, mobile-ready website with a clean launch handoff.', 'A focused, mobile-ready website with a clearly defined administrative handoff.');
  js = replaceCount(js, 'Website files and launch handoff', standardHandoff);
  js = replaceCount(js, "'Hosting setup and launch support','Ongoing support not included; optional support: $100/month']", "'Hosting setup and launch support','Ongoing support not included; optional support: $100/month','Administrative handoff at completion, unless support is added']");
  js = replaceCount(js, "'Additional support after 6 months: $50/month']", `'Additional support after 6 months: $50/month','${supportedHandoff}']`);
  js = replaceCount(js, "'Additional support after 1 year: $25/month']", `'Additional support after 1 year: $25/month','${supportedHandoff}']`);
  return `${jsMarker}\n${js}`;
}

export async function syncOwnershipPolicy(directory = 'public') {
  const htmlPath = resolve(directory, 'index.html');
  const jsPath = resolve(directory, 'script.js');
  const [html, js] = await Promise.all([readFile(htmlPath, 'utf8'), readFile(jsPath, 'utf8')]);
  const nextHtml = updateOwnershipHtml(html);
  const nextJs = updateOwnershipScript(js);
  if (html !== nextHtml) await writeFile(htmlPath, nextHtml);
  if (js !== nextJs) await writeFile(jsPath, nextJs);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await syncOwnershipPolicy();
  console.log('Ownership synchronized: client legal ownership; SiteSync administration through active support; handoff at support end.');
}
