import * as Updates from 'expo-updates';
import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';

// expo-updates only checks for a new OTA update at a cold start (ON_LOAD), and a
// downloaded update is used from the cold start AFTER that. Android users often
// just background the app, so they can stay on an old bundle for days. Fetch a
// newer update whenever the app comes to the foreground so it is already on the
// device by the next cold start.
//
// This never reloads the app: an interrupted test or a UPI payment that left the
// app and came back must not be reset. The update is simply used next launch.
const MIN_GAP_MS = 10 * 60 * 1000;

export function useBackgroundUpdate() {
  const lastCheck = useRef(0);
  const busy = useRef(false);

  useEffect(() => {
    if (__DEV__ || !Updates.isEnabled) return;

    const run = async () => {
      const now = Date.now();
      if (busy.current || now - lastCheck.current < MIN_GAP_MS) return;
      busy.current = true;
      lastCheck.current = now;
      try {
        const check = await Updates.checkForUpdateAsync();
        if (check.isAvailable) {
          await Updates.fetchUpdateAsync();
        }
      } catch {
        // Offline or a check already in progress: try again at the next foreground.
      } finally {
        busy.current = false;
      }
    };

    run();
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') run();
    });
    return () => sub.remove();
  }, []);
}
