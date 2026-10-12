#!/usr/bin/env python3
"""Email the daily DB backup as attachment. Usage: send_backup_mail.py <file>"""
import os, sys, smtplib
from email.message import EmailMessage

ENV = "/root/tyari-neet-ios/backend-main/.env"

def load_env(path):
    env = {}
    for line in open(path):
        line = line.strip()
        if line and not line.startswith("#") and "=" in line:
            k, v = line.split("=", 1)
            env[k.strip()] = v.strip()
    return env

def main():
    f = sys.argv[1]
    size = os.path.getsize(f)
    env = load_env(ENV)
    host = env.get("SMTP_HOST", "smtp.gmail.com")
    port = int(env.get("SMTP_PORT", "587"))
    user = env["SMTP_USER"]
    pwd = env["SMTP_PASSWORD"]
    rcpts = set()
    if env.get("ADMIN_EMAIL"):
        rcpts.add(env["ADMIN_EMAIL"])
    for e in env.get("DEVELOPER_EMAILS", "").split(","):
        if e.strip():
            rcpts.add(e.strip())
    rcpts = sorted(rcpts)

    msg = EmailMessage()
    name = os.path.basename(f)
    date = name.replace("education_app_", "").replace(".sql.gz", "")
    msg["Subject"] = "Taiyari NEET — Daily DB Backup " + date
    msg["From"] = env.get("SMTP_FROM", user)
    msg["To"] = ", ".join(rcpts)

    if size > 20 * 1024 * 1024:
        msg.set_content(
            "Aaj ka database backup %.1f MB ka hai — email attach limit se bada.\n"
            "File server par saved hai: %s\n(Last 7 din ke backups /root/backups me rehte hain.)" % (size / 1048576, f))
    else:
        msg.set_content(
            "Aaj ka database backup attached hai (%.0f KB).\n"
            "Server copy: %s (last 7 din ke backups rakhe jaate hain)." % (size / 1024, f))
        with open(f, "rb") as fh:
            msg.add_attachment(fh.read(), maintype="application", subtype="gzip", filename=name)

    s = smtplib.SMTP(host, port, timeout=60)
    s.starttls()
    s.login(user, pwd)
    s.send_message(msg)
    s.quit()
    print("mailed to: " + ", ".join(rcpts))

if __name__ == "__main__":
    main()
