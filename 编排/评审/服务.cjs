#!/usr/bin/env node
/*
 * 评审用的本地服务：把 编排/ 当静态站点发出去（不缓存），并接收页面 POST 过来的数据存进本轮目录。
 * 用法：node 编排/评审/服务.cjs <端口> <轮次目录>
 * 每一轮换一个新端口＝新的浏览器源＝干净的页面存储，上一轮的草稿不会串进来。
 */
'use strict';
const http = require('http'); const fs = require('fs'); const path = require('path');
const port = Number(process.argv[2]); const roundDir = process.argv[3] && path.resolve(process.argv[3]);
if (!port || !roundDir) { console.error('用法：node 服务.cjs <端口> <轮次目录>'); process.exit(2); }
fs.mkdirSync(roundDir, { recursive: true });
const ROOT = path.resolve(__dirname, '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.md': 'text/markdown; charset=utf-8' };

http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x'); const p = decodeURIComponent(u.pathname);
  if (req.method === 'POST' && p === '/__save') {
    let body = ''; req.on('data', d => { body += d; });
    req.on('end', () => {
      try { JSON.parse(body); } catch (e) { res.writeHead(400); return res.end('不是 JSON'); }
      fs.writeFileSync(path.join(roundDir, 'A-结果.json'), body, 'utf8');
      res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ ok: true, bytes: Buffer.byteLength(body) }));
    });
    return;
  }
  const rel = p === '/' ? '/拆拍台.html' : p;
  const fp = path.join(ROOT, rel);
  if (!fp.startsWith(ROOT) || rel.includes('/评审/') || rel.includes('/.live/')) { res.writeHead(403); return res.end(); }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(fp)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(d);
  });
}).listen(port, '127.0.0.1', () => console.log(`评审服务：http://127.0.0.1:${port}/  → 存到 ${roundDir}`));
