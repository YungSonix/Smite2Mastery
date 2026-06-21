#!/usr/bin/env node
/**
 * Local web UI to browse pantheon skin JSON files and verify art paths.
 *
 *   npm run skins:viewer
 *   → http://localhost:4177
 */
const fs = require('fs');
const http = require('http');
const path = require('path');
const { SKINS_DIR, PROJECT_ROOT } = require('../config/dataPaths');

const PORT = Number(process.env.SKINS_VIEWER_PORT || 4177);
const GITHUB_RAW =
  process.env.SKINS_VIEWER_GITHUB_RAW ||
  'https://raw.githubusercontent.com/YungSonix/Smite2Mastery/master';

const VIEWER_DIR = path.join(__dirname, 'skins-viewer');
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
};

function listPantheons() {
  if (!fs.existsSync(SKINS_DIR)) return [];
  return fs
    .readdirSync(SKINS_DIR)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => {
      const filePath = path.join(SKINS_DIR, f);
      let godCount = 0;
      let skinCount = 0;
      try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        godCount = (data.gods || []).length;
        for (const g of data.gods || []) skinCount += (g.skins || []).length;
      } catch {
        /* ignore */
      }
      return {
        id: f.replace(/\.json$/i, ''),
        file: f,
        godCount,
        skinCount,
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id));
}

function listAllGods() {
  const gods = [];
  for (const p of listPantheons()) {
    const filePath = path.join(SKINS_DIR, p.file);
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      for (const god of data.gods || []) {
        gods.push({
          ...god,
          pantheon: data.pantheon || p.id,
          pantheonId: p.id,
          skinCount: (god.skins || []).length,
        });
      }
    } catch {
      /* ignore */
    }
  }
  gods.sort((a, b) =>
    String(a.godName || '').localeCompare(String(b.godName || ''), undefined, {
      sensitivity: 'base',
    })
  );
  return gods;
}

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body));
}

function sendFile(res, filePath) {
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

function redirect(res, url) {
  res.writeHead(302, { Location: url });
  res.end();
}

function resolveMedia(reqPath) {
  const decoded = decodeURIComponent(reqPath.replace(/^\/media\/?/, ''));
  const normalized = decoded.replace(/\\/g, '/').replace(/^\/+/, '');
  const local = path.join(PROJECT_ROOT, normalized);
  if (fs.existsSync(local) && fs.statSync(local).isFile() && !/\.json$/i.test(normalized)) {
    return local;
  }

  if (/\.json$/i.test(normalized)) {
    for (const ext of ['.png', '.webp', '.jpg', '.jpeg']) {
      const alt = normalized.replace(/\.json$/i, ext);
      const altLocal = path.join(PROJECT_ROOT, alt);
      if (fs.existsSync(altLocal) && fs.statSync(altLocal).isFile()) return altLocal;
    }
  }

  let githubPath = normalized;
  if (/\.json$/i.test(githubPath)) {
    githubPath = githubPath.replace(/\.json$/i, '.png');
  }
  const githubUrl = `${GITHUB_RAW}/${githubPath
    .split('/')
    .map((s) => encodeURIComponent(s))
    .join('/')}`;
  return { redirect: githubUrl };
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const pathname = url.pathname;

  if (pathname === '/api/pantheons') {
    return sendJson(res, 200, { pantheons: listPantheons() });
  }

  if (pathname === '/api/gods') {
    const gods = listAllGods();
    return sendJson(res, 200, { gods, total: gods.length });
  }

  const pantheonMatch = pathname.match(/^\/api\/pantheon\/([^/]+)$/);
  if (pantheonMatch) {
    const id = decodeURIComponent(pantheonMatch[1]);
    const filePath = path.join(SKINS_DIR, `${id}.json`);
    if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'Pantheon not found' });
    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return sendJson(res, 200, data);
    } catch (e) {
      return sendJson(res, 500, { error: String(e.message) });
    }
  }

  if (pathname.startsWith('/media/')) {
    const resolved = resolveMedia(pathname);
    if (typeof resolved === 'string') return sendFile(res, resolved);
    if (resolved?.redirect) return redirect(res, resolved.redirect);
    res.writeHead(404);
    return res.end('Media not found');
  }

  let staticPath = pathname === '/' ? '/index.html' : pathname;
  staticPath = path.join(VIEWER_DIR, staticPath.replace(/^\//, ''));
  if (!staticPath.startsWith(VIEWER_DIR)) {
    res.writeHead(403);
    return res.end('Forbidden');
  }
  return sendFile(res, staticPath);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use.`);
    console.error(`The skin viewer is probably already running → http://127.0.0.1:${PORT}`);
    console.error('Open that URL in your browser, or stop the other process (Ctrl+C in its terminal).');
    console.error(`Or use a different port: SKINS_VIEWER_PORT=4178 npm run skins:viewer`);
    process.exit(1);
  }
  throw err;
});

server.listen(PORT, '127.0.0.1', () => {
  const url = `http://127.0.0.1:${PORT}`;
  console.log(`Skin viewer → ${url}`);
  console.log(`Data: ${SKINS_DIR}`);
  console.log('Press Ctrl+C to stop.');
});
