import { useEffect } from 'react';
import { Platform } from 'react-native';

type Options = {
  enabled?: boolean;
  key?: string;
  appSwitcherBlurIntensity?: number;
};

export function useContentProtection(options: Options = {}) {
  const enabled = options.enabled ?? Platform.OS !== 'web';
  const key = options.key ?? 'default';
  const blurIntensity = options.appSwitcherBlurIntensity ?? 0.6;

  useEffect(() => {
    if (!enabled || Platform.OS === 'web') return;

    let cleanup = () => {};
    (async () => {
      try {
        const ScreenCapture = await import('expo-screen-capture');
        await ScreenCapture.preventScreenCaptureAsync(key);
        if (Platform.OS === 'ios' && typeof ScreenCapture.enableAppSwitcherProtectionAsync === 'function') {
          await ScreenCapture.enableAppSwitcherProtectionAsync(blurIntensity);
        }
        cleanup = () => {
          ScreenCapture.allowScreenCaptureAsync(key).catch(() => undefined);
          if (Platform.OS === 'ios' && typeof ScreenCapture.disableAppSwitcherProtectionAsync === 'function') {
            ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
          }
        };
      } catch {
        // expo-screen-capture not available (e.g. Expo Go on some devices)
      }
    })();
    return () => cleanup();
  }, [enabled, key, blurIntensity]);
}
