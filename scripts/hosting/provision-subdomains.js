// Provision product subdomains on the cPanel host (roya.afnane.store).
// For every product with `subdomain` set on a store with an active custom
// domain: create the cPanel subdomain with docroot public_html (so the same
// Passenger app serves it), issue a Let's Encrypt certificate (HTTP-01) and
// keep it renewed. Progress is written to products.subdomain_status.
// Idempotent; runs from cron and right after a product is saved.
// Deployed to ~/acme-tool/ (next to issue-cert.js / install-cert.js).
const fs = require('fs'), path = require('path'), os = require('os')
const { execFileSync } = require('child_process')

const home = os.homedir()
const tool = path.join(home, 'acme-tool')
const { Client } = require(path.join(home, 'commerco', 'node_modules', 'pg'))
const LABEL = /^[a-z0-9](?:[a-z0-9-]{0,40}[a-z0-9])?$/
const RENEW_SECONDS = 30 * 86400

// One run at a time (cron + on-save triggers can overlap). Stale after 15 min.
const lock = path.join(tool, '.subdomains.lock')
try { if (Date.now() - fs.statSync(lock).mtimeMs > 15 * 60e3) fs.rmSync(lock) } catch {}
try { fs.closeSync(fs.openSync(lock, 'wx')) } catch { process.exit(0) }
process.on('exit', () => fs.rmSync(lock, { force: true }))

const env = Object.fromEntries(fs.readFileSync(path.join(home, 'commerco', '.env.production'), 'utf8')
  .split('\n').filter(l => /^[A-Z0-9_]+=/.test(l))
  .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1).replace(/^'(.*)'$/, '$1')]))

const uapi = (...args) => JSON.parse(execFileSync('uapi', ['--output=json', ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()).result
const sh = (cmd, args, input) => execFileSync(cmd, args, { cwd: tool, input, stdio: ['pipe', 'pipe', 'ignore'] }).toString()
const certFile = fqdn => path.join(home, '.acme-state', fqdn + '.crt')
const certValid = fqdn => {
  try { sh('openssl', ['x509', '-in', certFile(fqdn), '-noout', '-checkend', String(RENEW_SECONDS)]); return true } catch { return false }
}
const certServed = fqdn => {
  try {
    const out = sh('openssl', ['s_client', '-connect', '127.0.0.1:443', '-servername', fqdn], '')
    return out.includes(`CN = ${fqdn}`) || out.includes(`CN=${fqdn}`)
  } catch { return false }
}

;(async () => {
  const db = new Client({ connectionString: env.DATABASE_URL }); await db.connect()
  const { rows } = await db.query(
    `select p.id, p.subdomain, p.subdomain_status, d.hostname
       from products p join domains d on d.store_id = p.store_id and d.status = 'ssl_active'
      where p.subdomain is not null and d.hostname not like 'www.%'`)
  const existing = new Set(uapi('DomainInfo', 'list_domains').data.sub_domains)
  for (const r of rows) {
    const fqdn = `${r.subdomain}.${r.hostname}`
    let status = 'active'
    try {
      if (!LABEL.test(r.subdomain)) throw new Error('invalid label')
      if (!existing.has(fqdn)) {
        const res = uapi('SubDomain', 'addsubdomain', `domain=${r.subdomain}`, `rootdomain=${r.hostname}`, 'dir=public_html', 'disallowdot=0')
        if (!res.status) throw new Error(JSON.stringify(res.errors))
        existing.add(fqdn)
      }
      if (!certValid(fqdn)) {
        sh(process.execPath, ['issue-cert.js', fqdn])
        sh(process.execPath, ['install-cert.js', fqdn, fqdn])
      } else if (!certServed(fqdn)) {
        sh(process.execPath, ['install-cert.js', fqdn, fqdn])
      }
      if (!certServed(fqdn)) throw new Error('certificate not served')
    } catch (e) {
      status = 'error'
      console.error(new Date().toISOString(), fqdn, e.message)
    }
    if (status !== r.subdomain_status) {
      await db.query('update products set subdomain_status = $1 where id = $2', [status, r.id])
      console.log(new Date().toISOString(), fqdn, status)
    }
  }
  await db.end()
})().catch(e => { console.error(new Date().toISOString(), 'ERROR', e.message); process.exitCode = 1 })
