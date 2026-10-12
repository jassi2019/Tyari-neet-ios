#!/bin/bash
# Daily Postgres backup — keeps last 7 days. Runs 3:30 AM via cron.
DIR="/root/backups"
mkdir -p "$DIR"
F="$DIR/education_app_$(date +%Y%m%d).sql.gz"
docker exec tyari-neet-ios-postgres-1 pg_dump -U postgres education_app | gzip > "$F"
set_status() { docker exec tyari-neet-ios-postgres-1 psql -U postgres -d education_app -q -c "INSERT INTO system_status(key,value,updated_at) VALUES('last_backup','$1',now()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();" 2>/dev/null; }
if [ -s "$F" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') backup ok: $F ($(du -h "$F" | cut -f1))" >> "$DIR/backup.log"
  set_status "ok $(date '+%Y-%m-%d %H:%M') ($(du -h "$F" | cut -f1))"
  # Email the backup file so it is safe even outside the server
  MAILOUT=$(python3 /root/tyari-neet-ios/send_backup_mail.py "$F" 2>&1)
  echo "$(date '+%Y-%m-%d %H:%M:%S') $MAILOUT" >> "$DIR/backup.log"
else
  echo "$(date '+%Y-%m-%d %H:%M:%S') BACKUP FAILED" >> "$DIR/backup.log"
  set_status "FAILED $(date '+%Y-%m-%d %H:%M')"
  rm -f "$F"
fi
# keep last 7
ls -1t "$DIR"/education_app_*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm -f
