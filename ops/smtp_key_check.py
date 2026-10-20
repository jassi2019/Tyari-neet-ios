#!/usr/bin/env python3
"""Daily check of the SMTP (Brevo) key expiry.

Reads SMTP_KEY_EXPIRES=YYYY-MM-DD from the backend .env, records the days left
in the system_status table (shown on the admin System Health page) and emails
the admins when 30, 14, 7, 3 and 1 days are left, and every day once expired.
"""
import datetime, os, smtplib, subprocess
from email.message import EmailMessage

ENV = "/root/tyari-neet-ios/backend-main/.env"
STATE = "/root/tyari-neet-ios/.smtp_key_alert_sent"
ALERT_DAYS = {30, 14, 7, 3, 1}


def load_env(path):
    env = {}
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env


def set_status(key, value):
    sql = (
        "INSERT INTO system_status(key,value,updated_at) VALUES('%s','%s',now()) "
        "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now();" % (key, value.replace("'", ""))
    )
    subprocess.run(
        ["docker", "exec", "tyari-neet-ios-postgres-1", "psql", "-U", "postgres", "-d", "education_app", "-q", "-c", sql],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
    )


def send_alert(env, subject, body):
    rcpts = set()
    if env.get("ADMIN_EMAIL"):
        rcpts.add(env["ADMIN_EMAIL"])
    for e in env.get("DEVELOPER_EMAILS", "").split(","):
        if e.strip():
            rcpts.add(e.strip())
    if not rcpts:
        return
    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = '"Taiyari NEET ki" <%s>' % env.get("SMTP_FROM", env["SMTP_USER"])
    msg["To"] = ", ".join(sorted(rcpts))
    msg.set_content(body)
    s = smtplib.SMTP(env.get("SMTP_HOST", "smtp-relay.brevo.com"), int(env.get("SMTP_PORT", "587")), timeout=60)
    s.starttls()
    s.login(env["SMTP_USER"], env["SMTP_PASSWORD"])
    s.send_message(msg)
    s.quit()


def main():
    env = load_env(ENV)
    raw = env.get("SMTP_KEY_EXPIRES", "").strip()
    if not raw:
        set_status("smtp_key_expires", "not set")
        return
    try:
        expires = datetime.date.fromisoformat(raw)
    except ValueError:
        set_status("smtp_key_expires", "invalid date: " + raw)
        return
    today = datetime.date.today()
    left = (expires - today).days
    set_status("smtp_key_expires", "%s (%d days left)" % (raw, left) if left >= 0 else "%s (EXPIRED %d days ago)" % (raw, -left))

    already = open(STATE).read().split() if os.path.exists(STATE) else []
    marker = "%s:%d" % (raw, left)
    should = left in ALERT_DAYS or left <= 0
    if should and marker not in already:
        if left > 0:
            subject = "Taiyari NEET ki: email (Brevo) key expires in %d days" % left
            body = (
                "The SMTP key used for OTP and app emails expires on %s (%d days left).\n\n"
                "Before that date: Brevo -> Settings -> SMTP & API -> generate a new SMTP key with a 1-year expiry, "
                "then put it in /root/tyari-neet-ios/backend-main/.env as SMTP_PASSWORD and update SMTP_KEY_EXPIRES, "
                "and recreate the backend container:\n"
                "  cd /root/tyari-neet-ios && docker compose -f docker-compose.prod.yml up -d --force-recreate backend\n\n"
                "If the key expires, OTP emails stop and users cannot register or reset passwords." % (raw, left)
            )
        else:
            subject = "Taiyari NEET ki: email (Brevo) key HAS EXPIRED, OTP emails are failing"
            body = "The SMTP key expired on %s. Generate a new key in Brevo and update SMTP_PASSWORD / SMTP_KEY_EXPIRES in the backend .env, then recreate the backend container." % raw
        try:
            send_alert(env, subject, body)
            with open(STATE, "a") as f:
                f.write(marker + "\n")
        except Exception as e:
            set_status("smtp_key_alert", "send failed: " + str(e)[:80])


if __name__ == "__main__":
    main()
