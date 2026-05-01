# Taiyari NEET ki — iOS App

NEET preparation mobile app built with React Native + Expo. iOS-focused codebase.

## Tech Stack

- **Framework:** React Native 0.81.5 + Expo SDK 54
- **Language:** TypeScript
- **Navigation:** React Navigation (bottom tabs + native stack)
- **Styling:** NativeWind (Tailwind for RN) + StyleSheet
- **State / Data:** TanStack Query, Axios
- **Payments:** react-native-razorpay, react-native-iap
- **Auth:** expo-auth-session

## Project Structure

```
.
├── App.tsx                # App entry point
├── app.json               # Expo config
├── eas.json               # EAS build profiles
├── ios/                   # iOS native project (Xcode)
├── src/
│   ├── screens/           # All app screens
│   ├── components/        # Reusable UI components
│   ├── navigation/        # Navigators
│   ├── contexts/          # React contexts (Auth etc.)
│   ├── hooks/             # Custom hooks (api, storage)
│   ├── lib/               # Axios client, helpers
│   └── constants/         # env, static data
├── assets/                # Images, icons, splash
├── plugins/               # Expo config plugins (Razorpay)
└── scripts/               # Build / utility scripts
```

## Prerequisites

- Node.js 18+
- npm or yarn
- Xcode 15+ (macOS) for iOS builds
- CocoaPods (`sudo gem install cocoapods`)
- Expo CLI (`npx expo`)
- EAS CLI for cloud builds (`npm i -g eas-cli`)

## Setup

```bash
# Install dependencies
npm install

# iOS pods (run on macOS)
cd ios && pod install && cd ..

# Copy env file and fill values
cp .env.example .env
```

### Required env vars (`.env`)

```
EXPO_PUBLIC_BACKEND_URL=https://api.taiyarineetki.com
EXPO_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxx
```

## Run

### Development (Expo Go — limited, no native modules)

```bash
npx expo start --go --lan
```

Scan QR with Expo Go app on phone.

> Note: `react-native-razorpay` and `react-native-iap` will not work in Expo Go. Use a dev client build for full functionality.

### iOS Simulator

```bash
npx expo run:ios
```

### Physical iOS device (USB)

```bash
npx expo run:ios --device
```

## Build for Distribution

### TestFlight / App Store (EAS Cloud)

```bash
# Preview build (internal testing)
eas build --profile preview --platform ios

# Production build
eas build --platform ios --profile production
```

### Development Client

```bash
eas build --profile development --platform ios
```

## App Identifiers

- **Bundle ID:** `com.taiyarineetki.educationapp`
- **Display Name:** Taiyari NEET ki
- **Version:** 1.0.3

## Scripts

| Command | Purpose |
|---------|---------|
| `npm start` | Start Metro bundler |
| `npm run ios` | Run on iOS simulator |
| `npm run lint` | Run ESLint |
| `npm run prebuild` | Regenerate native projects |
| `npm run build:ios` | EAS preview iOS build |

## Permissions (iOS)

Configured in `app.json` → `ios.infoPlist`:

- Camera (uploads / verification)
- Photo Library (image attachments)
- Microphone (audio features)
- Background fetch

## License

Proprietary © Taiyari NEET ki
