#!/bin/sh
# ══════════════════════════════════════════════════════════════
# Cron Entrypoint
# Inject env vars into crontab then start crond
# ══════════════════════════════════════════════════════════════

echo "╔══════════════════════════════════════════════════╗"
echo "║  BlackStone Cron Scheduler                       ║"
echo "║  TZ: ${TZ:-UTC}                                  ║"
echo "║  APP_URL: ${APP_URL:-not set}                    ║"
echo "╚══════════════════════════════════════════════════╝"

# Replace env vars in crontab
envsubst < /etc/cron.d/blackstone-cron > /tmp/crontab.env
crontab /tmp/crontab.env

# Create log file
touch /var/log/cron.log
echo "$(date) — Cron scheduler started" >> /var/log/cron.log

# Start crond in foreground, tail log
crond -f -l 2 &
tail -f /var/log/cron.log
