import { readdir, readFile, lstat } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

// Export only these source roots; never traverse private runtime directories.
const roots = ['apps','packages','tests','docs','infra','scripts','.github','skills','distribution','standalone','snapshots/sites-adapter-0.1.0-sites.8'];
const top = ['package.json','package-lock.json','tsconfig.json','README.md','README.en.md','VALIDATION.md','RELEASE-CHECKS.md','LICENSE','SECURITY.md','CONTRIBUTING.md','CHANGELOG.md','.env.example','.gitignore','Dockerfile','.dockerignore','server.json'];
const generated = new Set(['node_modules','dist','coverage','.test-build','.runtime-test','.sites-runtime','__pycache__']);
// Reviewed public artwork and synthetic demos require exact paths AND content hashes.
const reviewedAssets = new Map([["docs/media/social-preview.jpg", "2e0d8e5a4ca80bd746fd754ec04266b3fd80b12b01c98abeddf120e83ee269ac"], ["docs/media/workflow-demo.gif", "82bbd43ab6265885fb9ab244763e9f1497928b2d734feb429c42917de55bf7bc"], ["docs/media/workflow-demo.mp4", "a9c676632bd4f598fa60f161bc2b5dca6d2b185c8d132dc217eca4066f0591fd"]]);
export function validateReleaseFile(name, content) {
  if (/(^|\/)(?:private-reference|\.git|\.env(?:\..*)?|acceptance-private-[^/]*)(?:\/|$)/.test(name) && name !== '.env.example') throw Error('Excluded source path: '+name);
  if (/\.(?:orig|rej|patch|pending|bak|pem|p12|key|sqlite|db|tgz|zip|docx|pdf)$/i.test(name)) throw Error('Unreviewed private or generated file: '+name);
  if (/\.(?:png|jpe?g|gif|webp|mp4|mov|woff2?)$/i.test(name)) {
    if (createHash('sha256').update(content).digest('hex') !== reviewedAssets.get(name)) throw Error('Unreviewed binary asset: '+name);
    return;
  }
  if (content.includes(0)) throw Error('Unreviewed binary content: '+name);
  if (/(?:cli_[0-9a-f]{12,}|sk-[A-Za-z0-9_-]{20,}|gh[pousr]_[A-Za-z0-9_]{20,}|-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|appgprj_[0-9a-f]{12,}|https:\/\/[a-z0-9-]+\.andy-sg\.chatgpt\.site|\/Users\/lilimeng\/)/.test(content.toString('utf8'))) throw Error('Potential credential or private identifier: '+name);
}
export async function releaseFiles(root) {
  const files = [...top];
  async function visit(name) {
    const stat = await lstat(join(root,name));
    if (stat.isSymbolicLink()) throw Error('Symlink in source: '+name);
    if (stat.isDirectory()) {
      for (const entry of await readdir(join(root,name))) if (!generated.has(entry)) await visit(name+'/'+entry);
    } else files.push(name);
  }
  for (const name of roots) await visit(name);
  for (const name of files) {
    if ((await lstat(join(root,name))).isSymbolicLink()) throw Error('Symlink in source: '+name);
    validateReleaseFile(name,await readFile(join(root,name)));
  }
  return [...new Set(files)].sort();
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const files=await releaseFiles(resolve(import.meta.dirname,'..'));
  if(process.argv.includes('--tracked')) {
    const tracked=execFileSync('git',['--no-optional-locks','ls-files','-z'],{cwd:resolve(import.meta.dirname,'..'),encoding:'utf8'}).split('\0').filter(Boolean).sort();
    if(JSON.stringify(tracked)!==JSON.stringify(files)) throw Error('Tracked files differ from the audited release allowlist.');
  }
  if(process.argv.includes('--list')) files.forEach(name=>console.log(name));
  else console.log(`Checked ${files.length} source files including standalone and Worker; reviewed cover hash verified. Limited pattern check, not a complete security audit.`);
}
