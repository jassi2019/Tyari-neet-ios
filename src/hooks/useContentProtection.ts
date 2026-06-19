import Constants from 'expo-constants';
import { useEffect } from 'react';
import { Platform } from 'react-native';

type Options = {
  enabled?: boolean;
  key?: string;
  appSwitcherBlurIntensity?: number;
};

const isExpoGo = Constants.appOwnership === 'expo';

export function useContentProtection(options: Options = {}) {
  const enabled = options.enabled ?? Platform.OS !== 'web';
  const key = options.key ?? 'default';
  const blurIntensity = options.appSwitcherBlurIntensity ?? 0.6;

  useEffect(() => {
    if (!enabled || isExpoGo) return;

    let cleanup = () => {};
    (async () => {
      try {
        const ScreenCapture = await import('expo-screen-capture');
        await ScreenCapture.preventScreenCaptureAsync(key);
        if (typeof ScreenCapture.enableAppSwitcherProtectionAsync === 'function') {
          await ScreenCapture.enableAppSwitcherProtectionAsync(blurIntensity);
        }
        cleanup = () => {
          ScreenCapture.allowScreenCaptureAsync(key).catch(() => undefined);
          if (typeof ScreenCapture.disableAppSwitcherProtectionAsync === 'function') {
            ScreenCapture.disableAppSwitcherProtectionAsync().catch(() => undefined);
          }
        };
      } catch {}
    })();
    return () => cleanup();
  }, [enabled, key, blurIntensity]);
}
