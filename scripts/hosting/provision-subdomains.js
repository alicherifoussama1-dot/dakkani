// Provision subdomains on the cPanel host: product subdomains under a store's
// custom domain (roya.afnane.store) and store subdomains on the platform
// domain (arsily-dz.commerco.store).
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
// SAN names of a PEM certificate (from a file, or as served for an SNI name).
const sanOf = pem => (sh('openssl', ['x509', '-noout', '-ext', 'subjectAltName'], pem).match(/DNS:[^,\s]+/g) || []).map(s => s.slice(4))
const covers = (sans, fqdn) => sans.includes(fqdn) || sans.includes('*.' + fqdn.slice(fqdn.indexOf('.') + 1))
const certServed = fqdn => {
  try { return covers(sanOf(sh('openssl', ['s_client', '-connect', '127.0.0.1:443', '-servername', fqdn], '')), fqdn) }
  catch { return false }
}
// The shared wildcard certificate (issue-wildcard.js) covers every
// <label>.commerco.store / <label>.afnane.store: installing it needs no issuance.
const wildcardCovers = fqdn => {
  try {
    const pem = fs.readFileSync(path.join(home, '.acme-state', 'wildcard.crt'), 'utf8')
    sh('openssl', ['x509', '-noout', '-checkend', '86400'], pem)
    return covers(sanOf(pem), fqdn)
  } catch { return false }
}

;(async () => {
  const db = new Client({ connectionString: env.DATABASE_URL }); await db.connect()
  const { rows } = await db.query(
    `select p.id, p.subdomain, p.subdomain_status, d.hostname
       from products p join domains d on d.store_id = p.store_id and d.status = 'ssl_active'
      where p.subdomain is not null and d.hostname not like 'www.%'`)
  const existing = new Set(uapi('DomainInfo', 'list_domains').data.sub_domains)

  // Failed issuance backs off for an hour (Let's Encrypt limits failed validations).
  const failFile = path.join(tool, '.subdomains-failed.json')
  let failed = {}; try { failed = JSON.parse(fs.readFileSync(failFile, 'utf8')) } catch {}

  // Create the cPanel subdomain + certificate for label.root; true when served.
  const ensure = (label, root) => {
    const fqdn = `${label}.${root}`
    if (failed[fqdn] && Date.now() - failed[fqdn] < 3600e3) return false
    try {
      if (!LABEL.test(label)) throw new Error('invalid label')
      if (!existing.has(fqdn)) {
        const res = uapi('SubDomain', 'addsubdomain', `domain=${label}`, `rootdomain=${root}`, 'dir=public_html', 'disallowdot=0')
        if (!res.status) throw new Error(JSON.stringify(res.errors))
        existing.add(fqdn)
      }
      if (wildcardCovers(fqdn)) {
        if (!certServed(fqdn)) sh(process.execPath, ['install-cert.js', 'wildcard', fqdn])
      } else if (!certValid(fqdn)) {
        sh(process.execPath, ['issue-cert.js', fqdn])
        sh(process.execPath, ['install-cert.js', fqdn, fqdn])
      } else if (!certServed(fqdn)) {
        sh(process.execPath, ['install-cert.js', fqdn, fqdn])
      }
      if (!certServed(fqdn)) throw new Error('certificate not served')
      delete failed[fqdn]
      return true
    } catch (e) {
      failed[fqdn] = Date.now()
      console.error(new Date().toISOString(), fqdn, e.message)
      return false
    }
  }

  // 1. Product subdomains under a store's custom domain (roya.afnane.store)
  for (const r of rows) {
    const status = ensure(r.subdomain, r.hostname) ? 'active' : 'error'
    if (status !== r.subdomain_status) {
      await db.query('update products set subdomain_status = $1 where id = $2', [status, r.id])
      console.log(new Date().toISOString(), `${r.subdomain}.${r.hostname}`, status)
    }
  }

  // 2. Store subdomains on the platform domain (arsily-dz.commerco.store)
  const platform = new URL(env.NEXT_PUBLIC_APP_URL || 'https://commerco.store').hostname.replace(/^www./, '')
  const stores = (await db.query('select slug from stores where is_active')).rows
  for (const st of stores) ensure(st.slug, platform)

  fs.writeFileSync(failFile, JSON.stringify(failed))
  await db.end()
})().catch(e => { console.error(new Date().toISOString(), 'ERROR', e.message); process.exitCode = 1 })
