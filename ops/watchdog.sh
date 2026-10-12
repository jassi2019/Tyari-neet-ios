#!/bin/bash
# Taiyari NEET — auto-heal watchdog. Runs every 3 min via cron.
# Checks each service; restarts only what is broken. Logs everything.

LOG="/root/tyari-neet-ios/watchdog.log"
COMPOSE="docker compose -f /root/tyari-neet-ios/docker-compose.prod.yml"
ts() { date '+%Y-%m-%d %H:%M:%S'; }
log() { echo "$(ts) $1" >> "$LOG"; }
pg() { docker exec tyari-neet-ios-postgres-1 psql -U postgres -d education_app -q -c "$1" 2>/dev/null; }
set_status() { pg "INSERT INTO system_status(key,value,updated_at) VALUES('$1','$2',now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();"; }
alert() { log "$1"; set_status last_alert "$(ts) $1"; }

# Keep log small (last 2000 lines)
if [ -f "$LOG" ] && [ "$(wc -l < "$LOG")" -gt 2000 ]; then
  tail -n 1000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

# 1. Postgres
if ! docker exec tyari-neet-ios-postgres-1 pg_isready -U postgres -q 2>/dev/null; then
  alert "ALERT postgres unhealthy -> restarting"
  docker restart tyari-neet-ios-postgres-1 >> "$LOG" 2>&1
  sleep 15
fi

# 2. Backend API (inside container)
CODE=$(docker exec tyari-neet-ios-backend-1 curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:8000/ 2>/dev/null)
if [ "$CODE" != "200" ]; then
  alert "ALERT backend http=$CODE -> restarting"
  docker restart tyari-neet-ios-backend-1 >> "$LOG" 2>&1
  sleep 10
  CODE2=$(docker exec tyari-neet-ios-backend-1 curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://localhost:8000/ 2>/dev/null)
  log "backend after restart http=$CODE2"
fi

# 3. Portal (inside its own network namespace via backend curl)
PCODE=$(docker exec tyari-neet-ios-backend-1 curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://portal:3000/ 2>/dev/null)
if [ "$PCODE" != "200" ] && [ "$PCODE" != "307" ] && [ "$PCODE" != "308" ]; then
  alert "ALERT portal http=$PCODE -> restarting"
  docker restart tyari-neet-ios-portal-1 >> "$LOG" 2>&1
fi

# 4. Public HTTPS through Caddy (what real users hit)
PUB=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 https://api.taiyarineetki.com/ 2>/dev/null)
if [ "$PUB" != "200" ]; then
  alert "ALERT public api http=$PUB -> restarting caddy"
  docker restart tyari-neet-ios-caddy-1 >> "$LOG" 2>&1
fi

# 5. Any exited app container -> bring the stack back
for c in tyari-neet-ios-backend-1 tyari-neet-ios-portal-1 tyari-neet-ios-caddy-1 tyari-neet-ios-postgres-1; do
  RUNNING=$(docker inspect -f '{{.State.Running}}' "$c" 2>/dev/null)
  if [ "$RUNNING" != "true" ]; then
    alert "ALERT $c not running -> compose up"
    $COMPOSE up -d >> "$LOG" 2>&1
    break
  fi
done

# 6. Disk guard: >85% -> prune old docker images/build cache (never volumes/data)
USE=$(df / --output=pcent | tail -1 | tr -dc '0-9')
if [ "${USE:-0}" -gt 85 ]; then
  alert "ALERT disk ${USE}% -> pruning docker images + build cache"
  docker image prune -af >> "$LOG" 2>&1
  docker builder prune -af >> "$LOG" 2>&1
  log "disk after prune: $(df / --output=pcent | tail -1 | tr -d ' ')"
fi

# Status heartbeat for admin panel
set_status last_check "$(ts)"
set_status disk_pct "${USE:-0}"
