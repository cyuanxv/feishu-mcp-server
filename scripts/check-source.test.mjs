import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { validateReleaseFile } from './check-source.mjs';
test('only exact reviewed cover is accepted',async()=>{
 const cover=await readFile(new URL('../docs/media/social-preview.jpg',import.meta.url));
 assert.doesNotThrow(()=>validateReleaseFile('docs/media/social-preview.jpg',cover));
 assert.throws(()=>validateReleaseFile('docs/media/unreviewed.jpg',cover));
 assert.throws(()=>validateReleaseFile('docs/media/social-preview.jpg',Buffer.concat([cover,Buffer.from('changed')])));
});
test('private files and secrets remain rejected',()=>{
 for(const name of ['docs/example.env','docs/private.pem','docs/data.sqlite','docs/archive.zip','.env','standalone/acceptance-private-test/config.json']) {
   const path=name==='docs/example.env'?'.env.local':name;
   assert.throws(()=>validateReleaseFile(path,Buffer.from('fixture')));
 }
 assert.throws(()=>validateReleaseFile('standalone/fixture.json',Buffer.from('cli_'+'a'.repeat(16))));
 assert.throws(()=>validateReleaseFile('docs/fixture.md',Buffer.from('ghp_'+'A'.repeat(24))));
 assert.throws(()=>validateReleaseFile('docs/binary.txt',Buffer.from([0,1,2])));
 assert.doesNotThrow(()=>validateReleaseFile('.env.example',Buffer.from('FEISHU_APP_ID=YOUR_APP_ID')));
});
