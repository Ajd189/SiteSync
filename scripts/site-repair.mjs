import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const marker = '<!-- email-inbox-repair-1 -->';
export function repairHomepage(source) {
  if (typeof source !== 'string') throw new TypeError('Expected HTML');
  if (source.includes(marker)) return source;
  if (!source.includes('</head>')) throw new Error('Missing homepage head');
  const before = 'Your details are saved securely for SiteSync to review and respond to your inquiry.';
  if (source.split(before).length !== 2) throw new Error('Unexpected consultation privacy text');
  return source.replace(before, 'Your details are saved securely and sent to SiteSync’s email inbox for review.')
    .replace('</head>', `    <link rel="stylesheet" href="./site-repair.css?v=1" />\n    ${marker}\n  </head>`);
}
export async function syncSiteRepair(directory = 'public') {
  const file = resolve(directory, 'index.html');
  const before = await readFile(file, 'utf8');
  const after = repairHomepage(before);
  if (before !== after) await writeFile(file, after, 'utf8');
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await syncSiteRepair();
