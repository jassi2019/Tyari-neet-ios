"""Install the Brevo email-event webhook on the backend + the System Health card.

Run on the VPS with python3. Writes each file to a temp path then moves it.
"""
import os, shutil, secrets, re

BASE = "/root/tyari-neet-ios/backend-main"
PORTAL = "/root/tyari-neet-ios/portal-main/src/app/system-health/page.jsx"


def save(p, s):
    tmp = p + ".new"
    open(tmp, "w").write(s)
    shutil.move(tmp, p)


# ---------------------------------------------------------------- controller
CONTROLLER = r'''const db = require("../../config/db");
const sendMail = require("../../services/mail");

// Events Brevo posts for transactional email (see Brevo -> Transactional -> Settings -> Webhook).
const BAD_EVENTS = new Set(["hard_bounce", "soft_bounce", "blocked", "spam", "invalid_email", "error", "deferred", "unsubscribed"]);
const ALERT_GAP_MS = 30 * 60 * 1000; // at most one alert mail per 30 minutes
let lastAlertAt = 0;

const ensureTable = (() => {
  let done = null;
  return () => {
    if (!done) {
      done = db.query(
        "CREATE TABLE IF NOT EXISTS email_events (" +
          "id BIGSERIAL PRIMARY KEY, event TEXT NOT NULL, email TEXT, subject TEXT, message_id TEXT, " +
          "reason TEXT, event_at TIMESTAMPTZ NOT NULL DEFAULT now(), raw JSONB);" +
          "CREATE INDEX IF NOT EXISTS email_events_event_at ON email_events(event_at);"
      ).catch((e) => { done = null; throw e; });
    }
    return done;
  };
})();

const setStatus = (key, value) =>
  db.query(
    "INSERT INTO system_status(key,value,updated_at) VALUES(:key,:value,now()) " +
      "ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value, updated_at=now()",
    { replacements: { key, value: String(value).slice(0, 300) } }
  ).catch(() => {});

const alertRecipients = () =>
  String(process.env.EMAIL_ALERT_TO || process.env.DEVELOPER_EMAILS || "")
    .split(",").map((s) => s.trim()).filter(Boolean);

const maybeAlert = async (ev) => {
  if (!BAD_EVENTS.has(ev.event)) return;
  const now = Date.now();
  if (now - lastAlertAt < ALERT_GAP_MS) return;
  const to = alertRecipients();
  if (!to.length) return;
  lastAlertAt = now;
  try {
    await sendMail({
      to: to.join(","),
      subject: `Taiyari NEET ki: email ${ev.event} for ${ev.email || "unknown"}`,
      viewFileName: "pages/email.alert",
      content: {
        event: ev.event,
        email: ev.email || "-",
        subject: ev.subject || "-",
        reason: ev.reason || "-",
        at: new Date().toISOString(),
      },
    });
  } catch (e) {
    lastAlertAt = 0;
    setStatus("email_alert", "send failed: " + String(e.message || e).slice(0, 80));
  }
};

// POST /api/v1/webhooks/brevo?token=...   (Brevo may send one object or an array)
const brevoWebhook = async (req, res) => {
  const expected = process.env.BREVO_WEBHOOK_TOKEN || "";
  if (!expected || req.query.token !== expected) {
    return res.status(401).json({ ok: false });
  }
  // Answer at once; Brevo retries on anything that is not 2xx.
  res.status(200).json({ ok: true });

  const items = Array.isArray(req.body) ? req.body : [req.body || {}];
  try {
    await ensureTable();
    for (const raw of items) {
      const ev = {
        event: String(raw.event || "unknown").toLowerCase(),
        email: raw.email || null,
        subject: raw.subject || null,
        messageId: raw["message-id"] || raw.messageId || null,
        reason: raw.reason || null,
      };
      await db.query(
        "INSERT INTO email_events(event,email,subject,message_id,reason,event_at,raw) " +
          "VALUES(:event,:email,:subject,:messageId,:reason,:at,CAST(:raw AS jsonb))",
        {
          replacements: {
            ...ev,
            at: raw.ts_epoch ? new Date(Number(raw.ts_epoch)) : new Date(),
            raw: JSON.stringify(raw).slice(0, 8000),
          },
        }
      );
      await setStatus("email_last_event", `${ev.event} ${ev.email || ""}${ev.reason ? " - " + ev.reason : ""}`);
      await maybeAlert(ev);
    }
  } catch (e) {
    console.error("brevo webhook: %s", e.message || e);
  }
};

module.exports = brevoWebhook;
'''
os.makedirs(BASE + "/src/controllers/webhook", exist_ok=True)
save(BASE + "/src/controllers/webhook/brevo.js", CONTROLLER)

# ---------------------------------------------------------------- route
p = BASE + "/src/routes/webhook/index.js"
s = open(p).read()
if "brevoWebhook" not in s:
    s = s.replace(
        'const razorpayWebhookV1 = require("../../controllers/webhook/razorpay");',
        'const razorpayWebhookV1 = require("../../controllers/webhook/razorpay");\n'
        'const brevoWebhook = require("../../controllers/webhook/brevo");',
    )
    s = s.replace(
        'router.route("/razorpay").post(razorpayWebhookV1);',
        'router.route("/razorpay").post(razorpayWebhookV1);\n'
        '// Brevo email delivery events (delivered / bounce / blocked / spam ...).\n'
        'router.route("/brevo").post(brevoWebhook);',
    )
    assert "brevoWebhook" in s and '"/brevo"' in s, "route anchors"
    save(p, s)

# ---------------------------------------------------------------- health counts
p = BASE + "/src/routes/health/index.js"
s = open(p).read()
if "email24h" not in s:
    old = "  } catch (e) {\n    try {\n      await db.query(\"SELECT 1\");"
    new = '''    // Email delivery over the last 24 hours, from Brevo webhook events.
    try {
      const [ev] = await db.query(
        "SELECT event, count(*)::int AS n FROM email_events WHERE event_at > now() - interval '24 hours' GROUP BY event"
      );
      out.email24h = {};
      for (const r of ev) out.email24h[r.event] = r.n;
    } catch (_) {
      out.email24h = null; // table not created yet (no webhook event received so far)
    }
  } catch (e) {
    try {
      await db.query("SELECT 1");'''
    assert old in s, "health anchor"
    save(p, s.replace(old, new))

# ---------------------------------------------------------------- alert template
TEMPLATE = """<html lang="en">
  <head><meta charset="UTF-8" /><title>Email delivery problem</title></head>
  <body style="margin:0;padding:24px;background:#fff8e8;font-family:Arial,Helvetica,sans-serif;color:#1d1b16;">
    <div style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:12px;padding:28px 24px;border:1px solid #f1e3bf;">
      <p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#d98b0a;font-weight:bold;">Taiyari NEET ki</p>
      <h1 style="margin:0 0 12px;font-size:20px;color:#16213e;">Email delivery problem: {{event}}</h1>
      <table style="font-size:14px;line-height:1.6;border-collapse:collapse;">
        <tr><td style="color:#6d665a;padding-right:14px;">Recipient</td><td>{{email}}</td></tr>
        <tr><td style="color:#6d665a;padding-right:14px;">Subject</td><td>{{subject}}</td></tr>
        <tr><td style="color:#6d665a;padding-right:14px;">Reason</td><td>{{reason}}</td></tr>
        <tr><td style="color:#6d665a;padding-right:14px;">Time (UTC)</td><td>{{at}}</td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:13px;line-height:1.5;color:#6d665a;">Brevo reported this event. Details and 24-hour counts: admin portal &rarr; System Health. Alerts are sent at most once every 30 minutes.</p>
    </div>
  </body>
</html>
"""
os.makedirs(BASE + "/src/views/pages", exist_ok=True)
save(BASE + "/src/views/pages/email.alert.handlebars", TEMPLATE)

# ---------------------------------------------------------------- .env
p = BASE + "/.env"
s = open(p).read()
if "BREVO_WEBHOOK_TOKEN=" not in s:
    token = secrets.token_urlsafe(24)
    s = s.rstrip("\n") + "\n# Brevo delivery-event webhook (URL registered in Brevo carries this token)\nBREVO_WEBHOOK_TOKEN=" + token + "\n"
if "EMAIL_ALERT_TO=" not in s:
    s = s.rstrip("\n") + "\n# Who gets bounce/blocked/spam alerts from the webhook\nEMAIL_ALERT_TO=laksmeh84@gmail.com\n"
save(p, s)
token = re.search(r"^BREVO_WEBHOOK_TOKEN=(.*)$", s, re.M).group(1).strip()
open("/root/tyari-neet-ios/.brevo_webhook_url", "w").write(
    "https://api.taiyarineetki.com/api/v1/webhooks/brevo?token=" + token + "\n")

# ---------------------------------------------------------------- portal card
s = open(PORTAL).read()
if "Email Delivery" not in s:
    s = s.replace(
        "AlertTriangle, RefreshCw, KeyRound } from \"lucide-react\";",
        "AlertTriangle, RefreshCw, KeyRound, MailCheck } from \"lucide-react\";",
    )
    old_vars = "  const smtpWarn = smtpDays !== null && smtpDays > 0 && smtpDays <= 30;\n"
    new_vars = old_vars + """  const em = data?.email24h;
  const emDelivered = em ? (em.delivered || 0) + (em.request || 0) : 0;
  const emBad = em ? (em.hard_bounce || 0) + (em.soft_bounce || 0) + (em.blocked || 0) + (em.spam || 0) + (em.invalid_email || 0) + (em.error || 0) : 0;
  const emLast = st.email_last_event;
  const emDetail = !em
    ? "No delivery events yet (Brevo webhook reports delivered / bounced / blocked here)"
    : (em.delivered || 0) + " delivered, " + emBad + " failed in last 24h" + (emLast ? " — last: " + emLast.value + " (" + fmtAgo(emLast.updatedAt) + ")" : "");
"""
    assert old_vars in s, "portal vars anchor"
    s = s.replace(old_vars, new_vars)
    old_card = "        <StatusCard icon={AlertTriangle} title=\"Last Incident\""
    new_card = """        <StatusCard icon={MailCheck} title="Email Delivery (24h)" ok={!!em && emBad === 0} warn={!em || (emBad > 0 && emBad < 5)}
          detail={emDetail} />
""" + old_card
    assert old_card in s, "portal card anchor"
    s = s.replace(old_card, new_card, 1)
    save(PORTAL, s)

print("patched; webhook URL saved to /root/tyari-neet-ios/.brevo_webhook_url")
