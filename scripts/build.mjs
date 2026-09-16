import { readFile, readdir, mkdir, writeFile, rm, cp } from 'node:fs/promises';
import path from 'node:path';
const root = process.cwd();
const assets = {};
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.webp':'image/webp','.ico':'image/x-icon'};
async function collect(directory, prefix = '') {
  for (const entry of await readdir(directory,{withFileTypes:true})) {
    const relative = `${prefix}/${entry.name}`;
    const file = path.join(directory,entry.name);
    if (entry.isDirectory()) await collect(file,relative);
    else {
      const extension = path.extname(entry.name);
      const binary = !['.html','.css','.js','.svg','.txt'].includes(extension);
      const content = await readFile(file);
      assets[relative] = {type:types[extension] || 'application/octet-stream',encoding:binary?'base64':'utf8',body:content.toString(binary?'base64':'utf8')};
    }
  }
}
await collect(path.join(root,'public'));
const source = await readFile('worker/index.js','utf8');
const output = source.replace('/*__SITE_ASSETS__*/ {}',JSON.stringify(assets));
if (output === source) throw new Error('Missing asset insertion point');
await rm('dist',{recursive:true,force:true});
await mkdir('dist/server',{recursive:true});
await mkdir('dist/.openai',{recursive:true});
await writeFile('dist/server/index.js',output);
await writeFile('dist/.openai/hosting.json',await readFile('.openai/hosting.json','utf8'));
await cp('drizzle','dist/.openai/drizzle',{recursive:true});
console.log(`Built SiteSync with ${Object.keys(assets).length} embedded public assets and private consultation delivery.`);
