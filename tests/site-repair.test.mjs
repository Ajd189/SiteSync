import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { repairHomepage } from '../scripts/site-repair.mjs';
import { isNetlifyDigestEnabled } from '../netlify/functions/_shared/notification-mode.mjs';
const sample = '<html><head></head><body><p>Your details are saved securely for SiteSync to review and respond to your inquiry.</p><form action="/api/consultation" method="POST"></form><p>$1,499</p></body></html>';
test('email inbox copy and versioned layout stylesheet are added once', () => {
 const result = repairHomepage(sample);
 assert.ok(result.includes('SiteSync’s email inbox'));
 assert.ok(result.includes('./site-repair.css?v=1'));
 assert.equal(repairHomepage(result), result);
});
test('homepage repair preserves form routing, pricing, and existing HTML', () => {
 const result = repairHomepage(sample);
 assert.ok(result.includes('<form action="/api/consultation" method="POST"></form><p>$1,499</p>'));
});
test('homepage repair fails on unexpected templates', () => {
 assert.throws(() => repairHomepage(null), TypeError);
 assert.throws(() => repairHomepage('<body></body>'), /head/);
 assert.throws(() => repairHomepage('<head></head>'), /privacy text/);
});
test('legacy digest cannot compete with Gmail delivery by default', () => {
 for (const mode of [undefined, null, '', 'gmail', 'unknown']) assert.equal(isNetlifyDigestEnabled(mode), false);
 assert.equal(isNetlifyDigestEnabled('netlify-digest'), true);
});
test('both former owner-inbox URLs redirect to Gmail without publishing a personal address', async () => {
 const config = await readFile(new URL('../netlify.toml', import.meta.url), 'utf8');
 for (const path of ['/inbox', '/inbox.html']) assert.ok(config.includes(`from = "${path}"\n  to = "https://mail.google.com/mail/#inbox"\n  status = 302`));
 assert.ok(config.includes('from = "/api/consultation"'));
 assert.doesNotMatch(config, /@gmail\.com|service_role/);
});
test('small-screen fixes reflow content rather than hiding overflow', async () => {
 const css = await readFile(new URL('../public/site-repair.css', import.meta.url), 'utf8');
 assert.ok(css.includes('max-width: 380px'));
 assert.ok(css.includes('grid-template-columns: minmax(0, 1fr)'));
 assert.doesNotMatch(css, /overflow(?:-x)?\s*:\s*(?:hidden|clip)/);
});
