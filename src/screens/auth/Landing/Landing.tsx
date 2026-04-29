import React from 'react';
import {
  Dimensions,
  Image,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

const logoSource = require('../../../../assets/icon.png');

const { height } = Dimensions.get('window');

const Landing = ({ navigation }: { navigation: any }) => {
  const { enterGuestMode } = useAuth();
  const statusBarTop = Platform.OS === 'android' ? StatusBar.currentHeight ?? 0 : 0;

  return (
    <View style={[styles.container, { paddingTop: statusBarTop }]}>
      {/* Decorative circles */}
      <View style={[styles.decorCircle, styles.decorCircle1]} pointerEvents="none" />
      <View style={[styles.decorCircle, styles.decorCircle2]} pointerEvents="none" />
      <View style={[styles.decorCircle, styles.decorCircle3]} pointerEvents="none" />

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
          <View style={[styles.spacer, Platform.OS === 'web' ? styles.spacerWeb : null]}>
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
              <View style={styles.featurePills}>
                <View style={styles.featurePill}>
                  <Text style={styles.featurePillText}>📚 NCERT</Text>
                </View>
                <View style={styles.featurePill}>
                  <Text style={styles.featurePillText}>🧠 AI Tests</Text>
                </View>
                <View style={styles.featurePill}>
                  <Text style={styles.featurePillText}>🏆 Rank</Text>
                </View>
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#F59E0B',
    width: '100%',
  },
  decorCircle: {
    position: 'absolute',
    borderRadius: 9999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  decorCircle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  decorCircle2: {
    width: 200,
    height: 200,
    top: height * 0.15,
    left: -60,
  },
  decorCircle3: {
    width: 150,
    height: 150,
    bottom: height * 0.25,
    right: -40,
  },
  mainContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
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
    marginTop: 8,
  },
  logoImage: {
    width: 42,
    height: 42,
    borderRadius: 21,
  },
  logoText: {
    fontSize: 18,
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
  spacerWeb: {
    flex: 0,
    marginBottom: 24,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: height * 0.02,
  },
  bigIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  bigIconImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
  },
  namastePill: {
    backgroundColor: 'rgba(255,255,255,0.45)',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 14,
  },
  namasteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#78350f',
  },
  heroTitle: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1a1a1a',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 10,
  },
  heroTitleAccent: {
    color: '#fff',
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#44403c',
    fontWeight: '500',
    marginBottom: 18,
    textAlign: 'center',
  },
  featurePills: {
    flexDirection: 'row',
    gap: 8,
  },
  featurePill: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  featurePillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  bottomContainer: {
    marginBottom: 48,
  },
  bottomContainerWeb: {
    marginBottom: 24,
  },
  bottomCard: {
    backgroundColor: 'rgba(255,255,255,0.6)',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  getStartedButton: {
    backgroundColor: '#1a1a1a',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  getStartedButtonText: {
    color: '#F59E0B',
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '700',
  },
  guestButton: {
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#1a1a1a',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  guestButtonText: {
    color: '#1a1a1a',
    textAlign: 'center',
    fontSize: 17,
    fontWeight: '600',
  },
  termsText: {
    textAlign: 'center',
    fontSize: 12,
    color: '#6b7280',
    lineHeight: 18,
  },
  linkText: {
    color: '#78350f',
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});

export default Landing;
