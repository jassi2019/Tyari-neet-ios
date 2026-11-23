import React from 'react';
import { Alert, AppState, Platform } from 'react-native';

import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { getPlanAppleProductId } from '@/utils/appleIap';
import { getApplePurchasePending, isApplePurchaseInFlight, isIapAvailable, syncPendingApplePurchases } from '@/libs/iap';
import { currentRouteName } from '@/navigation/navigationRef';

// iOS only. On every launch / return to foreground, any Apple purchase that the app did
// not manage to report (Apple confirmed it late, the app was closed, the network dropped)
// is sent to the server, the plan is activated and the user is told. Nothing is shown
// when there is nothing to sync.
const MIN_GAP_MS = 60 * 1000;

export default function ApplePurchaseSync() {
  const { user, isGuest, isLoading, setUser } = useAuth();
  const lastRun = React.useRef(0);
  const running = React.useRef(false);

  const run = React.useCallback(async () => {
    if (Platform.OS !== 'ios' || !isIapAvailable()) return;
    // Never touch the App Store connection while the user is on the Payment screen or a
    // purchase is in flight (the payment sheet itself backgrounds/foregrounds the app).
    if (isApplePurchaseInFlight() || currentRouteName() === 'Payment') return;
    if (running.current || Date.now() - lastRun.current < MIN_GAP_MS) return;
    running.current = true;
    lastRun.current = Date.now();
    try {
      const plansRes: any = await api.get('/api/v1/plans');
      const plans: any[] = Array.isArray(plansRes?.data) ? plansRes.data : [];
      const byProduct = new Map<string, string>();
      plans.forEach((p) => {
        const pid = getPlanAppleProductId(p);
        if (pid) byProduct.set(pid, p.id);
      });
      if (byProduct.size === 0) return;

      const result = await syncPendingApplePurchases({
        knownProductIds: Array.from(byProduct.keys()),
        submit: async (purchase) => {
          const res: any = await api.post(
            '/api/v1/subscriptions/iap/apple',
            {
              planId: byProduct.get(purchase.productId),
              productId: purchase.productId,
              transactionId: purchase.transactionId,
              originalTransactionId: purchase.originalTransactionId,
              environmentIOS: purchase.environmentIOS,
              receipt: purchase.receipt,
            },
            { skipRetry: true } as any
          );
          return !/already exists/i.test(String(res?.message || ''));
        },
      });

      if (result.activated > 0) {
        try {
          const me: any = await api.get('/api/v1/users/me');
          if (me?.data) setUser(me.data);
        } catch {
          // noop
        }
        Alert.alert('Purchase activated', 'Your App Store purchase has been confirmed and your plan is now active.');
      }
    } catch (e) {
      if (__DEV__) console.warn('[ApplePurchaseSync]', e);
    } finally {
      running.current = false;
    }
  }, [setUser]);

  React.useEffect(() => {
    if (Platform.OS !== 'ios' || isLoading || !user || isGuest) return;
    // A purchase that timed out is checked at once; otherwise a short delay keeps
    // launch snappy.
    let t: any = null;
    getApplePurchasePending().then((p) => {
      t = setTimeout(run, p ? 500 : 6000);
    });
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') run();
    });
    return () => {
      if (t) clearTimeout(t);
      sub.remove();
    };
  }, [isLoading, user, isGuest, run]);

  return null;
}
