import { readFile, writeFile } from 'node:fs/promises';

const head = `    <link rel="stylesheet" href="./electric.css?v=1" />\n    <script src="./electric.js?v=1" defer></script>\n`;
const atmosphere = `\n    <div class="ss-atmosphere" aria-hidden="true">\n      <div class="ss-aurora"></div><div class="ss-grid"></div>\n      <canvas id="ss-circuit-field"></canvas>\n    </div>`;

/** Apply only to the public marketing homepage, never the private inbox. */
export function enhanceHomepage(html) {
  if (typeof html !== 'string') throw new TypeError('Expected HTML source');
  if (html.includes('data-sitesync-electric')) return html;
  if (!/<\/head>/i.test(html) || !/<body\b[^>]*>/i.test(html)) {
    throw new Error('Homepage must contain a head and body');
  }
  return html.replace(/<\/head>/i, `${head}  </head>`)
    .replace(/<body\b([^>]*)>/i, (_, attrs) => `<body${attrs} data-sitesync-electric="1">${atmosphere}`);
}

export async function addVisualLayer(path) {
  const html = await readFile(path, 'utf8');
  await writeFile(path, enhanceHomepage(html), 'utf8');
}
