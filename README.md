# Taiyari NEET Ki

India's best NEET preparation app — free study material, MCQs, chapter-wise notes for Physics, Chemistry & Biology.

## Tech Stack

- **Mobile App:** React Native + Expo (EAS Build)
- **Backend:** Node.js + Express + PostgreSQL (Sequelize ORM)
- **Admin Portal:** Next.js (App Router) + Tailwind CSS + shadcn/ui
- **Deployment:** Docker + Docker Compose on Hostinger VPS
- **Payments:** Razorpay (Android) + Apple IAP (iOS)
- **Content:** Canva Connect API for design thumbnails
- **Email:** Nodemailer via Brevo SMTP relay (free plan, 300 emails/day); sender `dahiyaakanksha055@gmail.com` verified in Brevo
- **SMS:** Twilio (Phone OTP for password reset)

## Source of truth, releases and operations (read this first)

### Where the code lives
- **This GitHub repo** (`jassi2019/Tyari-neet-ios`, branch `main`) holds the **mobile app**, the release script and a copy of the server ops scripts (`ops/`).
- **`backend-main/`, `portal-main/`, `Caddyfile` and `docker-compose.prod.yml` are NOT in this repo.** As of 2026-10-12 their source lives only on the production server, in a clone that has its own git history (unrelated to this repo's `main`) plus uncommitted and untracked changes. Admin-portal and API changes are made and deployed there by rebuilding the containers. Treat the server copy as the only copy and back it up before risky work; the daily backup below covers the **database**, not this source code.
- SSH access to the VPS is key-based; connection details are kept privately, not in this repo.

### Releasing app updates (OTA)
App fixes ship to users over the air with EAS Update. Always use the guard script (run it in **Git Bash**, not PowerShell):

```bash
bash scripts/safe-release.sh "short release message"
```

It aborts before publishing anything unless all of these pass:
1. `runtimeVersion` in `app.json` is back at `1.0.8` (catches an aborted earlier run)
2. `Payment.tsx` and `Plans.tsx` are unmodified (payment screens must never change)
3. No secrets in the diff or in untracked files
4. No **new** TypeScript errors compared with the last commit, and none of the crash-class errors at all: undefined name, missing module or export, duplicate declaration, syntax error (`src/tests/` is excluded; other error kinds such as `TS2339` are only compared with the baseline) - see "Why a crash shipped" below
5. The JS bundle exports cleanly

It then publishes to both EAS branches (`production`, `preview`) on all three runtimes (`1.0.8` is every build from versionCode 26 on, which carries the extra native modules; `1.0.7` is the internal preview APK and the 6 Sep 2026 iOS builds; `1.0.6` is the older Android store builds and the current iOS store build), restores `runtimeVersion` to `1.0.8`, commits modified tracked files to git (`git add -u`; **new files must be `git add`ed by you**), and prints a per-runtime rollback command (`npx eas update:republish --group <id>`). Run `git push origin main` afterwards so GitHub matches what is live. Ctrl+C at any point restores your uncommitted work and `runtimeVersion`.

Channels: Play Store and App Store builds use channel `production`. Android store builds from versionCode 26 are runtime 1.0.8, older ones 1.0.6; iOS store builds exist on 1.0.6 and 1.0.7, so check the runtime of a build before publishing. JS that uses a module only present in 1.0.8 builds (see "Native modules reserved for future features") must be guarded so the 1.0.6/1.0.7 bundles do not crash, or those runtimes must be dropped from the script. The internal preview APK uses channel `preview` (runtime 1.0.7). A fix published only to `production` never reaches preview devices, which is why the script publishes to both.

### Why a crash shipped, and what prevents it now
Users saw `ReferenceError: Property 'showUnlockAnim' doesn't exist` when opening a subject. A refactor left one reference to a state variable that no longer existed in `FeatureContent.tsx`. `tsc` reported it (`TS2552: Cannot find name`), but the old check only compared the *number* of TypeScript errors with a baseline, so a known error never blocked a release. Later the fix was shipped over the air but never committed, and the next store build, made from git, brought the bug back.

Prevention now: undefined-name class errors are always fatal in `safe-release.sh`, and a successful release commits its changes so git always equals what is live. The app's `ErrorBoundary` also self-heals: after a crash it checks for a newer OTA update once per session, downloads it and reloads (only when a newer update exists, so it cannot reload-loop).

### Fresh installs and store builds
How an update reaches a phone now (builds from versionCode 26, runtime 1.0.8):
- **First launch after install:** `fallbackToCacheTimeout: 5000` makes the app wait up to 5 s for the newest OTA update and start on it, so a fresh install does not show the older bundle embedded in the store build. On a very slow network the embedded bundle runs once and the update is used from the next launch.
- **While the app is in use:** `src/hooks/useBackgroundUpdate.ts` checks for a newer update when the app opens and whenever it returns to the foreground (at most once every 10 minutes), downloads it silently and then **reloads onto it immediately**, unless the user is on a screen where a restart would lose work: payment (`Payment`, `PayUCheckout`, `Plans`, `SubscriptionMessage`), a test in progress (`TestMCQ`), an open lesson (`TopicContent`, `FeatureContent`) or an auth/OTP step. In that case the reload fires at the next screen change or foreground return. The current screen is read through `src/navigation/navigationRef.ts`, which `App.tsx` registers; it imports nothing from `@react-navigation` on purpose (that package trips the repo's module-resolution type errors). A reload cannot loop: after it, the check compares against the now-running update and reports nothing newer.
- **After a crash:** the `ErrorBoundary` self-heal and the TRY AGAIN button fetch a newer update and reload.

Older builds (versionCode 22 to 25, `fallbackToCacheTimeout: 0`) still run the embedded bundle on the first launch and apply a downloaded update only on the next cold start, so on those the user may have to close the app completely and open it again. Consequences that still apply to them:
- Verified on 2026-10-12 by requesting the manifest and downloading the real bundle exactly as a phone does, for all four channel/runtime pairs (production and preview, 1.0.6 and 1.0.7): every one is clean. Users who still see the error are running an old bundle, not receiving a bad one.
- Each store build embeds whatever JS existed when it was cut, so a fresh install shows that older behaviour on its first launch (see the build table below). On 2026-10-17 a freshly installed phone showed this (seen in a screen recording): Canva's toolbar (zoom, "...", fullscreen), the Share / Report overlay, Canva's Report page opening inside the app, and "Copy link" giving a URL that opened the whole design in Chrome. This matches the embedded bundle of an older store build running before the OTA update was applied.
- Before building a new store build: working tree clean, `HEAD` equal to what was last published and pushed, bump `versionCode`, keep `runtimeVersion` `1.0.8`, and run `npx tsc --noEmit` and check for undefined names. Do not touch `Payment.tsx`, `Plans.tsx` or the Razorpay config.

### Android store builds, R8 and Play rollout

| versionCode | Cut from | What its embedded JS has | Notes |
|---|---|---|---|
| 22 | `283cb04` (4 Sep 2026) | still has the `showUnlockAnim` crash | do not use |
| 23 | `c5472d5` | crash fixed, premium gates, language-proof Canva hide | no Canva guard (fullscreen / More / Share / Report still visible on a fresh install) |
| 24 | `e980379` | same JS as 23 | built with R8 (`production-r8` profile); not for production until a Razorpay test payment passes on an internal testing track |
| 25 | `ddd3013` | everything above plus the Canva guard, share/report navigation block and update-heal | superseded by 26 |
| 26 | `75aa074` | same JS as 25 plus the brand loader and the immediate-update logic; **waits up to 5 s for the newest OTA on launch** (`fallbackToCacheTimeout: 5000`), so a fresh install starts on the latest published bundle; runtime `1.0.8` with the native modules below. Verified on 2026-10-20: no `showUnlockAnim`, Canva guard, loader, 5000 ms wait, all modules present, upload-key signature | **the build to upload, at 100% rollout** |

All of them target API 36 (Android 16, set by `plugins/withAndroidSdk36.js`), min API 24, channel `production`, and are signed with the Play upload key. Play Console's "update your target API level" notice is satisfied by these builds; its "no deobfuscation file" notice is only a suggestion.

**Native modules reserved for future features (present from versionCode 26, runtime 1.0.8):** a module that is not in the store build cannot be added over the air, so these were included ahead of need. None is used by the JS yet; a feature built on one ships as a normal OTA.

| Package | What it allows later |
|---|---|
| `expo-screen-orientation` | landscape lesson viewer (bigger Canva slides) |
| `@react-native-community/netinfo` | offline detection, friendlier OTP / loading messages |
| `expo-notifications` | push notifications (needs a Firebase `google-services.json` in the build before Android push can register) |
| `expo-video` | video lessons |
| `expo-file-system`, `expo-sharing` | downloads and sharing of notes / PDFs |
| `expo-haptics`, `expo-clipboard` | small UX details |
| `@sentry/react-native` | crash reporting; add `Sentry.init({ dsn })` in JS once an account exists (the Expo config plugin was deliberately not added, it needs an auth token at build time) |

**Build:** `npx eas build --platform android --profile production` (normal) or `--profile production-r8` (R8). Bump `android.versionCode` in `app.json` first, commit, and build from a clean tree so the embedded bundle equals what is in git. Check the finished `.aab`: no `showUnlockAnim`, the fixes you expect are present in `base/assets/index.android.bundle`, `targetSdkVersion` 36, and the signer SHA1 matches the upload key registered in Play Console (App signing page).

**R8 (optional):** `plugins/withAndroidR8.js` does nothing unless the build is started with `ENABLE_R8=1`, which the `production-r8` profile in `eas.json` sets. It sets `android.enableMinifyInReleaseBuilds` (the property this Expo SDK reads, unlike `enableProguardInReleaseBuilds`) and appends keep rules for Razorpay, Play Billing, the Nitro IAP module, JavaScriptInterface bridges and React Native/Hermes entry points. Resource shrinking stays off. R8 only touches Java/Kotlin code, never the JS bundle or OTA updates, and the AAB then contains the mapping file Play Console asks for. Static checks cannot prove the Razorpay callbacks still fire: test a payment on an internal testing track before any production rollout.

**Rollout:** release to production as a staged rollout (20%, then 50%, then 100%) and watch Play Console > Android vitals (crashes and ANRs) between steps. The percentage can only be raised or halted, not lowered. A native-identical build (same libraries, same plugins) carries little extra risk because users already run the same JS through OTA.

### Server reliability and backups (production VPS)
Scripts are kept in `ops/` (copies of the files on the VPS; cron entries in `ops/crontab.example`).
- **Watchdog** (`ops/watchdog.sh`, every 3 minutes): checks Postgres, the backend (inside its container), the portal and the public HTTPS URL. It restarts only what is broken, brings the stack back if a container exited, and prunes Docker images and build cache if the disk passes 85% (never volumes or data). Log: `/root/tyari-neet-ios/watchdog.log`.
- **SMTP key expiry check** (`ops/smtp_key_check.py`, 04:00 UTC daily): see "Email delivery (OTP) and the Brevo key".
- **Daily DB backup** (`ops/db_backup.sh`, 03:30): `pg_dump` to `/root/backups/education_app_YYYYMMDD.sql.gz` (last 7 kept) and the file is **emailed** (`ops/send_backup_mail.py`) to `ADMIN_EMAIL` and `DEVELOPER_EMAILS`. Above 20 MB it sends a notice instead of the attachment.
- **System Health page** in the admin portal (`/system-health`, refreshes every 30 s) shows API, database, watchdog heartbeat, last backup, disk use and the last auto-fixed incident. It reads `GET /api/v1/health`, which returns API and DB status plus the `system_status` table that the scripts write to.
- **Adding any new admin-portal route:** add a block to the `Caddyfile` and reload Caddy, otherwise the apex domain serves the marketing landing page instead of your page:
  ```
  handle /your-route* {
      reverse_proxy portal:3000
  }
  ```
  then `docker exec tyari-neet-ios-caddy-1 caddy reload --config /etc/caddy/Caddyfile`.
- **Known quirk:** `admin.taiyarineetki.com` redirects to `https://taiyarineetki.com/admin{uri}`, which gives a 404 for every page except the dashboard. Use `https://taiyarineetki.com/<page>` links.

### Email delivery (OTP) and the Brevo key
Until 2026-10-20 OTP mail went out through a personal Gmail account over Gmail SMTP. Gmail first delayed those messages and then blocked them outright ("Message blocked ... appears suspicious"): 20 OTPs bounced in one day, including test messages, so users could not register. Since 2026-10-20 the backend sends through **Brevo's SMTP relay** (`smtp-relay.brevo.com:587`, login is a Brevo SMTP login, not an email address) with the same verified sender address; no code change was needed beyond `src/services/mail.js` now using `SMTP_FROM` as the visible sender. The Brevo account is in the business's name (KARTAR ENTERPRISES, registered address from the GST record) on the free plan, 300 emails per day, which is far above the current 1-10 OTPs a day.

The mail itself was also made less spam-like: a named sender ("Taiyari NEET ki"), the code in the subject line, a plain-text part alongside the HTML, and separate registration / password-reset templates.

**The SMTP key expires every year** (user's choice; Brevo also expires a key after 90 days without use). The current key expires on **2027-10-20**. `ops/smtp_key_check.py` runs daily from cron, shows the days left on the System Health page ("Email (Brevo) Key" card) and emails the admins 30, 14, 7, 3 and 1 days before expiry and every day once expired. To rotate: Brevo → Settings → SMTP & API → generate a new SMTP key (1 year), put it in the backend `.env` as `SMTP_PASSWORD`, set `SMTP_KEY_EXPIRES=YYYY-MM-DD`, then `docker compose -f docker-compose.prod.yml up -d --force-recreate backend` (a plain restart does not reload `.env`). If the key lapses, OTP and password-reset emails stop and the daily backup email fails too.

Still open, optional: sending from a `taiyarineetki.com` address with DKIM/DMARC (Brevo flags a free-mail sender as "not recommended"); it needs DNS records on the domain.

## Project Structure

```
├── src/                    # React Native mobile app
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── Landing/        # App landing page (bg image + yellow theme)
│   │   │   ├── Login/          # Email + password login
│   │   │   ├── Register/       # Email registration with OTP
│   │   │   └── ForgotPassword/ # Password reset via email OTP
│   │   ├── main/
│   │   │   └── Home.tsx        # Home screen (CMS-driven content)
│   │   ├── Payment/            # Subscription & payments
│   │   └── Profile/            # User profile
│   ├── contexts/               # AuthContext with single-device login
│   ├── hooks/api/              # React Query API hooks
│   │   ├── auth.ts             # Auth mutations (login, register, OTP, reset)
│   │   └── homecontent.ts      # Home screen CMS content hook
│   ├── libs/                   # Razorpay, IAP wrappers
│   └── constants/              # Environment config
├── backend-main/               # Express.js backend API
│   ├── src/controllers/
│   │   ├── auth/               # All auth controllers
│   │   └── homecontent/        # Home content CRUD (create, get, update, delete)
│   ├── src/models/
│   │   ├── user.js             # User model
│   │   ├── homecontent.js      # Home content CMS model
│   │   └── ...                 # Other models
│   ├── src/routes/
│   │   ├── index.js
│   │   └── homecontent/        # /api/v1/home-content routes
│   ├── src/services/
│   │   ├── canva.js            # Canva Connect API
│   │   ├── mail.js             # Nodemailer email
│   │   ├── razorpay.js         # Razorpay payments
│   │   └── sms.js              # Twilio SMS
│   └── src/views/              # Handlebars email templates
├── portal-main/                # Next.js admin portal
│   └── src/app/
│       ├── page.jsx            # SEO-optimized public landing page
│       ├── admin/              # Admin dashboard
│       ├── auth/               # Admin login
│       ├── home-content/       # Home screen CMS management
│       ├── chapters/           # Chapter management
│       ├── subjects/           # Subject management
│       ├── topics/             # Topic management
│       └── questions/          # Question bank management
├── assets/                     # App images (hero-banner, footer, bg-image, logo)
├── scripts/
│   ├── safe-release.sh         # Guarded OTA release (checks, publish, commit, rollback hint)
│   ├── backup-db.sh            # Daily PostgreSQL → GitHub backup
│   └── setup-backup-repo.sh    # One-time VPS backup setup
├── ops/                        # Copies of VPS ops scripts: watchdog, daily backup + email, crontab
├── docker-compose.prod.yml     # Production Docker setup
├── Caddyfile                   # Caddy reverse proxy + SSL config
└── eas.json                    # EAS Build configuration
```

> `backend-main/`, `portal-main/`, `docker-compose.prod.yml` and `Caddyfile` are shown for reference but live only on the production VPS, not in this repo (see "Source of truth" above).

## Features

### Mobile App
- NEET subject-wise study material (Physics, Chemistry, Biology)
- Chapter & topic navigation with progress tracking
- Razorpay payments (Android) / Apple IAP (iOS)
- Single device login enforcement
- Guest mode for free content (iOS only)
- Screen capture protection
- Yellow theme (#FED93A) with image background on auth screens
- Home screen content managed live from admin panel (CMS)

### Auth Flow
- **Registration:** Email → OTP verification → Set password → Account created
- **Login:** Email + Password
- **Forgot Password:** Email → OTP → Reset password
- **Guest Mode:** iOS only, skip login for free content

### Admin Portal
- Dark theme dashboard with analytics
- Class, Subject, Chapter, Topic, Question CRUD management
- **Home Content CMS:** Manage features, tests, hero banner, footer from admin panel — reflects live in app
- Canva integration for content thumbnails
- SEO-optimized public landing page at root domain

### Backend API
- JWT authentication (180-day tokens)
- Single device session management
- Email OTP via Nodemailer + Gmail SMTP
- Phone OTP via Twilio SMS (password reset)
- Razorpay order creation & signature verification
- Apple IAP receipt verification
- Purchase invoice emails (student + admin)
- Canva OAuth token management with auto-renewal
- Gzip compression for faster responses
- Swagger API documentation at `/api-docs`

### Database Backups
> Current production setup: see **Server reliability and backups** above (daily 03:30 dump, emailed, last 7 kept; watchdog; System Health page). The GitHub-push backup described below is the older setup and is not in the production crontab.

- Daily automated PostgreSQL dump via cron (2 AM)
- Backup pushed to GitHub repo automatically
- Last 7 backups kept locally, last 30 on GitHub
- Setup: `bash scripts/setup-backup-repo.sh <github_token>`

## API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/register` | Register new user |
| POST | `/api/v1/auth/register/email/verification` | Send registration OTP |
| POST | `/api/v1/auth/register/otp/verification` | Verify registration OTP |
| POST | `/api/v1/auth/login` | Login with email & password |
| POST | `/api/v1/auth/reset/password` | Reset password (with token) |
| POST | `/api/v1/auth/reset/password/email/verification` | Send reset OTP (email) |
| POST | `/api/v1/auth/reset/password/otp/verification` | Verify reset OTP (email) |
| POST | `/api/v1/auth/reset/password/phone/verification` | Send reset OTP (phone) |
| POST | `/api/v1/auth/reset/password/phone/otp/verification` | Verify reset OTP (phone) |

### Home Content CMS
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/home-content` | Get active content (public, used by app) |
| GET | `/api/v1/home-content/all` | Get all content (admin only) |
| POST | `/api/v1/home-content` | Create content item (admin only) |
| PUT | `/api/v1/home-content/:id` | Update content item (admin only) |
| DELETE | `/api/v1/home-content/:id` | Delete content item (admin only) |

Sections: `feature` | `test` | `hero` | `footer`

### Subscriptions & Payments
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/subscriptions/create-order` | Create Razorpay order (auth) |
| POST | `/api/v1/subscriptions` | Verify signature + create subscription (auth) |
| POST | `/api/v1/subscriptions/iap/apple` | Apple IAP receipt verification (auth) |
| POST | `/api/v1/webhooks/razorpay` | Razorpay webhook (HMAC-SHA256 verified) |

### Questions / MCQ
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/questions?chapterId=&subjectId=&classId=` | Fetch questions for a chapter |
| POST | `/api/v1/questions` | Create question (admin only) |
| PUT | `/api/v1/questions/:id` | Update question (admin only) |
| DELETE | `/api/v1/questions/:id` | Delete question (admin only) |

## Environment Variables

### Backend (.env)
```
NODE_ENV=production

# Database
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<password>
DB_NAME=education_app

# JWT
JWT_SECRET=<secret>

# Razorpay (Android Payments)
RAZORPAY_KEY_ID=<razorpay_key>
RAZORPAY_KEY_SECRET=<razorpay_secret>
RAZORPAY_WEBHOOK_SECRET=<webhook_secret>

# Apple IAP (iOS Payments)
APPLE_SHARED_SECRET=<apple_secret>
APPLE_BUNDLE_ID=com.taiyarineetki.educationapp

# SMTP (Email OTP) — Brevo relay
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_USER=<brevo_smtp_login>
SMTP_PASSWORD=<brevo_smtp_key>
SMTP_FROM=<verified_sender_email>
SMTP_SECURE=false
SMTP_KEY_EXPIRES=<YYYY-MM-DD, read by ops/smtp_key_check.py>

# Twilio (Phone OTP)
TWILIO_ACCOUNT_SID=<twilio_sid>
TWILIO_AUTH_TOKEN=<twilio_token>
TWILIO_PHONE_NUMBER=<twilio_number>

# Canva
CANVA_CLIENT_ID=<canva_client_id>
CANVA_CLIENT_SECRET=<canva_secret>
CANVA_AUTH_REDIRECT_URI=<redirect_uri>

# Developer
DEVELOPER_EMAILS=<admin_emails>
ALLOW_DEV_OTP=false
```

### App (.env)
```
EXPO_PUBLIC_BACKEND_URL=https://api.taiyarineetki.com
EXPO_PUBLIC_RAZORPAY_KEY_ID=<razorpay_key>
```

## Deployment

### VPS (Docker)
```bash
cd /opt/app
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Mobile Builds
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

### Database Backup Setup (run once on VPS)
```bash
bash scripts/setup-backup-repo.sh <github_personal_access_token>
```

## Razorpay Setup

### 1. Configure Live Keys (after KYC complete)
In `backend-main/.env`:
```
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=<random_strong_secret>
```

### 2. Add Webhook in Razorpay Dashboard
- **URL:** `https://api.taiyarineetki.com/api/v1/webhooks/razorpay`
- **Secret:** same as `RAZORPAY_WEBHOOK_SECRET` in `.env`
- **Active Events:** `payment.captured`, `payment.failed`

Test mode and live mode webhooks are separate — configure both.

### 3. Recreate Backend Container
```bash
cd /opt/app
docker compose -f docker-compose.prod.yml down backend
docker compose -f docker-compose.prod.yml up -d backend
```
> `restart` alone does not reload `.env` — use `down` + `up`.

### 4. End-to-End Test Script
```bash
docker compose -f docker-compose.prod.yml exec \
  -e TEST_EMAIL=user@example.com \
  -e TEST_PASSWORD='your_password' \
  -e TEST_API_BASE=http://localhost:8000 \
  backend node test-payment-flow.js
```
Tests login → plan fetch → order create → signature verify → subscription create → webhook delivery → DB state. All 7 steps must pass before the mobile app payment flow works.

## Email System
- **Buyer invoice:** sent to user's registered email with payment receipt
- **Admin notification:** sent to all addresses in `DEVELOPER_EMAILS` (comma-separated)
- **SMTP:** Brevo relay (see "Email delivery (OTP) and the Brevo key" above); `SMTP_EXTRA_ACCOUNTS` can list extra `login:password[:from]` accounts for round-robin sending
- **Templates:** `backend-main/src/views/billing/`
  - `invoice.handlebars` — buyer receipt
  - `purchase.notification.handlebars` — admin notification

## URLs
- **Landing Page:** https://taiyarineetki.com
- **Admin Panel:** https://taiyarineetki.com/admin
- **System Health:** https://taiyarineetki.com/system-health
- **API:** https://api.taiyarineetki.com
- **API Docs:** https://api.taiyarineetki.com/api-docs
- **Play Store:** https://play.google.com/store/apps/details?id=com.taiyarineetki.app
- **App Store:** https://apps.apple.com/app/taiyari-neet-ki/id6740091521

## Recent Changes (October 2026)

### Tests: per-test FREE / PREMIUM access
- `test_series.serviceType` (`FREE` | `PREMIUM`, default `PREMIUM`). The admin Test Series form has an **Access** dropdown and each card shows a FREE/PREMIUM badge.
- App: a PREMIUM test needs an active paid subscription; guests and free users see "Premium Required" with a View Plans button. A FREE test opens for everyone, including guests. The test list is browsable by guests.
- Test-series, full-syllabus and daily chapter tests are premium-gated; feature-content MCQs follow the chapter's FREE/PREMIUM setting.

### Free content
- In free-only mode, chapters with `serviceType = LOCKED` are no longer listed (`isPremiumServiceType` does not treat `LOCKED` as premium, which is why they leaked).
- `Chapters`/`FeatureContent` accept `freeOnly`; the chapters API hook passes `freeOnly` and `featureType` and includes them in the query key.

### Admin portal: adding MCQs
- Question form: Feature Type dropdown (`chapter_checkpoint`, `revision_recall`, `exercise_revival`, `master_exemplar`, `pyq`) and an Explanation URL field. Without a feature type, questions were saved with `featureType = NULL` and never showed in the app.
- Next question keeps the last subject/class/chapter/feature type.
- Fixed lost input when adding several MCQs at once (stale state in Feature Content and Test Series).
- Feature Content: untouched blank rows are ignored; a row that is incomplete is reported by number ("Q2: need question text, Option A, Option B & correct answer"); a server error is reported separately; and the dialog stays open with your input after a partial failure.
- Feature Content and Test Series dialogs no longer close (and wipe the form) on outside click, Escape or scrollbar clicks. Use Cancel or the X.
- Plan prices shown in the app are `plans.amount` plus 18% GST. On iOS the amount Apple actually charges comes from App Store Connect, so keep the two in sync.

### Canva lesson viewer (supersedes earlier Canva branding notes below)
- Canva view URLs are loaded with `?embed` (Canva then serves its embed app, not the full viewer) and `Accept-Language: en-US` so the UI language is English.
- Canva renders client-side, so selectors must match its real DOM. Controls the embed app shows, found in its bundles and confirmed by rendering the real page in headless Chrome with the app's user agent (see "Verifying Canva changes" below):
  - logo link (`a.NHn7fw`, aria-label "Create with Canva", Hindi "Canva के साथ बनाएँ"), hidden by CSS in `PROTECT_JS`
  - fullscreen toggle `button[aria-label="Enter full screen"]` (the label never changes; the state is in `aria-pressed`), "Zoom in and out", "More" (`aria-haspopup="dialog"`) and "Enlarge"
  - the black dialog opened by "More" with round Share, Hide controls and Report buttons. These carry **no** `aria-label`: their text is in a sibling `<label>` referenced by `aria-labelledby`, so `[aria-label="Share"]` never matches them
  - Share leads to Copy link, Facebook, Pinterest and LinkedIn; Report opens `canva.com/report-content`
  - `<footer>` is **not** hidden; it is the per-slide caption
- `CANVA_GUARD_JS` (Canva sources only) hides all of the above by label text, `aria-labelledby` text, role (`dialog` plus its full-viewport backdrop) and a language-independent rule for a small fixed button in the bottom-right corner, and keeps hiding anything React mounts later with a debounced `MutationObserver` (childList only, so it cannot retrigger itself). It never touches `role="navigation"` or "Next/Previous page" buttons. `CANVA_BEFORE_JS` (best effort, runs before page scripts when the platform allows) makes `document.fullscreenEnabled` false so Canva never creates the fullscreen toggle.
- `isBlockedCanvaNavigation` (inside `onShouldStartLoadWithRequest`, Canva sources only) refuses top-frame navigations to the Canva home page, `/report-content`, `/login`, `/signup`, `mailto:`/`intent:`-style schemes and sharing sites (Facebook, Pinterest, LinkedIn, X/Twitter, WhatsApp, and similar).
- Text size: the layout viewport is narrowed to `innerWidth / 1.5` (about 1.5x larger text), pinch zoom is blocked with two-finger touch handlers and Android built-in zoom is off.
- No flash of branding: the WebView stays at opacity 0 behind a loader until 450 ms after load end (8 s safety timeout).
- A pasted Canva embed snippet (`<iframe src="https://www.canva.com/design/...">`) in a topic content slot is resolved to its URL so it uses the path above.
- Limits: Canva design links are public. Hiding Share / Copy link and blocking navigation removes the easy ways to get the URL out of the app, but anyone who already has a link can open it in a browser. Restricting who can view the design in Canva is the only real protection. Selectors can break when Canva redeploys; if a control reappears, take a photo or screen recording, find the element in Canva's embed bundle, and update `CANVA_GUARD_JS` in `src/components/PlatformWebView.tsx` (an OTA update is enough, no store build).

#### Verifying Canva changes
Render a real design in headless Chrome over the DevTools protocol (the `ws` package already in `node_modules` is enough), with the app's Android user agent, `Accept-Language: en-US` and a 360 px (or 240 px, after the font boost) viewport, list every `button`, `[role=button]`, `a` and `[role=dialog]`, inject the scripts extracted from `PlatformWebView.tsx`, wait a few seconds and list again. Do this before every Canva-related release; it found what static reading missed. Headless Chrome is a stand-in for Android WebView, so also test on a phone: fully close the app twice after an OTA so the new bundle is actually running.

### Loading screens
- `src/components/BrandLoader.tsx`: the mascot logo pulsing inside a spinning brand-yellow ring (React Native `Animated`, native driver, no new dependency). It replaced the plain `ActivityIndicator` on every full-screen loading state (app start, subjects, chapters, topics, topic content, feature content, tests, daily test, leaderboard, and the Canva viewer's reveal overlay). Small spinners inside buttons and the payment screens were left as they were.

### Reliability
- App: `ErrorBoundary` self-heal and immediate OTA apply (above). Server: watchdog, emailed daily backup, System Health page (above). Release: `scripts/safe-release.sh` (above).
- Server-side lesson page (`/api/v1/lesson`, backend `src/routes/lesson` and `src/middlewares/lessonRewrite.js`): an experiment that framed Canva in a server page so old embedded bundles would also get a clean viewer. It removed the toolbar and sharing paths but clipped the last lines of every design, so it is switched **off** (`LESSON_REWRITE=off` in the backend `.env`). The code stays for reference; the fix (no bottom clip, keep the layout width at or below 275 px) is recorded in the render report if it is ever needed.

## Recent Changes (August 29-30, 2026)

### Test Series — Admin Portal + Backend API (NEW)
- Full backend: models, controllers, routes for `test_series` + `test_series_questions`
- API: GET (public), POST/PUT/DELETE (admin only) at `/api/v1/test-series`
- Response flattens `TestSeriesQuestions[].Question` into `Questions[]` array for app compatibility
- Portal: new Test Series page with Daily/Weekly/Full Syllabus tabs
- Question picker (select from bank) + manual question creation inline
- Time limits: Daily=40min, Weekly=180min, Full Syllabus=180min (stored in seconds)

### Feature Content Isolation & Cleanup
- Backend `feature-content` GET now filters `isActive=true` by default (portal passes `includeInactive=true`)
- Deleted/inactive content no longer shows in app
- Each feature type only shows its own content — no cross-feature mixing
- DB cleanup: moved misplaced content (Question Practice → exercise_revival, Uttar Maala → hidden_links, Revision Recall Station → revision_recall)
- Cache staleTime reduced from 60s to 10s with `refetchOnMount: true`

### Explanation Feature — Viewer Only
- Explanation always opens Canva viewer directly, never shows MCQ popup
- Works regardless of `contentType` (canva_only, mcq_only, both)

### Revision Recall — Topic-based MCQ
- Topics list only shows topics that have MCQ questions attached (not all chapter topics)
- `topicId` exact match filter on backend (no OR NULL fallback)
- Portal: Topic dropdown in form (at form level, not per-question)
- Topic auto-restores when editing existing questions

### Hidden Links — Content-based Viewer
- Flow: Subject → Class → Chapter → Content list → Tap → Canva viewer directly (no MCQ popup)
- Content fetched from `feature_contents` table with `featureType=hidden_links`

### Exercise Revival / Master Exemplar / PYQ
- Flow: Subject → Class → Chapter → Content list → Tap → Popup (Explanation + MCQ options)
- `canva_only` content opens viewer directly
- `both`/`mcq_only` shows popup with available options
- Explanation button always visible (shows alert if URL not added)
- Portal: Explanation URL field now visible for ALL content types (was hidden for mcq_only)

### Chapter Checkpoint — Direct MCQ
- Flow: Subject → Class → Chapter → MCQ test directly
- Portal: sidebar link fixed, no topic dropdown (MCQ only)
- Questions stored directly in `questions` table with `featureType=chapter_checkpoint`

### Daily Test — featureType Mapping
- `featureType=daily_test` maps to questions with `featureType=NULL` (legacy chapter questions)
- Prevents orphan questions from showing in other features

### Image Support in MCQ
- Backend `imageURL` field now properly mapped to app's `questionImage` in `mapToMCQ`
- Portal: image upload button with preview on all MCQ forms
- Backend upload endpoint at `/api/v1/uploads/image`

### Timer — Test Series Only
- Timer only shows when `testSeriesId` is present
- Hidden for Revision Recall, Exercise Revival, and all other MCQ features

### Retry Button Fix
- TestResult passes all params (subjectId, classId, chapterId, featureType, featureContentId, topicId) back to TestMCQ

### Topics Restoration
- 1648 topics migrated from old database (`app-postgres-1`) to new database (`tyari-neet-ios-postgres-1`)
- `topicId` column added to `questions` table with FK reference

### Portal Fixes
- Test Series page: question picker + manual question builder
- Dialog width: `max-w-lg` default restored, test-series uses `!max-w-4xl`
- PDFUpload crash fix: HTML embed code no longer passed as `href`
- Card display: raw HTML embed shows "Canva embed link added" instead
- Topics page: broken image placeholder replaced with gradient + topic name
- Feature content cards: optional chaining on `.length` and `.map()` calls

### Hero Banner
- Removed "10,000+" from hero banner text

## Previous Changes (July 2026)

### Explanation Section — Topic-wise Canva Links
- New field `explanationCanvaURL` added to Topic model
- Admin page for managing topic explanation links: `/api/v1/topics/admin`
- Explanation flow: Subject → Class → Chapter → Content from feature_contents table
- Supports embed links, view links, short links, and HTML embed code (auto URL extraction)

### Revision Recall — Topic-wise MCQ Flow
- Flow changed: Subject → Class popup → Chapter → Topics list → Topic click → MCQ only
- `topicId` filter added to Questions API for per-topic MCQ filtering
- 4-step progress dots with breadcrumb

### Test Series — Complete Overhaul
- Admin panel: Test create/edit with Syllabus field, inline Questions management (add/edit/delete MCQs per test) with Canva link + Image fields
- App: Direct test list (no Subject/Class step) → Intro screen (questions, duration, syllabus, negative marking) → MCQ with countdown timer → Submit → Result with review
- Auto-duration: 1 question = 1 minute (if admin doesn't set)
- Negative marking: +4 correct, -1 wrong, 0 skipped
- Review: Each question shows correct/wrong status + explanation text
- Retry button properly passes testSeriesId
- Test series inject script for compiled admin panel (overlay approach, sidebar preserved)

### Leaderboard / Weekly Ranking
- Score automatically submitted to backend on test finish (`/api/v1/leaderboard/submit`)
- Monthly period support added
- Fallback to all-time data when current period has no entries
- Leaderboard shows ranking with scores, XP, tests played

### Content Isolation (No Mixing)
- `featureType` exact match filter — each section shows only its own content
- Compiled admin panel adds `_questions` suffix — backend handles both `pyq` and `pyq_questions`
- `featureType` saved properly on question create/update (was missing before)
- NULL featureType questions assigned to `general` — won't appear in any section

### Child MCQ (parentQuestionId Linking)
- "📝 MCQ" button injected into compiled admin panel question cards
- Inline expand with Add/Edit/Delete child MCQ form
- Canva Explanation Link + Image fields in child MCQ form
- `parentQuestionId` linking — each question has its own child MCQs, no mixing
- App: MCQ Zone in popup shows only child MCQs for that specific question

### Home Page — Explore Free Content
- Hero banner replaced with "Explore Free Content" card (dark navy + gold accent)
- "Explore Now" → Bottom sheet modal with all 7 feature modules
- Each module navigates to its respective FeatureContent screen

### Canva Content Improvements
- Branding removal: CSS + periodic JS scan (case-insensitive, partial match, parent cleanup)
- `canva.link` short URL support added
- HTML embed code auto-extraction (if admin pastes `<div>` tag, URL extracted automatically)
- Zoom block via touch events (not viewport meta — preserves font size)
- WebView matches original source code style (no scalesPageToFit, no textZoom override)

### Admin Panel Enhancements
- Test Series management injected into compiled panel (Daily/Weekly/Full Syllabus pages)
- Child MCQ inline management on all feature-content question pages
- Image + Canva link fields on all question forms
- Navigation between test series pages works without reload
- Sidebar stays visible on overlay pages

### Previous Changes

#### Payment & Webhook Hardening
- Razorpay webhook now verifies `x-razorpay-signature` (HMAC-SHA256) before processing
- Raw body captured on `/api/v1/webhooks/*` routes for signature verification
- 401 errors during payment now sign the user out and prompt fresh login
- Live + test mode keys must match between backend `.env` and the dashboard webhook

### Mobile App UX
- 3-step Test flow: type → subject → class → chapter (uses real DB UUIDs, not hardcoded strings)
- Library tab: Bookmarks + Notes (NCERT section removed)
- Test Result screen: inline answer review with correct/wrong highlighting
- Hero banner uses `aspectRatio: 16/9` + `contain` so it never crops on small devices
- Bottom nav Plus button opens Library tab
- Native Android `mipmap-*` icons regenerated from `assets/icon.png` via `expo prebuild`

### Content Protection & Anti-Piracy
- **Text copy/select fully disabled** on all content screens (CSS `user-select:none` + JS event blocking for copy/cut/paste/contextmenu + keyboard shortcut Ctrl+C/A/X/U blocked + clipboard API overridden + aggressive selection clearing every 100ms)
- **Canva branding removed** — logo, 3-dot menu, "Created with Canva" watermark, header/footer/toolbar all hidden via CSS + periodic JS DOM cleanup every 500ms
- **Screenshot & screen recording blocked** app-wide using `expo-screen-capture` (`usePreventScreenCapture` + `FLAG_SECURE` on Android)
- **Pinch zoom disabled** on content WebView (viewport meta `user-scalable=no` + touch event blocking)
- **WebView `textInteractionEnabled={false}`** for OS-level text selection blocking

### Android UI Fixes
- **Landing screen overlap fixed** — hero section and bottom card no longer overlap on Android; sizes dynamically adjusted per platform while iOS layout remains untouched
- **Android navigation bar auto-hide** — system nav bar hides automatically, shows on swipe (`expo-navigation-bar` immersive mode)
- **`decelerationRate` crash fix** — changed from `"fast"` (string) to `0.99` (number) to prevent `java.lang.String cannot be cast to java.lang.Double` on Android Fabric/New Architecture

### Revision Recall Station
- **"Choose Question Type" modal removed** from Revision Recall Station flow — chapter click now directly opens MCQ screen without showing the question type picker
- Other question-based features (Exercise Revival, Master Exemplar, PYQ, Chapter Checkpoint) still show the question type modal as before

### Test Series Feature (NEW)
- Backend: `test_series` + `test_series_questions` tables + CRUD API (`/api/v1/test-series`)
- Mobile: Daily/Weekly/Full Syllabus test click → Test list ("Test-1, Test-2...") → Test detail (syllabus + Start Test) → MCQ
- Subject/Class/Chapter selection removed from test flow
- TestMCQ updated to fetch questions from test series endpoint

### Exercise Revival / Exemplar / PYQ — New Question List Flow
- Backend: `exercise_questions` table + CRUD API (`/api/v1/exercise-questions`)
- Chapter click → Exercise questions list → Question click → Popup: "Explanation" (Canva link) + "MCQ Zone"
- Admin page: `https://api.taiyarineetki.com/api/v1/exercise-questions/admin`
- Same flow for exercise_revival, master_exemplar, pyq features

### Image Support in MCQs
- Question model: added `questionImage`, `optionAImage`, `optionBImage`, `optionCImage`, `optionDImage`, `explanationImage` fields
- Upload config: now accepts images (JPG/PNG/GIF/WebP) in addition to PDFs
- Image upload page: `https://api.taiyarineetki.com/api/v1/uploads/image-upload`
- TestMCQ: renders question/option images when available
- Admin panel: Image URL fields added to Add Question form

### Admin Panel Changes
- Question Type selector: only MCQ (Fill in Blank, Match, True/False removed)
- Image URL fields added to question forms (both Questions and Feature Content pages)
- Notification delete fix (FK constraint on notification_reads)
- Auto-login on Image Upload and Exercise Questions admin pages

### Bug Fixes
- React Hooks violation fixed in Chapters.tsx and Topics.tsx (hooks moved before conditional early returns)
- Progress bar height fixed across multiple screens (`height: '100%'` → fixed pixel values to prevent Fabric crash)
- Added missing `app-icon.png` asset
- SDK upgraded from 53 to 54 for Expo Go compatibility
- Docker containers set to `restart=always` on VPS for auto-recovery after server reboot
- Server SSH key setup for remote management
