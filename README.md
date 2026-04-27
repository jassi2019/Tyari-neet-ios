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

## Project Structure

```
├── src/                    # React Native mobile app
│   ├── screens/            # App screens (Home, Payment, Profile, etc.)
│   ├── contexts/           # AuthContext with single-device login
│   ├── hooks/              # API hooks (React Query)
│   ├── libs/               # Razorpay, IAP wrappers
│   └── constants/          # Environment config
├── backend-main/           # Express.js backend API
│   ├── src/controllers/    # Route handlers
│   ├── src/models/         # Sequelize models
│   ├── src/services/       # Canva, Razorpay, Mail services
│   ├── src/utils/          # Billing, email, JWT utilities
│   └── src/views/          # Handlebars email templates
├── portal-main/            # Next.js admin portal
│   └── src/app/            # App router pages
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
- Guest mode for free content
- Screen capture protection

### Admin Portal
- Dark theme dashboard with analytics
- Class, Subject, Chapter, Topic CRUD management
- Canva integration for content thumbnails
- SEO-optimized landing page at root domain

### Backend API
- JWT authentication (180-day tokens)
- Single device session management
- Razorpay order creation & signature verification
- Apple IAP receipt verification
- Purchase invoice emails (student + admin)
- Canva OAuth token management with auto-renewal
- Gzip compression for faster responses
- Swagger API documentation

## Environment Variables

### Backend (.env)
```
DB_HOST=postgres
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=<password>
DB_NAME=education_app
DB_SSL=false
JWT_SECRET=<secret>
RAZORPAY_KEY_ID=<razorpay_key>
RAZORPAY_KEY_SECRET=<razorpay_secret>
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=<gmail>
SMTP_PASSWORD=<app_password>
SMTP_FROM=<gmail>
CANVA_CLIENT_ID=<canva_client_id>
CANVA_CLIENT_SECRET=<canva_secret>
CANVA_AUTH_REDIRECT_URI=<redirect_uri>
DEVELOPER_EMAILS=<admin_emails>
```

### App (eas.json)
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
- **Play Store:** https://play.google.com/store/apps/details?id=com.taiyarineetki.app
- **App Store:** https://apps.apple.com/app/taiyari-neet-ki/id6740091521
