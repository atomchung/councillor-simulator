// Refresh tests/provenance.json runtime hashes: node scripts/refresh-provenance.cjs <repo root>.
const fs=require('fs'),crypto=require('crypto'),path=require('path');const root=process.argv[2];process.chdir(root);
const p='tests/provenance.json',m=JSON.parse(fs.readFileSync(p,'utf8'));let n=0;
for(const f of Object.keys(m.runtime_files)){const h=crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');if(m.runtime_files[f]!==h){m.runtime_files[f]=h;n++;console.log('updated',f);}}
fs.writeFileSync(p,JSON.stringify(m,null,2)+'\n');console.log(n,'changed');
