import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Current owner-approved support terms. Purchase prices and other scope are unchanged. */
export const supportPolicy = Object.freeze([
  { name: 'Website Build', price: '$249', includedMonths: 0, monthly: 100 },
  { name: 'Connected Launch', price: '$500', includedMonths: 0, monthly: 100 },
  { name: 'Business Setup', price: '$899', includedMonths: 6, monthly: 50 },
  { name: 'Full SiteSync', price: '$1,499', includedMonths: 12, monthly: 25 }
]);
const version = 'support-2026-09-19';
const htmlMarker = `<!-- ${version} -->`;
const jsMarker = `/* ${version} */`;
const term = months => months === 12 ? '1 year' : months ? `${months} months` : 'Not included';
const money = amount => `$${amount}/month`;
const supportSummary = 'Business Setup includes 6 months of maintenance and support; Full SiteSync includes 1 year. After the included period, additional support is $50/month for Business Setup or $25/month for Full SiteSync. Website Build and Connected Launch do not include ongoing support; either can add it for $100/month. Additional monthly support is optional.';

function once(source, before, after) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`Expected one support-copy target, found ${count}: ${before.slice(0, 90)}`);
  return source.replace(before, () => after);
}

/** Normalize legacy marketing templates before every supported build/dev entry point. */
export function updateSupportHtml(source) {
  if (source.includes(htmlMarker)) return source;
  let html = source;
  let cards = 0;
  html = html.replace(/<article class="price-card\b[^>]*>[\s\S]*?<\/article>/g, card => {
    const plan = supportPolicy.find(item => card.includes(`<h3>${item.name}</h3>`));
    if (!plan) throw new Error('Unknown package card');
    cards++;
    let next = card;
    if (plan.name === 'Connected Launch') {
      next = once(next, '<div><span>Optional support</span><b>Available</b></div>', `<div><span>Optional support</span><b>${money(plan.monthly)}</b></div>`);
    } else if (plan.name === 'Business Setup') {
      next = once(next, '1 YEAR SUPPORT', '6 MONTHS SUPPORT');
      next = once(next, 'account creation, email, and one year of support.', 'account creation, email, and six months of support.');
      next = once(next, '1 year included', `${term(plan.includedMonths)} included`);
      next = once(next, '1 year of website maintenance and support', `${term(plan.includedMonths)} of website maintenance and support`);
      next = once(next, '<div><span>Maintenance &amp; support</span><b>6 months included</b></div>', `<div><span>Maintenance &amp; support</span><b>6 months included</b></div>\n              <div><span>Additional support</span><b>${money(plan.monthly)}</b></div>`);
    } else if (plan.name === 'Full SiteSync') {
      next = once(next, '2 years included', `${term(plan.includedMonths)} included`);
      next = once(next, '2 years of website maintenance and support', `${term(plan.includedMonths)} of website maintenance and support`);
      next = once(next, 'Extra support years from $25/month', `Additional support: ${money(plan.monthly)}`);
      next = once(next, '<div><span>Maintenance &amp; support</span><b>1 year included</b></div>', `<div><span>Maintenance &amp; support</span><b>1 year included</b></div>\n              <div><span>Additional support</span><b>${money(plan.monthly)}</b></div>`);
      next = once(next, 'with consulting and extended support.', 'with consulting and one year of support.');
    }
    return next;
  });
  if (cards !== 4) throw new Error(`Expected four package cards, found ${cards}`);
  const originalRow = '<tr><th scope="row">Support</th><td>Optional</td><td>Optional</td><td>1 year</td><td>2 years</td></tr>';
  const includedRow = `<tr><th scope="row">Included support</th>${supportPolicy.map(p => `<td>${term(p.includedMonths)}</td>`).join('')}</tr>`;
  const monthlyRow = `<tr><th scope="row">Additional support</th>${supportPolicy.map(p => `<td>${money(p.monthly)}</td>`).join('')}</tr>`;
  html = once(html, originalRow, includedRow + monthlyRow);
  html = once(html, '<label><input type="radio" name="builder-support" value="year" /><b>1 year</b></label><label><input type="radio" name="builder-support" value="two-years" /><b>2 years</b></label>', '<label><input type="radio" name="builder-support" value="six-months" /><b>6 months</b></label><label><input type="radio" name="builder-support" value="year" /><b>1 year</b></label>');
  html = once(html, 'How much ongoing support?', 'How much included support?');
  html = once(html, 'Add more years of support when you need them. Website Build support is $100/month. Full SiteSync extensions start at $25/month after the included two years. Extensions for the other packages are quoted during your consultation.', supportSummary);
  html = once(html, 'I’m interested in extra years of maintenance and support.', 'I’m interested in additional monthly maintenance and support.');
  html = once(html, 'Your package determines the support period. You receive a handoff, and ongoing maintenance options are available when you need continued help.', `You receive a launch handoff. ${supportSummary}`);
  html = once(html, '<ul id="builder-includes"><li>Custom small-business website</li><li>Mobile-responsive design</li><li>Core page and content structure</li><li>Website files and launch handoff</li></ul>', '<ul id="builder-includes"><li>Custom small-business website</li><li>Mobile-responsive design</li><li>Core page and content structure</li><li>Website files and launch handoff</li><li>Ongoing support not included; optional support: $100/month</li></ul>');
  html = once(html, './script.js?v=15', './script.js?v=support-20260919');
  html = once(html, '</head>', `${htmlMarker}\n  </head>`);
  return html;
}

export function updateSupportScript(source) {
  if (source.includes(jsMarker)) return source;
  let js = source;
  js = once(js, "'Website files and launch handoff']", "'Website files and launch handoff','Ongoing support not included; optional support: $100/month']");
  js = once(js, "'Hosting setup and launch support']", "'Hosting setup and launch support','Ongoing support not included; optional support: $100/month']");
  js = once(js, 'conversion tracking, and a year of support.', 'conversion tracking, and six months of support.');
  js = once(js, "'1 year of maintenance and support']", "'6 months of maintenance and support','Additional support after 6 months: $50/month']");
  js = once(js, "'Analytics monitoring and 2 years of support']", "'Analytics monitoring and 1 year of support','Additional support after 1 year: $25/month']");
  js = once(js, "if (platforms >= 10 || support === 'two-years') level = 3;\n  else if (platforms >= 5 || support === 'year') level = Math.max(level, 2);", "if (platforms >= 10 || support === 'year') level = 3;\n  else if (platforms >= 5 || support === 'six-months') level = Math.max(level, 2);");
  return `${jsMarker}\n${js}`;
}

export async function syncSupportPolicy(directory = 'public') {
  const htmlPath = resolve(directory, 'index.html');
  const jsPath = resolve(directory, 'script.js');
  const [html, js] = await Promise.all([readFile(htmlPath, 'utf8'), readFile(jsPath, 'utf8')]);
  // Compute both first; a template mismatch must fail the build before either file is written.
  const nextHtml = updateSupportHtml(html);
  const nextJs = updateSupportScript(js);
  if (html !== nextHtml) await writeFile(htmlPath, nextHtml);
  if (js !== nextJs) await writeFile(jsPath, nextJs);
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await syncSupportPolicy();
  console.log('Support terms synchronized: Business 6 months / $50; Full SiteSync 1 year / $25; lower tiers $100 monthly.');
}
