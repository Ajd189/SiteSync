import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { enhanceHomepage, addVisualLayer } from '../scripts/visual-layer.mjs';
const sample = '<!doctype html><html><head><title>SiteSync</title></head><body class="marketing"><form action="/api/consultation"><input name="email" /></form><a href="/inbox">Inbox</a><p>$1,499</p></body></html>';

test('adds local versioned assets after existing head contents', () => {
  const result = enhanceHomepage(sample);
  assert.match(result, /electric\.css\?v=1/);
  assert.match(result, /electric\.js\?v=1" defer/);
  assert.ok(result.indexOf('electric.css') > result.indexOf('<title>'));
  assert.match(result, /<body class="marketing" data-sitesync-electric="1">/);
});
test('does not duplicate enhancement when run twice', () => {
  assert.equal(enhanceHomepage(enhanceHomepage(sample)), enhanceHomepage(sample));
});
test('preserves existing form, inbox link, and pricing exactly', () => {
  const result = enhanceHomepage(sample);
  assert.ok(result.includes('<form action="/api/consultation"><input name="email" /></form>'));
  assert.ok(result.includes('<a href="/inbox">Inbox</a><p>$1,499</p>'));
});
test('all decorative background content is hidden from assistive technology', () => {
  assert.match(enhanceHomepage(sample), /class="ss-atmosphere" aria-hidden="true"/);
  assert.equal((enhanceHomepage(sample).match(/id="ss-circuit-field"/g) || []).length, 1);
});
test('rejects invalid HTML and non-string input', () => {
  assert.throws(() => enhanceHomepage(null), TypeError);
  assert.throws(() => enhanceHomepage('<body>oops</body>'), /head and body/);
  assert.throws(() => enhanceHomepage('<head></head>'), /head and body/);
});
test('writes only the requested homepage file', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'sitesync-electric-'));
  try {
    const home = join(directory, 'index.html');
    const inbox = join(directory, 'inbox.html');
    await writeFile(home, sample); await writeFile(inbox, sample);
    await addVisualLayer(home);
    assert.equal(await readFile(home, 'utf8'), enhanceHomepage(sample));
    assert.equal(await readFile(inbox, 'utf8'), sample);
  } finally { await rm(directory, { recursive: true, force: true }); }
});
test('visual JavaScript does not send requests or interact with consultation data', async () => {
  const js = await readFile(new URL('../public/electric.js', import.meta.url), 'utf8');
  assert.doesNotMatch(js, /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|supabase|\.submit\s*\(/);
  assert.match(js, /visibilitychange/);
  assert.match(js, /prefers-reduced-motion/);
  assert.match(js, /cancelAnimationFrame/);
});
test('styles preserve motion, forced-color, print, and mobile fallbacks', async () => {
  const css = await readFile(new URL('../public/electric.css', import.meta.url), 'utf8');
  for (const rule of ['prefers-reduced-motion', 'forced-colors', '@media print', 'max-width: 760px', 'animation-play-state: paused']) assert.ok(css.includes(rule), rule);
});
