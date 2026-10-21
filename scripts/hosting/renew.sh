#!/bin/bash
# Monthly: renew the shared wildcard certificate (DNS-01 via the cPanel zones)
# and reinstall it on the main vhost and every subdomain.
export PATH=/opt/alt/alt-nodejs20/root/usr/bin:$PATH
cd ~/acme-tool
node issue-wildcard.js commerco.store afnane.store >> ~/logs/ssl-renew.log 2>&1
