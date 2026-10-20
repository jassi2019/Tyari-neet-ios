import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import { currentRouteName, onNavigationStateChange } from '../navigation/navigationRef';

// Keeps a running app on the newest OTA update without waiting for the next
// cold start:
//  1. whenever the app opens or returns to the foreground (at most once every
//     10 minutes) a newer update is downloaded silently;
//  2. as soon as the download is done the app reloads onto it, unless the user
//     is in the middle of something that a restart would break (payment, a
//     test in progress, an open lesson, or an auth/OTP step). In that case the
//     reload waits for the next screen change or foreground return.
const MIN_GAP_MS = 10 * 60 * 1000;

// Screens where a restart would lose the user's work or interrupt a flow.
const BUSY_ROUTES = new Set([
  'Payment',
  'PayUCheckout',
  'Plans',
  'SubscriptionMessage',
  'TestMCQ',
  'TopicContent',
  'FeatureContent',
  'Login',
  'SetEmail',
  'RegisterOTPVerification',
  'SetAccountPassword',
  'AskForEmail',
  'OTPVerification',
  'ResetPassword',
]);

function canReloadNow(): boolean {
  if (AppState.currentState !== 'active') return false;
  const route = currentRouteName();
  if (!route) return false;
  return !BUSY_ROUTES.has(route);
}

export function useBackgroundUpdate() {
  const lastCheck = useRef(0);
  const busy = useRef(false);
  const pendingReload = useRef(false);
  const reloading = useRef(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    const tryReload = () => {
      if (!pendingReload.current || reloading.current) return;
      if (!canReloadNow()) return;
      reloading.current = true;
      Updates.reloadAsync().catch(() => {
        // Could not restart (should not happen); the update applies next launch.
        reloading.current = false;
      });
    };

    const run = async () => {
      const now = Date.now();
      if (busy.current || now - lastCheck.current < MIN_GAP_MS) return;
      busy.current = true;
      lastCheck.current = now;
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          const fetched = await Updates.fetchUpdateAsync();
          if (fetched.isNew) {
            pendingReload.current = true;
            tryReload();
          }
        }
      } catch {
        // Offline or a check already in progress: try again at the next foreground.
      } finally {
        busy.current = false;
      }
    };

    run();
    const appStateSub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        tryReload();
        run();
      }
    });
    // A pending reload fires once the user leaves a busy screen.
    const navSub = onNavigationStateChange(tryReload);
    return () => {
      appStateSub.remove();
      navSub();
    };
  }, []);
}
