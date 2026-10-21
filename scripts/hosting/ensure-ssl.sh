#!/bin/bash
# Daily: if a main name is not served the wildcard certificate, reinstall it.
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
cd ~/acme-tool
for d in commerco.store www.commerco.store afnane.store www.afnane.store; do
  root=${d#www.}
  echo | openssl s_client -connect 127.0.0.1:443 -servername "$d" 2>/dev/null | openssl x509 -noout -ext subjectAltName 2>/dev/null | grep -q "DNS:\*\.$root" || {
    echo "$(date -Is) reinstall wildcard ($d)" >> ~/logs/ssl-renew.log; node install-cert.js wildcard commerco.store afnane.store >> ~/logs/ssl-renew.log 2>&1; break; }
done
