# Taiyari NEET Ki

NEET preparation mobile app with admin portal and backend API.

## Tech Stack

- **Mobile App:** React Native + Expo (EAS Build)
- **Backend:** Node.js + Express + PostgreSQL (Sequelize ORM)
- **Admin Portal:** Next.js (App Router) + Tailwind CSS + shadcn/ui
- **Deployment:** Docker + Docker Compose on Hostinger VPS
- **Payments:** Razorpay (Android) + Apple IAP (iOS)
- **Content:** Canva Connect API for design thumbnails
- **Email:** Nodemailer + Gmail SMTP
- **SMS:** Twilio (Phone OTP for password reset)

## Project Structure

```
├── src/                    # React Native mobile app
│   ├── screens/            # App screens
│   │   ├── auth/           # Authentication screens
│   │   │   ├── Landing/    # Landing page with app branding
│   │   │   ├── Login/      # Email + password login
│   │   │   ├── Register/   # Email registration with OTP
│   │   │   └── ForgotPassword/ # Password reset via email OTP
│   │   ├── Home/           # Home screen
│   │   ├── Payment/        # Subscription & payments
│   │   └── Profile/        # User profile
│   ├── contexts/           # AuthContext with single-device login
│   ├── hooks/api/          # API hooks (React Query)
│   │   └── auth.ts         # Auth mutations (login, register, OTP, reset)
│   ├── libs/               # Razorpay, IAP wrappers
│   └── constants/          # Environment config
├── backend-main/           # Express.js backend API
│   ├── src/controllers/auth/
│   │   ├── login.js
│   │   ├── register.js
│   │   ├── registration.email.verification.js
│   │   ├── registration.otp.verification.js
│   │   ├── password.reset.email.verification.js
│   │   ├── password.reset.otp.verification.js
│   │   ├── password.reset.phone.verification.js
│   │   ├── password.reset.phone.otp.verification.js
│   │   └── reset.password.js
│   ├── src/models/         # Sequelize models (User, Otp, etc.)
│   ├── src/services/
│   │   ├── canva.js        # Canva Connect API
│   │   ├── mail.js         # Nodemailer email
│   │   ├── razorpay.js     # Razorpay payments
│   │   └── sms.js          # Twilio SMS service
│   ├── src/routes/         # Express routes
│   ├── src/utils/          # Billing, email, JWT utilities
│   └── src/views/          # Handlebars email templates
├── portal-main/            # Next.js admin portal
│   └── src/app/
│       ├── page.jsx        # Landing page (SEO optimized)
│       ├── admin/          # Admin dashboard
│       ├── auth/           # Admin login
│       ├── chapters/       # Chapter management
│       ├── subjects/       # Subject management
│       └── topics/         # Topic management
├── docker-compose.prod.yml # Production Docker setup
├── Caddyfile               # Caddy reverse proxy config
└── eas.json                # EAS Build configuration
```

## Features

### Mobile App
- NEET subject-wise study material (Physics, Chemistry, Biology)
- Chapter & topic navigation with progress tracking
- Razorpay payments (Android) / Apple IAP (iOS)
- Single device login enforcement
- Guest mode for free content (iOS only)
- Screen capture protection
- Yellow theme (#F59E0B) across all screens

### Auth Flow
- **Registration:** Email → OTP verification → Set password → Account created
- **Login:** Email + Password
- **Forgot Password:** Email → OTP → Reset password
- **Guest Mode:** iOS only, skip login for free content

### Admin Portal
- Dark theme dashboard with analytics
- Class, Subject, Chapter, Topic CRUD management
- Canva integration for content thumbnails
- SEO-optimized landing page at root domain

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
- Swagger API documentation

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
docker compose -f docker-compose.prod.yml up -d --build
```

### Mobile Builds
```bash
# Android
eas build --platform android --profile production

# iOS
eas build --platform ios --profile production
```

## URLs
- **Landing Page:** https://taiyarineetki.com
- **Admin Panel:** https://taiyarineetki.com/admin
- **API:** https://api.taiyarineetki.com
- **API Docs:** https://api.taiyarineetki.com/api-docs
- **Play Store:** https://play.google.com/store/apps/details?id=com.taiyarineetki.app
- **App Store:** https://apps.apple.com/app/taiyari-neet-ki/id6740091521
