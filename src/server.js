'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const PUBLIC_DIR = path.join(ROOT_DIR, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function resolveRequestPath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const isDataRequest = decoded.startsWith('/data/');
  const baseDir = isDataRequest ? ROOT_DIR : PUBLIC_DIR;
  const relative = decoded === '/' ? 'index.html' : decoded.replace(/^\//, '');
  const resolved = path.normalize(path.join(baseDir, relative));

  if (!resolved.startsWith(baseDir)) {
    return null; // tentativa de path traversal
  }
  return resolved;
}

function startServer(port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const filePath = resolveRequestPath(req.url);

      if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Não encontrado');
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
      fs.createReadStream(filePath).pipe(res);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(
          `Já tem um servidor rodando em http://localhost:${port} (provavelmente de um build anterior). Só abra essa URL — o app recarrega os anos disponíveis sozinho.`,
        );
        resolve(null);
        return;
      }
      throw err;
    });

    server.listen(port, () => {
      console.log(`Servidor rodando em http://localhost:${port}`);
      resolve(server);
    });
  });
}

module.exports = { startServer };
