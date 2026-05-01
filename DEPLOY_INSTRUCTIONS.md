# Deployment Instructions — v1.0.4

This release adds:
- Hero/footer banner image fixes
- Feature detail modal (popup on Home box click)
- Screen capture protection (iOS/Android)
- 7 isolated per-feature content slots per Topic (no mixing)
- Admin can manage hide/show for Home content sections
- OTA updates configured (`expo-updates` URL set in `app.json`)

---

## 1. Mobile App — iOS + Android Build & Submit (run on macOS)

### Prerequisites
- Node.js 18+
- `npm install -g eas-cli`
- `eas login` (use the `jassi2018` Expo account)
- Apple Developer account credentials
- Google Play service account (already configured in EAS if previous builds worked)

### Build & Submit

```bash
git clone <repo-url>
cd <repo>
npm install

# iOS production build (uploads to App Store Connect on submit)
eas build --platform ios --profile production
eas submit --platform ios --latest

# Android production build (uploads to Play Console on submit)
eas build --platform android --profile production
eas submit --platform android --latest
```

Build takes ~15-25 min in EAS cloud.

### Version

- App version: **1.0.4** (was 1.0.3)
- iOS buildNumber: **1.0.4**
- Android versionCode: **3**

### After Approval

Future JS-only changes can be pushed without rebuild:

```bash
eas update --branch production --message "your message"
```

App must be opened by user once for OTA to download in background.

---

## 2. Backend — Hostinger VPS

### Files Changed

- `backend-main/src/models/topic.js` — 7 new JSONB columns
- `backend-main/src/constants/index.js` — `FEATURE_TYPES` map
- `backend-main/src/controllers/topic/create.js`
- `backend-main/src/controllers/topic/update.js`
- `backend-main/src/controllers/topic/get.feature.content.js` (new)
- `backend-main/src/routes/topic/index.js` — new route
- `backend-main/scripts/add-feature-slot-columns.js` (new — DB migration)

### Deploy Steps (SSH to Hostinger)

```bash
# 1. Backup DB first (PostgreSQL example — adjust DB name/user)
pg_dump -U <db-user> -d <db-name> > /root/backup-$(date +%Y%m%d-%H%M).sql

# 2. Pull latest code
cd /path/to/backend-main
git pull origin main

# 3. Install any new deps
npm install

# 4. Run safe migration (idempotent — adds 7 nullable JSONB columns to topics)
node scripts/add-feature-slot-columns.js

# 5. Restart service (use whichever applies)
pm2 restart all          # if PM2
# OR
docker-compose restart   # if Docker
# OR
systemctl restart <service-name>

# 6. Verify
curl https://api.taiyarineetki.com/api/v1/health   # if health endpoint exists
pm2 logs --lines 50      # check for errors
```

### Sanity Checks

After restart:

- `GET /api/v1/home-content` — returns active items only (already works)
- `GET /api/v1/topics/:topicId/feature/explanation` — should return content slot or fall back to legacy `contentURL`
- Admin login at https://taiyarineetki.com/auth/login — Home Content page works (add/edit/delete/hide/show)

---

## 3. Admin Portal — Hostinger (or wherever portal-main runs)

### Files Changed

- `portal-main/src/components/custom/FeatureSlots.jsx` (new)
- `portal-main/src/app/topics/[topicId]/page.jsx` — embeds FeatureSlots

### Deploy Steps

```bash
cd /path/to/portal-main
git pull origin main
npm install
npm run build
pm2 restart portal-main      # or whatever service name
```

After deploy, admin can:

1. Go to **Topics → [Edit any topic]**
2. Scroll to bottom → **Feature Content Slots** section appears (7 cards)
3. For each feature (Explanation, Revision, Hidden Links, etc), set:
   - Content URL (Canva or external)
   - Canva Design ID (optional)
   - Thumbnail URL (optional)
   - Description (optional)
4. Empty slots fall back to topic's main content automatically.

---

## 4. App Behavior After All Deployments

### Without box click (legacy flow)
User: Library tab → Subject → Chapter → Topic → Content
Result: Shows topic's main `contentURL` (unchanged).

### With box click (new flow)
User: Home → click feature box (e.g., "Explanation") → modal → "Start Learning"
→ Subject → Chapter → Topic
Result: Shows ONLY the Explanation slot's content. If admin hasn't filled
that slot, falls back to topic's main content. No mixing between features.

### Hide/show from admin
Admin Home Content page → toggle Eye icon → mobile reflects within 30s
(cache window).

---

## 5. Rollback (if anything breaks)

### Backend
```bash
cd /path/to/backend-main
git revert HEAD
npm install
pm2 restart all
```

The 7 new columns are nullable — they don't break existing rows. No DB rollback needed unless you want to drop columns:

```sql
ALTER TABLE topics
  DROP COLUMN IF EXISTS "explanationContent",
  DROP COLUMN IF EXISTS "revisionRecallContent",
  DROP COLUMN IF EXISTS "hiddenLinksContent",
  DROP COLUMN IF EXISTS "exerciseRevivalContent",
  DROP COLUMN IF EXISTS "masterExemplarContent",
  DROP COLUMN IF EXISTS "pyqContent",
  DROP COLUMN IF EXISTS "chapterCheckpointContent";
```

### Mobile
Previous version 1.0.3 is still in App Store / Play Store. Users on 1.0.3
keep working as-is.

---

## Contact

Issues during deployment: ping the project owner.
