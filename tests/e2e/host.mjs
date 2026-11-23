import { createServer } from 'node:http';
createServer((request, response) => {
  const key = new URL(request.url, 'http://127.0.0.1:3211').searchParams.get('key') || '';
  response.writeHead(200, { 'Content-Type': 'text/html' });
  response.end(
    `<!doctype html><html lang="en"><head><title>Independent widget host</title></head><body><h1>Acme test checkout</h1><p>A separate website hosting the real BugSnap widget.</p>${/^bs_[a-f0-9]{32}$/.test(key) ? `<script src="http://127.0.0.1:3210/widget.js" data-project-key="${key}" async></script>` : ''}</body></html>`,
  );
}).listen(3211, '127.0.0.1');
