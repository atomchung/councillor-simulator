'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),A=require('node:assert/strict');
const manifest=require('./provenance.json');let checks=0;
for(const [f,hash]of Object.entries(manifest.runtime_files)){A.equal(crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex'),hash,'source byte identity '+f);checks++;}
for(const mode of['','legacy-v10-3/','legacy-v10/','legacy-v9/']){const filename='dist/'+mode+'index.html',text=fs.readFileSync(filename,'utf8');for(const m of text.matchAll(/(?:src|href)="([^"#]+)"/g)){if(/^(https?:|\.\/)/.test(m[1]))continue;A.ok(fs.existsSync(path.resolve(path.dirname(filename),m[1].split(/[?#]/,1)[0])),filename+' link '+m[1]);checks++;}}
const server=require('../scripts/serve.cjs');A.equal(server.localPath('/day-engine.js'),path.join(server.root,'day-engine.js'));A.equal(server.localPath('/.openai/hosting.json'),null);A.equal(server.localPath('/%2e%2e%2fsecret'),null);checks+=3;
A.ok(!fs.existsSync('.openai')&&!fs.existsSync('node_modules'),'private deployment/runtime files excluded');checks++;
console.log(JSON.stringify({result:'passed',checks,runtimeFiles:Object.keys(manifest.runtime_files).length,scope:'Export integrity, local entry links and local-only server path validation; no browser-render claim.'}));
