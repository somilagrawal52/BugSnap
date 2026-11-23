import { readFileSync } from 'node:fs';
import { gzipSync, brotliCompressSync } from 'node:zlib';
const data = readFileSync('../../apps/web/public/widget.js');
console.log(
  `Widget production size: ${data.length} bytes raw; ${gzipSync(data).length} bytes gzip; ${brotliCompressSync(data).length} bytes Brotli`,
);
