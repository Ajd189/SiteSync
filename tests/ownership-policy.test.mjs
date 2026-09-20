import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import vm from 'node:vm';
import { updateSupportHtml, updateSupportScript } from '../scripts/support-policy.mjs';
import { ownershipSummary, ownershipDetails, updateOwnershipHtml, updateOwnershipScript, syncOwnershipPolicy } from '../scripts/ownership-policy.mjs';
const inputHtml = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const inputJs = await readFile(new URL('../public/script.js', import.meta.url), 'utf8');
const html = updateOwnershipHtml(updateSupportHtml(inputHtml));
const js = updateOwnershipScript(updateSupportScript(inputJs));

test('ownership disclosure separates legal ownership from administrative possession', () => {
  assert.ok(html.includes(ownershipSummary));
  assert.ok(html.includes(ownershipDetails));
  assert.match(ownershipSummary, /client is the legal owner/);
  assert.match(ownershipSummary, /SiteSync retains administrative possession and control/);
  assert.match(ownershipSummary, /included support period and any additional monthly support purchased/);
  assert.match(ownershipSummary, /when the active support period ends/);
  assert.match(ownershipSummary, /If no ongoing support is selected, handoff takes place at project completion/);
  assert.equal((html.match(/id="ownership-handoff"/g) || []).length, 1);
});
test('disclosure preserves client assets, third-party licenses, and written agreement', () => {
  for (const phrase of ['does not transfer legal ownership to SiteSync', 'Your domain, business accounts, and client-provided content remain yours', 'Third-party platforms', 'signed service agreement']) assert.ok(html.includes(phrase), phrase);
  assert.ok(html.includes('href="#ownership-handoff"'));
});
test('comparison gives client ownership for all tiers and conditional handoff for lower tiers', () => {
  assert.ok(html.includes('<tr><th scope="row">Legal website owner</th><td>Client</td><td>Client</td><td>Client</td><td>Client</td></tr>'));
  assert.ok(html.includes('<tr><th scope="row">Administrative handoff</th><td>At completion, unless support is added</td><td>At completion, unless support is added</td><td>After active support ends</td><td>After active support ends</td></tr>'));
});
test('FAQ, pricing, and builder do not promise immediate possession during support', () => {
  assert.doesNotMatch(html + js, /You receive a launch handoff\.|Website files and launch handoff/);
  assert.ok(html.includes('Who owns the website, and when do I take possession?'));
  assert.ok(html.includes('Ownership &amp; handoff guide'));
  const start = js.indexOf('const packagePlans = [');
  const end = js.indexOf('let recommendedPlan = ', start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({});
  vm.runInContext(js.slice(start, end), context);
  const plans = JSON.parse(vm.runInContext('JSON.stringify(packagePlans)', context));
  assert.equal(plans.length, 4);
  plans.slice(0, 2).forEach(p => assert.match(p.includes.join(' '), /at completion, unless support is added/));
  plans.slice(2).forEach(p => assert.ok(p.includes.includes('Client-owned; administrative handoff after active support')));
});
test('support prices and included periods are unchanged', () => {
  assert.ok(html.includes('<tr><th scope="row">Included support</th><td>Not included</td><td>Not included</td><td>6 months</td><td>1 year</td></tr>'));
  assert.ok(html.includes('<tr><th scope="row">Additional support</th><td>$100/month</td><td>$100/month</td><td>$50/month</td><td>$25/month</td></tr>'));
  for (const price of ['249', '500', '899', '1,499']) assert.ok(html.includes(`<sup>$</sup>${price} <small>one-time</small>`));
});
test('normalization is idempotent and fails on missing targets', () => {
  assert.equal(updateOwnershipHtml(html), html);
  assert.equal(updateOwnershipScript(js), js);
  assert.throws(() => updateOwnershipHtml('<html></html>'), /ownership-copy target/);
  assert.throws(() => updateOwnershipScript('const x = 1;'), /ownership-copy target/);
  assert.throws(() => updateOwnershipHtml(null), TypeError);
});
test('browser script parses and existing form and demo hooks remain intact', () => {
  assert.doesNotThrow(() => new vm.Script(js));
  assert.ok(html.includes('./script.js?v=support-20260919&amp;ownership=1'));
  assert.ok(html.includes('action="/api/consultation" method="POST"'));
  assert.ok(html.includes('data-demo-panel="website"'));
  assert.ok(js.includes("window.location.assign('/thanks.html')"));
});
test('file synchronization changes only marketing files, not the private inbox', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'sitesync-ownership-'));
  try {
    await writeFile(join(dir, 'index.html'), html);
    await writeFile(join(dir, 'script.js'), js);
    await writeFile(join(dir, 'inbox.html'), 'private inbox unchanged');
    await syncOwnershipPolicy(dir);
    assert.equal(await readFile(join(dir, 'index.html'), 'utf8'), html);
    assert.equal(await readFile(join(dir, 'script.js'), 'utf8'), js);
    assert.equal(await readFile(join(dir, 'inbox.html'), 'utf8'), 'private inbox unchanged');
  } finally { await rm(dir, { recursive: true, force: true }); }
});
