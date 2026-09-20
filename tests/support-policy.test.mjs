import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { supportPolicy, updateSupportHtml, updateSupportScript } from '../scripts/support-policy.mjs';

const inputHtml = await readFile(new URL('../public/index.html', import.meta.url), 'utf8');
const inputJs = await readFile(new URL('../public/script.js', import.meta.url), 'utf8');
const html = updateSupportHtml(inputHtml);
const js = updateSupportScript(inputJs);
const cards = [...html.matchAll(/<article class="price-card\b[^>]*>[\s\S]*?<\/article>/g)].map(match => match[0]);

test('support policy matches the four owner-approved packages', () => {
  assert.deepEqual(supportPolicy.map(p => [p.name, p.includedMonths, p.monthly]), [
    ['Website Build', 0, 100], ['Connected Launch', 0, 100], ['Business Setup', 6, 50], ['Full SiteSync', 12, 25]
  ]);
});
test('all pricing cards retain prices and publish exact support terms', () => {
  assert.equal(cards.length, 4);
  supportPolicy.forEach((plan, i) => {
    assert.ok(cards[i].includes(`<h3>${plan.name}</h3>`));
    assert.ok(cards[i].includes(`<sup>$</sup>${plan.price.slice(1)} <small>one-time</small>`));
    assert.ok(cards[i].includes(`$${plan.monthly}/month`));
  });
  assert.ok(cards[2].includes('6 MONTHS SUPPORT'));
  assert.ok(cards[2].includes('6 months included'));
  assert.ok(cards[3].includes('1 year included'));
  assert.doesNotMatch(cards[2], /one year|1 year|2 years/i);
  assert.doesNotMatch(cards[3], /2 years|two years|support years|from \$25/i);
});
test('comparison table shows included periods and monthly extensions for every tier', () => {
  assert.ok(html.includes('<tr><th scope="row">Included support</th><td>Not included</td><td>Not included</td><td>6 months</td><td>1 year</td></tr>'));
  assert.ok(html.includes('<tr><th scope="row">Additional support</th><td>$100/month</td><td>$100/month</td><td>$50/month</td><td>$25/month</td></tr>'));
});
test('support controls offer handoff, six months, and one year', () => {
  const inputs = [...html.matchAll(/name="builder-support" value="([^"]+)"/g)].map(m => m[1]);
  assert.deepEqual(inputs, ['handoff', 'six-months', 'year']);
  assert.doesNotMatch(html + js, /two-years|2 years of|included two years|extra years of|support years from/i);
});
test('builder recommendations work across all 48 combinations', () => {
  const start = js.indexOf('const packagePlans = [');
  const end = js.indexOf('const builder = ', start);
  assert.ok(start >= 0 && end > start);
  const context = vm.createContext({ document: {
    querySelector(selector) {
      if (selector.includes('builder-goal')) return { value: context.goal };
      if (selector.includes('builder-platforms')) return { value: String(context.platforms) };
      if (selector.includes('builder-support')) return { value: context.support };
      return null;
    },
    querySelectorAll() { return []; }
  }});
  vm.runInContext(js.slice(start, end), context);
  for (const [goal, minimum] of Object.entries({ website: 0, connect: 1, setup: 2, growth: 3 })) {
    for (const platforms of [0, 3, 5, 10]) {
      for (const support of ['handoff', 'six-months', 'year']) {
        Object.assign(context, { goal, platforms, support });
        vm.runInContext('updateBuilder()', context);
        const expected = Math.max(minimum, platforms === 10 ? 3 : platforms === 5 ? 2 : platforms === 3 ? 1 : 0, support === 'year' ? 3 : support === 'six-months' ? 2 : 0);
        assert.equal(vm.runInContext('recommendedPlan.name', context), supportPolicy[expected].name, `${goal}/${platforms}/${support}`);
        const includes = vm.runInContext('recommendedPlan.includes.join(" ")', context);
        assert.ok(includes.includes(`$${supportPolicy[expected].monthly}/month`));
        if (expected === 2) assert.ok(includes.includes('6 months'));
        if (expected === 3) assert.ok(includes.includes('1 year'));
      }
    }
  }
});
test('FAQ, extension note, and consultation option are consistent', () => {
  for (const phrase of ['Business Setup includes 6 months', 'Full SiteSync includes 1 year', '$50/month for Business Setup', '$25/month for Full SiteSync', 'either can add it for $100/month']) assert.equal(html.split(phrase).length - 1, 2, phrase);
  assert.ok(html.includes('additional monthly maintenance and support.'));
  assert.ok(html.includes('action="/api/consultation" method="POST"'));
  assert.ok(html.includes('data-demo-panel="website"'));
  assert.ok(html.includes('Domain registration, hosting subscriptions'));
  assert.ok(html.includes('./script.js?v=support-20260919'));
});
test('normalization is repeatable and rejects unknown templates', () => {
  assert.equal(updateSupportHtml(html), html);
  assert.equal(updateSupportScript(js), js);
  assert.throws(() => updateSupportHtml('<html></html>'), /four package cards/);
  assert.throws(() => updateSupportScript('const packages = [];'), /support-copy target/);
});
test('updated browser script parses and retains consultation and motion logic', () => {
  assert.doesNotThrow(() => new vm.Script(js));
  assert.ok(js.includes('const controller = new AbortController();'));
  assert.ok(js.includes("window.location.assign('/thanks.html')"));
  assert.ok(js.includes("window.matchMedia('(prefers-reduced-motion: reduce)')"));
});
