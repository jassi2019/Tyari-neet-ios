import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const logo = require('../../assets/icon.png');

// Height of the bar itself (without the bottom safe-area inset). Sized to cover the
// strip at the bottom of a Canva embed where its branding and controls live.
export const CANVA_FOOTER_HEIGHT = 58;

type Props = {
  hasPrev: boolean;
  hasNext: boolean;
  page?: string | null;
  onPrev: () => void;
  onNext: () => void;
  bottomInset?: number;
  // Set for users without an active plan: shows the "Go Premium" call to action.
  onUpgrade?: () => void;
};

// Native bar drawn over the bottom of the lesson viewer. Anything Canva renders
// down there (logo, "Made with Canva", page controls) ends up underneath it, and
// the Prev / Next buttons here drive Canva's own slide navigation instead.
export default function CanvaFooterBar({ hasPrev, hasNext, page, onPrev, onNext, bottomInset = 0, onUpgrade }: Props) {
  const showNav = hasPrev || hasNext;
  const tagline = onUpgrade
    ? 'Saare chapters unlock karo ›'
    : showNav ? 'Padhte raho, aage badhte raho' : 'Poora padho, concept pakka karo';
  return (
    <LinearGradient
      colors={['#1B2550', '#111936']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.bar, { height: CANVA_FOOTER_HEIGHT + bottomInset, paddingBottom: bottomInset }]}
    >
      <View style={styles.accent} />
      <View style={styles.row}>
        <View style={styles.brand}>
          <View style={styles.logoRing}>
            <Image source={logo} style={styles.logo} resizeMode="cover" />
          </View>
          <TouchableOpacity activeOpacity={0.7} disabled={!onUpgrade} onPress={onUpgrade} style={{ flexShrink: 1 }}>
            <Text style={styles.brandName} numberOfLines={1}>Taiyari NEET ki</Text>
            <Text style={[styles.brandTag, !!onUpgrade && styles.brandTagCta]} numberOfLines={1}>{tagline}</Text>
          </TouchableOpacity>
        </View>

        {!showNav && onUpgrade && (
          <TouchableOpacity
            accessibilityRole="button"
            accessibilityLabel="Go Premium"
            onPress={onUpgrade}
            activeOpacity={0.8}
            style={styles.upgradeBtn}
          >
            <Text style={styles.upgradeStar}>★</Text>
            <Text style={styles.upgradeText}>Go Premium</Text>
          </TouchableOpacity>
        )}

        {showNav && (
          <View style={styles.nav}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Previous slide"
              onPress={onPrev}
              disabled={!hasPrev}
              activeOpacity={0.7}
              style={[styles.navBtn, !hasPrev && styles.navBtnOff]}
            >
              <Text style={[styles.navText, !hasPrev && styles.navTextOff]}>‹</Text>
            </TouchableOpacity>
            {page ? <Text style={styles.page}>{page}</Text> : null}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Next slide"
              onPress={onNext}
              disabled={!hasNext}
              activeOpacity={0.7}
              style={[styles.navBtn, styles.navBtnNext, !hasNext && styles.navBtnOff]}
            >
              <Text style={[styles.navText, styles.navTextNext, !hasNext && styles.navTextOff]}>›</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  accent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#F6C228',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  brand: { flexDirection: 'row', alignItems: 'center', flexShrink: 1 },
  logoRing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: '#F6C228',
    overflow: 'hidden',
    marginRight: 10,
    backgroundColor: '#FFFFFF',
  },
  logo: { width: '100%', height: '100%' },
  brandName: { color: '#FFFFFF', fontSize: 14, fontWeight: '800', letterSpacing: 0.3 },
  brandTag: { color: '#C9D2F0', fontSize: 10.5, marginTop: 1 },
  brandTagCta: { color: '#F6C228', fontWeight: '700' },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6C228',
    paddingHorizontal: 14,
    height: 36,
    borderRadius: 18,
    marginLeft: 8,
    shadowColor: '#F6C228',
    shadowOpacity: 0.45,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  upgradeStar: { color: '#111936', fontSize: 13, marginRight: 5, marginTop: -1 },
  upgradeText: { color: '#111936', fontSize: 13, fontWeight: '800', letterSpacing: 0.2 },
  nav: { flexDirection: 'row', alignItems: 'center' },
  navBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#F6C228',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navBtnNext: { backgroundColor: '#F6C228' },
  navBtnOff: { opacity: 0.35 },
  navText: { color: '#F6C228', fontSize: 26, lineHeight: 28, fontWeight: '700', marginTop: -2 },
  navTextNext: { color: '#111936' },
  navTextOff: {},
  page: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginHorizontal: 10, minWidth: 36, textAlign: 'center' },
});
