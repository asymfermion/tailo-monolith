import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const root = join(dirname(dirname(fileURLToPath(import.meta.url))), 'src');
const port = Number(process.env.PORT ?? 4173);

const types = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? '/', `http://${request.headers.host}`);
  const safePath = normalize(url.pathname).replace(/^(\.\.[/\\])+/, '');
  const requested = safePath === '/' ? '/index.html' : safePath;
  const filePath = join(root, requested);

  try {
    const file = await stat(filePath);
    if (!file.isFile()) {
      throw new Error('Not a file');
    }

    response.setHeader('Content-Type', types[extname(filePath)] ?? 'application/octet-stream');
    createReadStream(filePath).pipe(response);
  } catch {
    response.statusCode = 404;
    response.end('Not found');
  }
});

server.listen(port, () => {
  console.log(`Tailo landing page: http://localhost:${port}`);
});
