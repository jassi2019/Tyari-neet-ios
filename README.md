# Taiyari NEET Ki

India's best NEET preparation app — free study material, 10,000+ MCQs, chapter-wise notes for Physics, Chemistry & Biology.

## Tech Stack

- **Mobile App:** React Native + Expo (EAS Build)
- **Backend:** Node.js + Express + PostgreSQL (Sequelize ORM)
- **Admin Portal:** Next.js (App Router) + Tailwind CSS + shadcn/ui
- **Deployment:** Docker + Docker Compose on Hostinger VPS
- **Payments:** Razorpay (Android) + Apple IAP (iOS)
- **Content:** Direct PDF upload system (stored on VPS)
- **Email:** Nodemailer + Gmail SMTP
- **SMS:** Twilio (Phone OTP for password reset)

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
│   ├── backup-db.sh            # Daily PostgreSQL → GitHub backup
│   └── setup-backup-repo.sh    # One-time VPS backup setup
├── docker-compose.prod.yml     # Production Docker setup
├── Caddyfile                   # Caddy reverse proxy + SSL config
└── eas.json                    # EAS Build configuration
```

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
- Light theme dashboard with daily auto-changing accent color
- Class, Subject, Chapter, Topic, Question CRUD management
- **Home Content CMS:** Manage features, tests, hero banner, footer from admin panel — reflects live in app
- PDF upload for content management (replaces Canva)
- Members section to view all registered users
- SEO-optimized public landing page at root domain

### Backend API
- JWT authentication (180-day tokens)
- Single device session management
- Email OTP via Nodemailer + Gmail SMTP
- Phone OTP via Twilio SMS (password reset)
- Razorpay order creation & signature verification
- Apple IAP receipt verification
- Purchase invoice emails (student + admin)
- Gzip compression for faster responses
- Swagger API documentation at `/api-docs`

### Database Backups
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

# SMTP (Email OTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASSWORD=<app_password>
SMTP_FROM=<gmail>

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
- **SMTP:** Gmail with App Password (not regular password)
- **Templates:** `backend-main/src/views/billing/`
  - `invoice.handlebars` — buyer receipt
  - `purchase.notification.handlebars` — admin notification

## URLs
- **Landing Page:** https://taiyarineetki.com
- **Admin Panel:** https://taiyarineetki.com/admin
- **API:** https://api.taiyarineetki.com
- **API Docs:** https://api.taiyarineetki.com/api-docs
- **Play Store:** https://play.google.com/store/apps/details?id=com.taiyarineetki.app
- **App Store:** https://apps.apple.com/app/taiyari-neet-ki/id6740091521

## Recent Changes

### Feature Content System (NEW - Separate Database)
- 7 feature types: Explanation, Revision Recall, Hidden Links, Exercise Revival, Master Exemplar, PYQs, Chapter Checkpoint
- Each has its own data in `feature_contents` table (NOT mixed with Topics)
- Admin manages from sidebar → Feature Content sections
- App shows "Coming Soon!" when no content added yet
- Content appears in app as soon as admin adds it

### App Navigation Flow
```
Subject (Choose your subject)
  → Class Popup (Select Your Class)
    → Lesson Screen (Pick a Lesson)
      → Topic Screen (Chapter 1 · topic name)
        → Content (PDF / HTML / Coming Soon)
```

### Members Management (Admin)
| Action | Icon | Description |
|--------|------|-------------|
| View | Eye (blue) | User details + subscription history |
| Edit | Pencil (yellow) | Edit name, email, phone, bio |
| Grant | Gift (green) | Grant subscription (select plan, end date) |
| Revoke | XCircle (orange) | Revoke active subscription |
| Delete | Trash (red) | Delete user account |

### PDF Upload System
- Admin uploads PDFs via admin panel → stored on VPS at `/app/uploads/`
- Served at `https://api.taiyarineetki.com/uploads/<filename>.pdf`
- Mobile app renders PDFs inline via Google Docs Viewer
- Max file size: 50MB
- Storage: Docker named volume `uploads_data`

### Study Time Tracking
- Real timer tracks actual study time (not estimates)
- Timer starts when user opens content, stops when they leave
- Total time + daily time tracked
- Persisted in AsyncStorage (survives app restart)
- Daily time resets at midnight

### Admin Portal Theme
- Light theme (white background)
- Daily auto-changing accent color (Mon-Sun: Indigo, Teal, Orange, Rose, Sky Blue, Purple, Green)

### API Endpoints (New)

#### Feature Content
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/feature-content?featureType=explanation` | Get feature content |
| POST | `/api/v1/feature-content` | Create content (admin) |
| PUT | `/api/v1/feature-content/:id` | Update content (admin) |
| DELETE | `/api/v1/feature-content/:id` | Delete content (admin) |

#### File Uploads
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/uploads` | Upload PDF (admin, max 50MB) |
| DELETE | `/api/v1/uploads/:filename` | Delete file (admin) |

#### User Management (Admin)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/v1/users?page=1&limit=20&search=` | List users |
| PUT | `/api/v1/users/admin/:userId` | Edit user |
| DELETE | `/api/v1/users/admin/:userId` | Delete user |
| POST | `/api/v1/subscriptions/admin/grant` | Grant subscription |
| PUT | `/api/v1/subscriptions/admin/revoke/:id` | Revoke subscription |

### Docker Volumes
```
postgres_data    # PostgreSQL database
caddy_data       # SSL certificates
caddy_config     # Caddy configuration
uploads_data     # Uploaded PDF files
```
