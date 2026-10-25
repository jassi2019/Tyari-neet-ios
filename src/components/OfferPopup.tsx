import React from 'react';
import { AppState, Modal, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import api from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { isPaidSubscriptionActive } from '@/lib/subscription';
import { currentRouteName, navigateTo, onNavigationStateChange } from '@/navigation/navigationRef';

// Offer popup managed from the admin portal (Offers page): theme, text, price, end
// time, audience and frequency all come from GET /api/v1/offers/active. Shown only on
// the Home tab, so it never interrupts a lesson, a test or a payment.

type Offer = {
  id: string;
  theme: 'omr' | 'last_lap' | 'scratch' | 'parchi';
  tag?: string | null;
  headline: string;
  subline?: string | null;
  price?: string | null;
  oldPrice?: string | null;
  points?: string | null;
  revealText?: string | null;
  seatsTotal?: number | null;
  seatsLeft?: number | null;
  ctaText?: string | null;
  endsAt: string;
  audience: 'free' | 'all';
  frequency: 'once' | 'daily' | 'launch';
};

const HOME_ROUTE = 'HomeTab';
const REFETCH_GAP_MS = 5 * 60 * 1000;
const SHOW_DELAY_MS = 1500;
const shownThisLaunch = new Set<string>();

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};
const seenKey = (id: string) => `@offer_seen_${id}`;

const alreadySeen = async (o: Offer): Promise<boolean> => {
  if (shownThisLaunch.has(o.id)) return true;
  if (o.frequency === 'launch') return false;
  try {
    const v = await AsyncStorage.getItem(seenKey(o.id));
    if (!v) return false;
    return o.frequency === 'once' ? true : v === todayKey();
  } catch {
    return false;
  }
};
const markSeen = (o: Offer) => {
  shownThisLaunch.add(o.id);
  AsyncStorage.setItem(seenKey(o.id), todayKey()).catch(() => {});
};

const report = (id: string, type: 'view' | 'click') => {
  api.post(`/api/v1/offers/${id}/event`, { type }).catch(() => {});
};

const lines = (t?: string | null) => String(t || '').split('\n').map((s) => s.trim()).filter(Boolean);

// "*text*" in a headline is drawn in the theme's highlight colour.
const Hi = ({ text, color }: { text: string; color: string }) => (
  <>
    {String(text || '').split(/\*([^*]+)\*/).map((part, i) =>
      i % 2 ? <Text key={i} style={{ color }}>{part}</Text> : <Text key={i}>{part}</Text>
    )}
  </>
);

// Remaining time, measured against server time so changing the phone clock does not
// change the countdown.
const useCountdown = (endsAt: string, offsetMs: number) => {
  const end = Date.parse(endsAt);
  const calc = () => Math.max(0, end - (Date.now() + offsetMs));
  const [left, setLeft] = React.useState(calc);
  React.useEffect(() => {
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [end, offsetMs]);
  return left;
};

const Clock = ({ left, bg, fg, border }: { left: number; bg: string; fg: string; border?: string }) => {
  const h = Math.floor(left / 3600000);
  const m = Math.floor((left % 3600000) / 60000);
  const s = Math.floor((left % 60000) / 1000);
  const cells: [number, string][] = [[h, 'HRS'], [m, 'MIN'], [s, 'SEC']];
  return (
    <View style={st.clock}>
      {cells.map(([v, l]) => (
        <View key={l} style={[st.clockCell, { backgroundColor: bg }, border ? { borderWidth: 1, borderColor: border } : null]}>
          <Text style={[st.clockNum, { color: fg }]}>{String(v).padStart(2, '0')}</Text>
          <Text style={[st.clockLbl, { color: fg }]}>{l}</Text>
        </View>
      ))}
    </View>
  );
};

const Price = ({ price, old, color, oldColor, size }: { price?: string | null; old?: string | null; color: string; oldColor: string; size: number }) =>
  price ? (
    <Text style={{ fontSize: size, fontWeight: '800', color }}>
      {price}
      {old ? <Text style={{ fontSize: 14, fontWeight: '500', color: oldColor, textDecorationLine: 'line-through' }}>{'  ' + old}</Text> : null}
    </Text>
  ) : null;

const Cta = ({ text, bg, fg, onPress }: { text?: string | null; bg: string; fg: string; onPress: () => void }) => (
  <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[st.cta, { backgroundColor: bg }]} accessibilityRole="button">
    <Text style={[st.ctaText, { color: fg }]}>{text || 'Unlock karo'}</Text>
  </TouchableOpacity>
);

const Close = ({ bg, fg, onPress }: { bg: string; fg: string; onPress: () => void }) => (
  <TouchableOpacity onPress={onPress} hitSlop={12} style={[st.close, { backgroundColor: bg }]} accessibilityRole="button" accessibilityLabel="Close offer">
    <Text style={{ color: fg, fontWeight: '700', fontSize: 15, lineHeight: 17 }}>×</Text>
  </TouchableOpacity>
);

// Scratch layer built from small tiles (no native canvas needed, so it ships over
// OTA). Rubbing clears tiles; past ~50% the rest falls away.
const COLS = 14;
const ROWS = 5;
function ScratchCard({ reveal }: { reveal: string }) {
  const [cleared, setCleared] = React.useState<boolean[]>(() => Array(COLS * ROWS).fill(false));
  const done = cleared.filter(Boolean).length >= cleared.length * 0.5;
  const size = React.useRef({ w: 1, h: 1 });
  const clearAt = (x: number, y: number) => {
    const c = Math.floor((x / size.current.w) * COLS);
    const r = Math.floor((y / size.current.h) * ROWS);
    setCleared((prev) => {
      let changed = false;
      const next = prev.slice();
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr >= ROWS || cc < 0 || cc >= COLS) continue;
          const i = rr * COLS + cc;
          if (!next[i]) { next[i] = true; changed = true; }
        }
      }
      return changed ? next : prev;
    });
  };
  const pan = React.useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (e) => clearAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
      onPanResponderMove: (e) => clearAt(e.nativeEvent.locationX, e.nativeEvent.locationY),
    })
  ).current;
  return (
    <View
      style={st.scrCard}
      onLayout={(e) => { size.current = { w: e.nativeEvent.layout.width || 1, h: e.nativeEvent.layout.height || 1 }; }}
      {...(done ? {} : pan.panHandlers)}
    >
      {/* pointerEvents none on children: touch coordinates must be relative to the card */}
      <View pointerEvents="none"><Text style={st.scrWin}>{reveal || 'Offer'}</Text></View>
      {!done && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          {Array.from({ length: ROWS }).map((_, r) => (
            <View key={r} style={{ flex: 1, flexDirection: 'row' }}>
              {Array.from({ length: COLS }).map((__, c) => (
                <View key={c} style={{ flex: 1, backgroundColor: cleared[r * COLS + c] ? 'transparent' : (r + c) % 2 ? '#BDBDBD' : '#C9C9C9' }} />
              ))}
            </View>
          ))}
          {cleared.every((v) => !v) && (
            <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={st.scrHint}>☝ Yahan ungli ghumao</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function OfferCard({ o, left, onClose, onCta }: { o: Offer; left: number; onClose: () => void; onCta: () => void }) {
  if (o.theme === 'last_lap') {
    const total = Math.max(0, o.seatsTotal || 0);
    const remaining = Math.min(Math.max(0, o.seatsLeft || 0), total);
    const pct = total ? ((total - remaining) / total) * 100 : 0;
    return (
      <View style={[st.card, { backgroundColor: '#16213e', borderRadius: 20 }]}>
        <Close bg="rgba(255,255,255,0.14)" fg="#fff" onPress={onClose} />
        {o.tag ? <Text style={[st.tag, { color: '#ffd36a', letterSpacing: 1.3 }]}>{String(o.tag).toUpperCase()}</Text> : null}
        <Text style={[st.h, { color: '#fff', fontSize: 24 }]}><Hi text={o.headline} color="#ffd36a" /></Text>
        {o.subline ? <Text style={{ fontSize: 12, color: '#c9cfe3', marginBottom: 10 }}>{o.subline}</Text> : null}
        <Clock left={left} bg="#0b1226" fg="#ffd36a" border="rgba(255,211,106,0.35)" />
        {total > 0 && (
          <>
            <View style={st.barTrack}><View style={[st.barFill, { width: `${pct}%` }]} /></View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={st.seats}>{total - remaining} of {total} seats gayi</Text>
              <Text style={st.seats}>{remaining} bachi</Text>
            </View>
          </>
        )}
        <View style={{ marginTop: 6 }}><Price price={o.price} old={o.oldPrice} color="#ffd36a" oldColor="#c9cfe3" size={28} /></View>
        <Cta text={o.ctaText} bg="#ffd36a" fg="#16213e" onPress={onCta} />
      </View>
    );
  }
  if (o.theme === 'scratch') {
    return (
      <View style={[st.card, { backgroundColor: '#fff', borderRadius: 18, alignItems: 'stretch' }]}>
        <Close bg="#f1ece0" fg="#333" onPress={onClose} />
        <Text style={[st.h, { color: '#1d1b16', fontSize: 20, textAlign: 'center', paddingHorizontal: 26 }]}><Hi text={o.headline} color="#d98b0a" /></Text>
        {o.subline ? <Text style={{ fontSize: 12, color: '#6d665a', marginBottom: 10, textAlign: 'center' }}>{o.subline}</Text> : null}
        <ScratchCard reveal={o.revealText || ''} />
        <View style={{ alignItems: 'center' }}><Price price={o.price} old={o.oldPrice} color="#0a7a3c" oldColor="#555" size={20} /></View>
        <Clock left={left} bg="#16213e" fg="#fff" />
        <Cta text={o.ctaText} bg="#f5a623" fg="#1d1b16" onPress={onCta} />
      </View>
    );
  }
  if (o.theme === 'parchi') {
    return (
      <View style={[st.card, { backgroundColor: '#f7fbff', borderRadius: 14, borderWidth: 1, borderColor: '#c9dcf0' }]}>
        <Close bg="#e3edf7" fg="#10263d" onPress={onClose} />
        <View style={st.rxHead}>
          <View style={st.rxDoc}><Text style={{ fontWeight: '800', color: '#16213e', fontSize: 16 }}>Dr</Text></View>
          <View style={{ flex: 1, paddingRight: 24 }}>
            <Text style={{ fontWeight: '800', fontSize: 15, color: '#10263d' }}><Hi text={o.headline} color="#0a7a3c" /></Text>
            <Text style={{ fontSize: 10, color: '#4e6a88' }}>Taiyari NEET ki</Text>
          </View>
        </View>
        {o.tag ? <View style={st.stamp}><Text style={st.stampText}>{String(o.tag).toUpperCase()}</Text></View> : null}
        <View style={{ flexDirection: 'row' }}>
          <Text style={{ fontSize: 30, fontWeight: '800', color: '#10263d', marginRight: 8, lineHeight: 32 }}>℞</Text>
          <View style={{ flex: 1, paddingTop: 2 }}>
            {lines(o.points).map((l, i) => (
              <Text key={i} style={{ fontSize: 12.5, lineHeight: 18, color: '#10263d' }}>{i + 1}. {l}</Text>
            ))}
          </View>
        </View>
        {o.price ? (
          <Text style={{ fontSize: 13, color: '#10263d', marginTop: 6 }}>
            Fees: <Text style={{ fontWeight: '800', color: '#0a7a3c' }}>{o.price}</Text>
            {o.oldPrice ? <Text style={{ color: '#4e6a88', textDecorationLine: 'line-through' }}>{'  ' + o.oldPrice}</Text> : null}
          </Text>
        ) : null}
        {o.subline ? <Text style={{ fontSize: 11, color: '#4e6a88', marginTop: 6 }}>{o.subline}</Text> : null}
        <Clock left={left} bg="#10263d" fg="#fff" />
        <Cta text={o.ctaText} bg="#16213e" fg="#ffd36a" onPress={onCta} />
      </View>
    );
  }
  // omr
  return (
    <View style={[st.card, { backgroundColor: '#fffdf7', borderRadius: 16, borderWidth: 2, borderColor: '#1b1b1b' }]}>
      <Close bg="#eee" fg="#333" onPress={onClose} />
      {o.tag ? <Text style={[st.tag, { color: '#b00020', letterSpacing: 1.5 }]}>{String(o.tag).toUpperCase()}</Text> : null}
      <Text style={[st.h, { color: '#1b1b1b', fontSize: 22 }]}><Hi text={o.headline} color="#0a7a3c" /></Text>
      <View style={st.bubbles}>
        {['A', 'B', 'C', 'D'].map((l) => (
          <View key={l} style={st.bubbleRow}>
            <View style={[st.bubble, l === 'C' && { backgroundColor: '#1b1b1b' }]} />
            <Text style={{ fontSize: 11, fontWeight: '600', color: '#1b1b1b' }}>{l}</Text>
          </View>
        ))}
      </View>
      <Price price={o.price} old={o.oldPrice} color="#0a7a3c" oldColor="#555" size={26} />
      {o.subline || o.points ? (
        <Text style={{ fontSize: 11, color: '#555', marginTop: 2, marginBottom: 6 }}>{o.subline || lines(o.points).join(' · ')}</Text>
      ) : null}
      <Clock left={left} bg="#1b1b1b" fg="#fff" />
      <Cta text={o.ctaText} bg="#0a7a3c" fg="#fff" onPress={onCta} />
    </View>
  );
}

function OfferModal({ o, offsetMs, onClose, onCta }: { o: Offer; offsetMs: number; onClose: () => void; onCta: () => void }) {
  const left = useCountdown(o.endsAt, offsetMs);
  React.useEffect(() => {
    if (left <= 0) onClose();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left <= 0]);
  return (
    <Modal transparent animationType="fade" visible onRequestClose={onClose} statusBarTranslucent>
      <View style={st.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close offer" />
        <View style={st.wrap}>
          <OfferCard o={o} left={left} onClose={onClose} onCta={onCta} />
        </View>
      </View>
    </Modal>
  );
}

function OfferPopupInner() {
  const { user, isGuest, isLoading } = useAuth();
  const hasPremium = isPaidSubscriptionActive(user?.subscription);
  const signedIn = !!user || isGuest;
  const [offer, setOffer] = React.useState<Offer | null>(null);
  const [offsetMs, setOffsetMs] = React.useState(0);
  const [visible, setVisible] = React.useState(false);
  const lastFetch = React.useRef(0);
  const timer = React.useRef<any>(null);

  const fetchOffer = React.useCallback(async () => {
    if (Date.now() - lastFetch.current < REFETCH_GAP_MS) return;
    lastFetch.current = Date.now();
    try {
      const res: any = await api.get('/api/v1/offers/active');
      const server = Date.parse(res?.serverTime);
      if (Number.isFinite(server)) setOffsetMs(server - Date.now());
      setOffer(res?.data && res.data.id ? res.data : null);
    } catch {
      lastFetch.current = 0;
    }
  }, []);

  React.useEffect(() => {
    if (isLoading || !signedIn) return;
    fetchOffer();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') fetchOffer(); });
    return () => sub.remove();
  }, [isLoading, signedIn, fetchOffer]);

  // Show once the user is on Home and the offer applies to them.
  React.useEffect(() => {
    if (!offer || visible || isLoading || !signedIn) return;
    if (offer.audience === 'free' && hasPremium) return;
    let cancelled = false;
    const tryShow = async () => {
      if (cancelled || currentRouteName() !== HOME_ROUTE) return;
      const end = Date.parse(offer.endsAt);
      if (!Number.isFinite(end) || end <= Date.now() + offsetMs) return;
      if (await alreadySeen(offer)) return;
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        if (cancelled || currentRouteName() !== HOME_ROUTE) return;
        markSeen(offer);
        report(offer.id, 'view');
        setVisible(true);
      }, SHOW_DELAY_MS);
    };
    tryShow();
    const unsub = onNavigationStateChange(tryShow);
    return () => {
      cancelled = true;
      unsub();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [offer, visible, isLoading, signedIn, hasPremium, offsetMs]);

  if (!offer || !visible || !signedIn) return null;
  return (
    <OfferModal
      o={offer}
      offsetMs={offsetMs}
      onClose={() => { setVisible(false); setOffer(null); }}
      onCta={() => {
        report(offer.id, 'click');
        setVisible(false);
        setOffer(null);
        navigateTo('Plans');
      }}
    />
  );
}

const st = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(12,10,6,0.6)', justifyContent: 'center', alignItems: 'center' },
  wrap: { width: '100%', maxWidth: 380, paddingHorizontal: 18 },
  card: { padding: 16, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 18, shadowOffset: { width: 0, height: 10 }, elevation: 12 },
  close: { position: 'absolute', top: 8, right: 10, width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
  tag: { fontSize: 10.5, fontWeight: '800', marginBottom: 4, paddingRight: 30 },
  h: { fontWeight: '800', lineHeight: 28, marginBottom: 6, paddingRight: 26 },
  clock: { flexDirection: 'row', justifyContent: 'center', marginVertical: 8 },
  clockCell: { minWidth: 48, paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8, alignItems: 'center', marginHorizontal: 3 },
  clockNum: { fontSize: 20, fontWeight: '800', fontVariant: ['tabular-nums'] },
  clockLbl: { fontSize: 9, fontWeight: '600', letterSpacing: 0.8, opacity: 0.8, marginTop: 2 },
  cta: { marginTop: 10, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 10, alignItems: 'center' },
  ctaText: { fontSize: 15, fontWeight: '800' },
  barTrack: { height: 6, borderRadius: 6, backgroundColor: '#0b1226', marginTop: 10, marginBottom: 6, overflow: 'hidden' },
  barFill: { height: '100%', backgroundColor: '#ffb020' },
  seats: { fontSize: 11, color: '#c9cfe3' },
  bubbles: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 10, paddingRight: 30 },
  bubbleRow: { flexDirection: 'row', alignItems: 'center' },
  bubble: { width: 15, height: 15, borderRadius: 8, borderWidth: 1.5, borderColor: '#1b1b1b', marginRight: 5 },
  scrCard: { height: 96, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderStyle: 'dashed', borderColor: '#f5a623', backgroundColor: '#fff7e0', alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  scrWin: { fontSize: 26, fontWeight: '800', color: '#d98b0a' },
  scrHint: { fontSize: 12, fontWeight: '700', color: '#555' },
  rxHead: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: '#10263d', paddingBottom: 8, marginBottom: 8 },
  rxDoc: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#f5a623', alignItems: 'center', justifyContent: 'center', marginRight: 10 },
  stamp: { position: 'absolute', right: 14, top: 62, transform: [{ rotate: '-12deg' }], borderWidth: 2, borderColor: '#b00020', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 3, opacity: 0.85 },
  stampText: { color: '#b00020', fontSize: 10, fontWeight: '800', letterSpacing: 1.2 },
});

// A bad offer from the server must never take the app down: if the popup throws,
// it just disappears (no reload, no error screen).
class SilentBoundary extends React.Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    if (__DEV__) console.warn('[OfferPopup] hidden after error', error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function OfferPopup() {
  return (
    <SilentBoundary>
      <OfferPopupInner />
    </SilentBoundary>
  );
}
