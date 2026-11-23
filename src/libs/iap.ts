import { Platform } from 'react-native';

type EventSubscription = { remove(): void };

type Purchase = {
  productId: string;
  transactionId: string;
  purchaseState?: string;
  originalTransactionIdentifierIOS?: string | null;
  environmentIOS?: string | null;
};

type PurchaseError = {
  code?: string;
  message: string;
  productId?: string | null;
};

export type TAppleIapSubscriptionPeriodUnitIOS = 'day' | 'week' | 'month' | 'year' | 'empty';

export type TAppleIapProductType = 'in-app' | 'subs';

export type TAppleIapProductTypeIOS =
  | 'consumable'
  | 'non-consumable'
  | 'auto-renewable-subscription'
  | 'non-renewing-subscription';

export type TAppleIapProduct = {
  id: string;
  title: string;
  description: string;
  displayPrice: string;
  currency: string;
  type: TAppleIapProductType;
  typeIOS?: TAppleIapProductTypeIOS | null;
  subscriptionPeriodNumberIOS?: string | null;
  subscriptionPeriodUnitIOS?: TAppleIapSubscriptionPeriodUnitIOS | null;
};

const IAP_NOT_AVAILABLE_MESSAGE =
  'In-app purchases are not available. Please use a development build (not Expo Go).';

// True while purchaseAppleProduct() is waiting on StoreKit. The background sync must not
// open/close the IAP connection then: endConnection() would drop the live purchase's
// listeners and the user could be charged without the app ever hearing about it.
let applePurchaseInFlight = false;
export const isApplePurchaseInFlight = () => applePurchaseInFlight;

export const APPLE_PURCHASE_TIMEOUT_MS = 5 * 60 * 1000;
export const APPLE_PURCHASE_TIMEOUT_MESSAGE =
  'Apple is taking longer than usual to confirm this purchase. If you were charged, your plan will be activated automatically the next time you open the app (or tap "Restore Purchases"). Please do not pay again.';

// Remembers that a purchase was started but not confirmed in time, so the app checks
// with the App Store on the next launch even if StoreKit does not re-deliver it.
const PENDING_KEY = '@apple_purchase_pending';

async function storage(): Promise<any | null> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('@react-native-async-storage/async-storage').default;
  } catch {
    return null;
  }
}

export async function markApplePurchasePending(productId: string): Promise<void> {
  const s = await storage();
  if (!s) return;
  await s.setItem(PENDING_KEY, JSON.stringify({ productId, at: Date.now() }));
}

export async function getApplePurchasePending(): Promise<{ productId: string; at: number } | null> {
  const s = await storage();
  if (!s) return null;
  try {
    const raw = await s.getItem(PENDING_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function clearApplePurchasePending(): Promise<void> {
  const s = await storage();
  if (!s) return;
  await s.removeItem(PENDING_KEY).catch(() => undefined);
}

function isExpoGo(): boolean {
  try {
    // `expo-constants` is present in Expo projects, but keep this lazy to avoid hard dependency.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const Constants = require('expo-constants').default ?? require('expo-constants');

    // Newer Expo SDKs expose `executionEnvironment`. `storeClient` means Expo Go.
    const executionEnvironment = String(Constants?.executionEnvironment ?? '');
    if (executionEnvironment === 'storeClient') return true;

    // Fallback for older SDKs.
    const appOwnership = String(Constants?.appOwnership ?? '');
    return appOwnership === 'expo';
  } catch {
    return false;
  }
}

let IapSdk: any = null;
if (Platform.OS !== 'web') {
  try {
    // Expo Go does not ship native IAP modules; treat it as unavailable to avoid noisy runtime errors.
    if (isExpoGo()) {
      IapSdk = null;
    } else {
      // Lazy require so web doesn't evaluate native code
    // eslint-disable-next-line @typescript-eslint/no-var-requires
      IapSdk = require('react-native-iap');
    }
  } catch {
    IapSdk = null;
  }
}

export type TAppleIapPurchase = {
  productId: string;
  transactionId: string;
  originalTransactionId?: string | null;
  environmentIOS?: string | null;
  receipt: string;
};

type TAppleReceiptFetchOptions = {
  attempts?: number;
  delayMs?: number;
};

type TAppleIapConnectionOptions = {
  attempts?: number;
  delayMs?: number;
  settleDelayMs?: number;
};

function requireIap() {
  if (!IapSdk) {
    throw new Error(IAP_NOT_AVAILABLE_MESSAGE);
  }
  return IapSdk;
}

export function isIapAvailable() {
  return !!IapSdk;
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function isAppleIapInitConnectionError(error: unknown): boolean {
  const e = error as { code?: unknown; message?: unknown } | null | undefined;
  const code = String(e?.code ?? '');
  const message = String(e?.message ?? error ?? '').toLowerCase();

  return (
    code === 'init-connection' ||
    message.includes('connection not initialized') ||
    message.includes('initconnection() first') ||
    message.includes('"code":"init-connection"')
  );
}

async function ensureAppleIapConnection(IAP: any, options?: TAppleIapConnectionOptions): Promise<void> {
  const attempts = Math.max(1, Math.trunc(options?.attempts ?? 3));
  const delayMs = Math.max(0, Math.trunc(options?.delayMs ?? 350));
  const settleDelayMs = Math.max(0, Math.trunc(options?.settleDelayMs ?? 250));

  let lastError: unknown = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const connected = await IAP.initConnection();
      if (connected) {
        // `react-native-iap` Nitro can return `true` while another init is still in progress.
        // A short settle delay avoids immediate `init-connection` races on `fetchProducts`.
        if (settleDelayMs > 0) {
          await sleep(settleDelayMs);
        }
        return;
      }
      lastError = new Error('Failed to connect to the App Store.');
    } catch (e) {
      lastError = e;
    }

    if (attempt < attempts) {
      try {
        await IAP.endConnection();
      } catch {
        // noop
      }
      if (delayMs > 0) {
        await sleep(delayMs);
      }
    }
  }

  if (lastError instanceof Error) {
    throw lastError;
  }

  throw new Error(String(lastError || 'Failed to connect to the App Store.'));
}

async function runAppleIapWithInitRetry<T>(
  IAP: any,
  operation: () => Promise<T>,
  options?: Pick<TAppleIapConnectionOptions, 'attempts' | 'delayMs'>
): Promise<T> {
  const attempts = Math.max(1, Math.trunc(options?.attempts ?? 3));
  const delayMs = Math.max(0, Math.trunc(options?.delayMs ?? 350));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (e) {
      if (!isAppleIapInitConnectionError(e) || attempt === attempts) {
        throw e;
      }

      try {
        await IAP.endConnection();
      } catch {
        // noop
      }

      if (delayMs > 0) {
        await sleep(delayMs);
      }

      await ensureAppleIapConnection(IAP, {
        attempts: 2,
        delayMs,
        settleDelayMs: delayMs,
      });
    }
  }

  throw new Error('IAP operation failed.');
}

export function formatAppleSubscriptionPeriod(
  subscriptionPeriodNumberIOS?: string | null,
  subscriptionPeriodUnitIOS?: TAppleIapSubscriptionPeriodUnitIOS | null
): string | null {
  if (!subscriptionPeriodNumberIOS || !subscriptionPeriodUnitIOS) return null;
  if (subscriptionPeriodUnitIOS === 'empty') return null;

  const n = Number(subscriptionPeriodNumberIOS);
  if (!Number.isFinite(n) || n <= 0) return null;

  const unit =
    subscriptionPeriodUnitIOS === 'day'
      ? 'day'
      : subscriptionPeriodUnitIOS === 'week'
        ? 'week'
        : subscriptionPeriodUnitIOS === 'month'
          ? 'month'
          : subscriptionPeriodUnitIOS === 'year'
            ? 'year'
            : null;

  if (!unit) return null;
  const plural = n === 1 ? unit : `${unit}s`;
  return `${n} ${plural}`;
}

export async function fetchAppleSubscriptionProducts(
  productIds: string[]
): Promise<TAppleIapProduct[]> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple in-app purchases are only available on iOS.');
  }

  const skus = Array.from(new Set(productIds.filter(Boolean)));
  if (skus.length === 0) return [];

  const IAP = requireIap();
  await ensureAppleIapConnection(IAP);

  try {
    // Fetch both subscriptions and one-time products. We'll decide how to purchase based on `type`.
    const products = await runAppleIapWithInitRetry(IAP, () =>
      IAP.fetchProducts({ skus, type: 'all' })
    );
    if (!Array.isArray(products)) return [];

    const mapped = products
      .map((p: any): TAppleIapProduct => ({
      id: String(p?.id ?? ''),
      title: String(p?.title ?? ''),
      description: String(p?.description ?? ''),
      displayPrice: String(p?.displayPrice ?? ''),
      currency: String(p?.currency ?? ''),
      type: (p?.type === 'subs' ? 'subs' : 'in-app') as TAppleIapProductType,
      typeIOS: (p?.typeIOS ?? null) as TAppleIapProductTypeIOS | null,
      subscriptionPeriodNumberIOS: p?.subscriptionPeriodNumberIOS ?? null,
      subscriptionPeriodUnitIOS: p?.subscriptionPeriodUnitIOS ?? null,
    }))
      .filter((p: any) => !!p?.id);

    if (mapped.length === 0) {
      throw new Error(
        'No products returned from the App Store. ' +
          'Check that the product exists in App Store Connect, is Cleared for Sale, ' +
          'and that your iOS bundle identifier matches the app in App Store Connect.'
      );
    }

    return mapped;
  } finally {
    try {
      await IAP.endConnection();
    } catch {
      // noop
    }
  }
}

async function getAppleReceiptInternal(
  IAP: any,
  options?: TAppleReceiptFetchOptions
): Promise<string | null> {
  const attempts = Math.max(1, Math.trunc(options?.attempts ?? 1));
  const delayMs = Math.max(0, Math.trunc(options?.delayMs ?? 0));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let receipt: string | null = null;

    try {
      receipt = await IAP.getReceiptIOS();
    } catch {
      receipt = null;
    }

    if (receipt) return receipt;

    // Refresh on the first and last attempts. The first helps create a receipt on fresh installs,
    // and the last gives one final App Store sync after a short retry window.
    if (attempt === 1 || attempt === attempts) {
      try {
        receipt = await IAP.requestReceiptRefreshIOS();
      } catch {
        receipt = null;
      }

      if (receipt) return receipt;
    }

    if (attempt < attempts && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return null;
}

export async function restoreAppleReceipt(): Promise<string> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple in-app purchases are only available on iOS.');
  }

  const IAP = requireIap();
  await ensureAppleIapConnection(IAP);

  try {
    try {
      await IAP.restorePurchases();
    } catch {
      // Restore can fail for reasons unrelated to receipt availability; continue to receipt fetch.
    }

    const receipt = await getAppleReceiptInternal(IAP, {
      attempts: 3,
      delayMs: 1200,
    });
    if (!receipt) {
      throw new Error('Could not fetch App Store receipt. Please try again.');
    }
    return receipt;
  } finally {
    try {
      await IAP.endConnection();
    } catch {
      // noop
    }
  }
}

export async function openAppleManageSubscriptions(): Promise<void> {
  if (Platform.OS !== 'ios') {
    throw new Error('Manage subscriptions is only available on iOS.');
  }

  const IAP = requireIap();
  await ensureAppleIapConnection(IAP);

  try {
    try {
      await IAP.showManageSubscriptionsIOS();
      return;
    } catch {
      // Fall back to deeplink API if showManageSubscriptionsIOS fails.
    }

    try {
      const ok = await IAP.deepLinkToSubscriptionsIOS();
      if (!ok) {
        throw new Error('Unable to open subscription management.');
      }
    } catch (e: any) {
      throw new Error(String(e?.message || e || 'Unable to open subscription management.'));
    }
  } finally {
    try {
      await IAP.endConnection();
    } catch {
      // noop
    }
  }
}

export async function purchaseAppleProduct(
  productId: string,
  type: TAppleIapProductType
): Promise<TAppleIapPurchase> {
  if (Platform.OS !== 'ios') {
    throw new Error('Apple in-app purchase is only available on iOS.');
  }

  const IAP = requireIap();
  applePurchaseInFlight = true;
  try {
    await ensureAppleIapConnection(IAP);
  } catch (e) {
    applePurchaseInFlight = false;
    throw e;
  }

  let purchaseSub: EventSubscription | null = null;
  let errorSub: EventSubscription | null = null;
  let timeout: ReturnType<typeof setTimeout> | null = null;

  const cleanup = async () => {
    applePurchaseInFlight = false;
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
    }
    try {
      purchaseSub?.remove();
    } catch {
      // noop
    }
    try {
      errorSub?.remove();
    } catch {
      // noop
    }
    purchaseSub = null;
    errorSub = null;
    try {
      await IAP.endConnection();
    } catch {
      // noop
    }
  };

  try {
    const result = await new Promise<TAppleIapPurchase>((resolve, reject) => {
      let settled = false;

      const settle = async (fn: () => Promise<void>) => {
        if (settled) return;
        settled = true;
        try {
          await fn();
        } catch (e) {
          reject(e);
          return;
        } finally {
          cleanup().catch(() => undefined);
        }
      };

      purchaseSub = IAP.purchaseUpdatedListener((purchase: Purchase) => {
        if (purchase.productId !== productId) return;

        // Some purchases can be "pending" (e.g., Ask to Buy). Wait for a purchased state.
        if (purchase.purchaseState && purchase.purchaseState !== 'purchased') return;

        settle(async () => {
          if (!purchase.transactionId) {
            throw new Error('Missing transaction ID from App Store purchase.');
          }

          const receipt = await getAppleReceiptInternal(IAP, {
            attempts: 5,
            delayMs: 1200,
          });

          if (!receipt) {
            throw new Error('Could not fetch App Store receipt. Please try again.');
          }

          await IAP.finishTransaction({ purchase });

          resolve({
            productId: purchase.productId,
            transactionId: purchase.transactionId,
            originalTransactionId: purchase.originalTransactionIdentifierIOS,
            environmentIOS: purchase.environmentIOS,
            receipt,
          });
        });
      });

      errorSub = IAP.purchaseErrorListener((error: PurchaseError) => {
        settle(async () => {
          throw error;
        });
      });

      // Apple sometimes confirms a purchase well after the payment sheet closes. If that
      // confirmation arrives after this timeout, StoreKit keeps the transaction unfinished
      // and syncPendingApplePurchases() picks it up on the next launch, so the user is
      // never charged without getting the plan.
      timeout = setTimeout(() => {
        markApplePurchasePending(productId).catch(() => undefined);
        settle(async () => {
          throw new Error(APPLE_PURCHASE_TIMEOUT_MESSAGE);
        });
      }, APPLE_PURCHASE_TIMEOUT_MS);

      IAP.requestPurchase({
        type,
        request: {
          apple: {
            sku: productId,
            andDangerouslyFinishTransactionAutomatically: false,
          },
        },
      }).catch((e: any) => {
        settle(async () => {
          throw e;
        });
      });
    });

    await cleanup();
    return result;
  } catch (e) {
    await cleanup();
    throw e;
  }
}

// Backward-compat alias (older code used this name).
export async function purchaseAppleSubscription(productId: string): Promise<TAppleIapPurchase> {
  return purchaseAppleProduct(productId, 'subs');
}

// ---------------------------------------------------------------------------
// Late / unfinished purchases. StoreKit re-delivers every transaction that was never
// finished (purchase confirmed after our timeout, app killed mid-purchase, server call
// failed) to purchaseUpdatedListener right after initConnection(). This sends each one
// to our server and finishes it only once the server has recorded it.
// ---------------------------------------------------------------------------
const SYNCED_KEY = '@apple_purchases_synced';

async function readSynced(): Promise<string[]> {
  const s = await storage();
  if (!s) return [];
  try {
    const raw = await s.getItem(SYNCED_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function rememberSynced(transactionId: string): Promise<void> {
  const s = await storage();
  if (!s) return;
  const arr = await readSynced();
  if (!arr.includes(transactionId)) arr.push(transactionId);
  await s.setItem(SYNCED_KEY, JSON.stringify(arr.slice(-50))).catch(() => undefined);
}

export type TApplePurchaseSyncResult = { submitted: number; activated: number; failed: number };

export async function syncPendingApplePurchases(options: {
  knownProductIds: string[];
  // resolves true when the server created a new subscription, false if it already had it
  submit: (purchase: TAppleIapPurchase) => Promise<boolean>;
}): Promise<TApplePurchaseSyncResult> {
  const result: TApplePurchaseSyncResult = { submitted: 0, activated: 0, failed: 0 };
  if (Platform.OS !== 'ios' || !IapSdk) return result;
  if (applePurchaseInFlight) return result; // a purchase is in progress; try again later

  const known = new Set(options.knownProductIds.filter(Boolean));
  if (known.size === 0) return result;

  const IAP = IapSdk;
  const pending = await getApplePurchasePending();
  const synced = await readSynced();
  const found = new Map<string, Purchase>();
  const consider = (p: Purchase | null | undefined) => {
    if (!p || !p.transactionId || !known.has(p.productId)) return;
    if (p.purchaseState && p.purchaseState !== 'purchased') return;
    if (synced.includes(p.transactionId)) return;
    found.set(p.transactionId, p);
  };

  let sub: EventSubscription | null = null;
  try {
    sub = IAP.purchaseUpdatedListener((p: Purchase) => consider(p));
    await ensureAppleIapConnection(IAP, { attempts: 2, delayMs: 400, settleDelayMs: 300 });
    // Unfinished transactions arrive on the listener shortly after the connection opens
    // (StoreKit does that once per launch); asking for them directly works at any time.
    await sleep(2500);
    if (applePurchaseInFlight) return result;
    try {
      const unfinished = await IAP.getPendingTransactionsIOS();
      if (Array.isArray(unfinished)) unfinished.forEach((p: Purchase) => consider(p));
    } catch {
      // noop
    }

    // After a failed/timed-out purchase also ask StoreKit for the current entitlements of
    // this Apple ID (finished purchases included); anything our server has not recorded
    // yet is submitted (the server is idempotent).
    if (pending) {
      try {
        const owned = await runAppleIapWithInitRetry(IAP, () => IAP.getAvailablePurchases());
        if (Array.isArray(owned)) owned.forEach((p: Purchase) => consider(p));
      } catch {
        // noop
      }
    }

    if (found.size === 0) {
      // Nothing outstanding; a stale pending flag (user cancelled, never charged) is dropped
      // after a day so we stop asking StoreKit on every launch.
      if (pending && Date.now() - pending.at > 24 * 60 * 60 * 1000) await clearApplePurchasePending();
      return result;
    }

    const receipt = await getAppleReceiptInternal(IAP, { attempts: 4, delayMs: 1200 });
    if (!receipt) throw new Error('Could not fetch App Store receipt.');

    for (const purchase of found.values()) {
      try {
        const created = await options.submit({
          productId: purchase.productId,
          transactionId: purchase.transactionId,
          originalTransactionId: purchase.originalTransactionIdentifierIOS ?? null,
          environmentIOS: purchase.environmentIOS ?? null,
          receipt,
        });
        try {
          await IAP.finishTransaction({ purchase });
        } catch {
          // Already finished or not finishable; the server has it either way.
        }
        await rememberSynced(purchase.transactionId);
        result.submitted += 1;
        if (created) result.activated += 1;
      } catch {
        // Server/network failure: leave the transaction unfinished so it is retried next time.
        result.failed += 1;
      }
    }
    if (result.submitted > 0 && result.failed === 0) await clearApplePurchasePending();
    return result;
  } finally {
    try {
      sub?.remove();
    } catch {
      // noop
    }
    try {
      await IAP.endConnection();
    } catch {
      // noop
    }
  }
}
