import React from 'react';
import {
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const logoSource = require('../../../../assets/icon.png');
const bgImage = require('../../../../assets/bg-image.jpg');

const { height } = Dimensions.get('window');

const Landing = ({ navigation }: { navigation: any }) => {
  const { enterGuestMode } = useAuth();
  const statusBarTop = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  return (
    <ImageBackground
      source={bgImage}
      style={[styles.container, { paddingTop: statusBarTop }]}
      resizeMode="cover"
    >
      {/* Dark overlay to reduce transparency */}
      <View style={styles.overlay} pointerEvents="none" />

      {/* Main Container */}
      <View style={[styles.mainContainer, Platform.OS === 'web' ? styles.mainContainerWeb : null]}>

        {/* Logo and Brand */}
        <View style={styles.logoContainer}>
          <Image source={logoSource} style={styles.logoImage} />
          <View>
            <Text style={styles.logoText}>Taiyari NEET ki</Text>
            <Text style={styles.logoTagline}>Smart Preparation</Text>
          </View>
        </View>

        {/* Main Content */}
        <View style={styles.contentContainer}>
          <View style={styles.spacer}>
            {/* Hero section */}
            <View style={styles.heroSection}>
              <View style={styles.bigIconCircle}>
                <Image source={logoSource} style={styles.bigIconImage} />
              </View>
              <View style={styles.namastePill}>
                <Text style={styles.namasteText}>Namaste! 👋</Text>
              </View>
              <Text style={styles.heroTitle}>
                Welcome to{'\n'}
                <Text style={styles.heroTitleAccent}>Taiyari NEET ki</Text>
              </Text>
              <Text style={styles.heroSubtitle}>India's #1 Smart NEET Preparation App</Text>

              {/* Feature Badges */}
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>📖 Build from Basics</Text></View>
                <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>💪 Strengthen with Practice</Text></View>
              </View>
              <View style={styles.badgeRow}>
                <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>🧠 Concepts</Text></View>
                <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>📝 Back Exercise</Text></View>
                <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>🏆 Exemplar</Text></View>
                <View style={styles.badge}><Text style={styles.badgeText} numberOfLines={1}>📋 PYQs</Text></View>
              </View>
            </View>
          </View>

          {/* Bottom Content */}
          <View style={[styles.bottomContainer, Platform.OS === 'web' ? styles.bottomContainerWeb : null]}>
            <View style={styles.bottomCard}>
              {/* Get Started Button */}
              <TouchableOpacity
                style={styles.getStartedButton}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('SetEmail')}
              >
                <Text style={styles.getStartedButtonText}>Get Started →</Text>
              </TouchableOpacity>

              {/* Guest Mode — iOS only */}
              {Platform.OS === 'ios' && (
                <TouchableOpacity
                  style={styles.guestButton}
                  activeOpacity={0.8}
                  onPress={enterGuestMode}
                >
                  <Text style={styles.guestButtonText}>Continue as Guest</Text>
                </TouchableOpacity>
              )}

              {/* Terms and Privacy */}
              <Text style={styles.termsText}>
                By Signing Up, I agree to the{' '}
                <Text style={styles.linkText} onPress={() => navigation.navigate('TermsAndConditions')}>
                  Terms & Conditions
                </Text>{' '}
                and{' '}
                <Text style={styles.linkText} onPress={() => navigation.navigate('Privacy')}>
                  Privacy Policy
                </Text>
              </Text>
            </View>
          </View>
        </View>
      </View>
    </ImageBackground>
  );
};

const isAndroid = Platform.OS === 'android';
const isSmallAndroid = isAndroid && height < 700;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FED93A',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(254, 217, 58, 0.55)',
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: isAndroid ? 12 : 32,
  },
  mainContainerWeb: {
    width: '100%',
    maxWidth: 520,
    alignSelf: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: isAndroid ? 0 : 8,
  },
  logoImage: {
    width: isAndroid ? 38 : 42,
    height: isAndroid ? 38 : 42,
    borderRadius: isAndroid ? 19 : 21,
  },
  logoText: {
    fontSize: isAndroid ? 17 : 18,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  logoTagline: {
    fontSize: 10,
    fontWeight: '600',
    color: '#78350f',
    letterSpacing: 0.5,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'space-between',
  },
  spacer: {
    flex: 1,
    justifyContent: 'center',
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: isAndroid ? 0 : height * 0.02,
  },
  bigIconCircle: {
    width: isSmallAndroid ? 70 : isAndroid ? 76 : 90,
    height: isSmallAndroid ? 70 : isAndroid ? 76 : 90,
    borderRadius: isSmallAndroid ? 35 : isAndroid ? 38 : 45,
    backgroundColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: isAndroid ? 12 : 20,
  },
  bigIconImage: {
    width: isSmallAndroid ? 54 : isAndroid ? 58 : 70,
    height: isSmallAndroid ? 54 : isAndroid ? 58 : 70,
    borderRadius: isSmallAndroid ? 27 : isAndroid ? 29 : 35,
  },
  namastePill: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    paddingHorizontal: isAndroid ? 14 : 16,
    paddingVertical: isAndroid ? 4 : 6,
    marginBottom: isAndroid ? 8 : 14,
  },
  namasteText: {
    fontSize: isAndroid ? 13 : 15,
    fontWeight: '600',
    color: '#78350f',
  },
  heroTitle: {
    fontSize: isSmallAndroid ? 26 : isAndroid ? 28 : 34,
    fontWeight: '900',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: isSmallAndroid ? 32 : isAndroid ? 34 : 40,
    marginBottom: isAndroid ? 6 : 10,
  },
  heroTitleAccent: {
    color: '#78350f',
  },
  heroSubtitle: {
    fontSize: isAndroid ? 12 : 14,
    color: '#1a1a1a',
    fontWeight: '600',
    marginBottom: isAndroid ? 10 : 18,
    textAlign: 'center',
  },
  badgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: isAndroid ? 5 : 8,
    marginBottom: isAndroid ? 5 : 8,
  },
  badge: {
    backgroundColor: 'rgba(255,255,255,0.75)',
    borderRadius: 20,
    paddingHorizontal: isAndroid ? 10 : 14,
    paddingVertical: isAndroid ? 4 : 7,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  badgeText: {
    fontSize: isAndroid ? 10 : 12,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bottomContainer: {
    marginBottom: isAndroid ? 20 : 48,
  },
  bottomContainerWeb: {
    marginBottom: 24,
  },
  bottomCard: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 20,
    padding: isAndroid ? 14 : 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  getStartedButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: isAndroid ? 12 : 16,
    borderRadius: 12,
    marginBottom: isAndroid ? 8 : 12,
  },
  getStartedButtonText: {
    color: '#FED93A',
    textAlign: 'center',
    fontSize: isAndroid ? 15 : 17,
    fontWeight: '700',
  },
  guestButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    paddingVertical: isAndroid ? 12 : 16,
    borderRadius: 12,
    marginBottom: isAndroid ? 8 : 12,
  },
  guestButtonText: {
    color: '#1a1a1a',
    textAlign: 'center',
    fontSize: isAndroid ? 15 : 17,
    fontWeight: '600',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#44403c',
    lineHeight: 18,
  },
  linkText: {
    color: '#78350f',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default Landing;
