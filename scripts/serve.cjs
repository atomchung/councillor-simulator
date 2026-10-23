#!/usr/bin/env node
'use strict';
// Local-only, dependency-free static server. No external requests or telemetry.
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../dist');
function localPath(request){const name=decodeURIComponent(new URL(request,'http://127.0.0.1').pathname);if(name.split('/').some(part=>part.startsWith('.')))return null;const target=path.resolve(root,'.'+name);return target===root||target.startsWith(root+path.sep)?target:null;}
function start(){const port=Number(process.env.COUNCILLOR_PORT||4173);if(!Number.isInteger(port)||port<1||port>65535)throw new Error('COUNCILLOR_PORT must be a port from 1 to 65535');const url='http://127.0.0.1:'+port;const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.webp':'image/webp'};
 const server=http.createServer((req,res)=>{if(!['GET','HEAD'].includes(req.method)){res.writeHead(405);res.end();return;}let file;try{file=localPath(req.url);if(!file)throw Error('Invalid path');if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');const body=fs.readFileSync(file);res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:body);}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('找不到檔案。');}});
 server.on('error',error=>{if(error.code==='EADDRINUSE')console.error(port+' 埠已使用。若本遊戲已在執行，請開啟 '+url+'；否則先停止占用此埠的程式。');else console.error(error.message);process.exitCode=1;});
 server.listen(port,'127.0.0.1',()=>{console.log('巷口，開始 v13.8\n'+url+'\n僅本機可連線。按 Control-C 停止。');if(process.argv.includes('--open')&&process.platform==='darwin'){const p=require('node:child_process').spawn('open',[url],{stdio:'ignore'});p.on('error',()=>console.log('請手動開啟 '+url));}});return server;
}
if(require.main===module)start();module.exports={root,localPath};
