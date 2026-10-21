#!/bin/bash
# Usage: commerco_cron.sh <job>   (auto-blacklist | sync-delivery-status | process-queue)
# Calls the app over https on this same server (http is redirected to https).
SECRET=$(grep '^CRON_SECRET=' "$HOME/commerco/.env.production" | cut -d= -f2-)
HOST=$(cat "$HOME/.commerco_host" 2>/dev/null || echo commerco.store)
echo "$(date -Is) $1 $(curl -s -m 280 -o /dev/null -w '%{http_code}' --resolve "$HOST:443:199.188.205.7" -H "Authorization: Bearer $SECRET" "https://$HOST/api/cron/$1")" >> "$HOME/logs/commerco_cron.log" 2>&1
