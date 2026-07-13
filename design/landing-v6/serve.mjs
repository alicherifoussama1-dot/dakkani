import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { join, extname, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
const ROOT = dirname(fileURLToPath(import.meta.url))
const PORT = 4521
const MIME = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.woff2':'font/woff2','.json':'application/json' }
createServer(async (req, res) => {
  try {
    let p = decodeURIComponent(new URL(req.url,'http://x').pathname)
    if (p === '/') p = '/index.html'
    const file = join(ROOT, p)
    if (!file.startsWith(ROOT)) throw new Error('forbidden')
    const buf = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[extname(file).toLowerCase()] || 'application/octet-stream', 'Cache-Control': 'no-store' })
    res.end(buf)
  } catch { res.writeHead(404); res.end('not found') }
}).listen(PORT, '0.0.0.0', () => console.log(`landing-v6 on http://127.0.0.1:${PORT}`))
