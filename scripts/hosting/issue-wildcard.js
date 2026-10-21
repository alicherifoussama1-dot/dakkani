// Issue ONE Let's Encrypt certificate covering the platform and every store
// domain, wildcards included (commerco.store, *.commerco.store, afnane.store,
// *.afnane.store), via DNS-01. Works because the domains use the hosting's
// nameservers (dns1/dns2.namecheaphosting.com): the challenge TXT records are
// written to the cPanel zone with UAPI. Then installs it on the main vhost and
// on every cPanel subdomain vhost, so new store/product subdomains are covered
// without issuing anything.
// Usage: node issue-wildcard.js commerco.store afnane.store
// Deployed to ~/acme-tool/ (needs acme-client from its node_modules).
const acme = require('acme-client')
const fs = require('fs'), path = require('path'), os = require('os')
const { execFileSync } = require('child_process')

const roots = process.argv.slice(2)
if (!roots.length) { console.error('usage: node issue-wildcard.js <domain> [domain...]'); process.exit(1) }
const names = roots.flatMap(d => [d, `*.${d}`])
const home = os.homedir()
const stateDir = path.join(home, '.acme-state')
const accountKeyFile = path.join(stateDir, 'account.key')

const uapi = (...args) => JSON.parse(execFileSync('uapi', ['--output=json', ...args], { stdio: ['ignore', 'pipe', 'ignore'] }).toString()).result
const b64 = s => Buffer.from(s, 'base64').toString()
const zoneOf = host => roots.find(r => host === r || host.endsWith('.' + r))
const serial = zone => b64(uapi('DNS', 'parse_zone', `zone=${zone}`).data.find(r => r.record_type === 'SOA').data_b64[2])
const enc = s => encodeURIComponent(s)
const sleep = ms => new Promise(r => setTimeout(r, ms))

// Wait until the hosting nameservers serve the TXT value (LE queries them).
async function waitForTxt(fqdn, value) {
  for (let i = 0; i < 40; i++) {
    try {
      const out = execFileSync('dig', ['+short', 'TXT', fqdn, '@dns1.namecheaphosting.com']).toString()
      if (out.includes(value)) return
    } catch {}
    await sleep(15000)
  }
  throw new Error(`TXT for ${fqdn} never appeared`)
}

;(async () => {
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 })
  const accountKey = fs.existsSync(accountKeyFile) ? fs.readFileSync(accountKeyFile) : await acme.crypto.createPrivateKey()
  fs.writeFileSync(accountKeyFile, accountKey, { mode: 0o600 })
  const client = new acme.Client({ directoryUrl: acme.directory.letsencrypt.production, accountKey })
  const [key, csr] = await acme.crypto.createCsr({ commonName: roots[0], altNames: names })
  const added = [] // { zone, line }

  const cert = await client.auto({
    csr, termsOfServiceAgreed: true, challengePriority: ['dns-01'],
    challengeCreateFn: async (authz, _ch, keyAuth) => {
      const zone = zoneOf(authz.identifier.value)
      const dname = `_acme-challenge${authz.identifier.value === zone ? '' : '.' + authz.identifier.value.slice(0, -zone.length - 1)}`
      const res = uapi('DNS', 'mass_edit_zone', `zone=${zone}`, `serial=${serial(zone)}`,
        `add=${JSON.stringify({ dname, ttl: 300, record_type: 'TXT', data: [keyAuth] })}`)
      if (!res.status) throw new Error('TXT add failed: ' + JSON.stringify(res.errors))
      await waitForTxt(`${dname}.${zone}`, keyAuth)
    },
    challengeRemoveFn: async (authz, _ch, keyAuth) => {
      const zone = zoneOf(authz.identifier.value)
      const rec = uapi('DNS', 'parse_zone', `zone=${zone}`).data.find(r =>
        r.record_type === 'TXT' && b64(r.dname_b64).startsWith('_acme-challenge') && (r.data_b64 || []).some(x => b64(x) === keyAuth))
      if (rec) uapi('DNS', 'mass_edit_zone', `zone=${zone}`, `serial=${serial(zone)}`, `remove=${rec.line_index}`)
    },
  })

  const base = path.join(stateDir, 'wildcard')
  fs.writeFileSync(base + '.key', key, { mode: 0o600 }); fs.writeFileSync(base + '.crt', cert, { mode: 0o600 })
  const parts = cert.toString().split(/(?=-----BEGIN CERTIFICATE-----)/).map(s => s.trim()).filter(Boolean)

  // Install on the main vhost (parked domains) and on every subdomain vhost.
  const info = uapi('DomainInfo', 'list_domains').data
  const targets = [...roots, ...info.sub_domains.filter(d => roots.some(r => d.endsWith('.' + r)))]
  for (const d of targets) {
    const r = uapi('SSL', 'install_ssl', `domain=${d}`, `cert=${enc(parts[0])}`, `key=${enc(key.toString().trim())}`, `cabundle=${enc(parts.slice(1).join('\n'))}`)
    console.log(d, r.status ? 'installed' : 'FAILED ' + JSON.stringify(r.errors))
  }
})().catch(e => { console.error('ERROR', e.message); process.exit(1) })
