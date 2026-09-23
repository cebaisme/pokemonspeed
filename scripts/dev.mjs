import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { pokepasteHtmlToText } from '../src/js/pokepaste.js';
const root = resolve('src');
http.createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const pasteId = pathname.match(/^\/api\/pokepaste\/([a-zA-Z0-9]{1,64})$/)?.[1];
    if (pasteId) {
      const upstream = await fetch(`https://pokepast.es/${pasteId}`, {signal: AbortSignal.timeout(12000)});
      if (!upstream.ok) {res.writeHead(upstream.status).end('PokePaste page unavailable');return;}
      const content = pokepasteHtmlToText(await upstream.text());
      if (!content) {res.writeHead(502).end('PokePaste team not found');return;}
      res.writeHead(200, {'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}).end(content);
      return;
    }
    const path = resolve(root, '.' + decodeURIComponent(pathname === '/' ? '/index.html' : pathname));
    if (!path.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const body = await readFile(path);
    res.writeHead(200, {'Content-Type': ({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'})[extname(path)] || 'application/octet-stream'}).end(body);
  } catch { res.writeHead(404).end('Not found'); }
}).listen(1420, '127.0.0.1', () => console.log('Open http://127.0.0.1:1420'));
