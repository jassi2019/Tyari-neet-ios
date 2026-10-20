import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

const logo = require('../../assets/icon.png');

type Props = {
  size?: number;
  label?: string;
};

// Brand loader: the mascot gently pulses inside a spinning yellow ring.
// Replaces the plain ActivityIndicator on full-screen loading states.
export default function BrandLoader({ size = 84, label }: Props) {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const spinLoop = Animated.loop(
      Animated.timing(spin, {
        toValue: 1,
        duration: 1100,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    spinLoop.start();
    pulseLoop.start();
    return () => {
      spinLoop.stop();
      pulseLoop.stop();
    };
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] });
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [0.94, 1.04] });
  const ring = Math.max(4, Math.round(size / 18));
  const inner = size - ring * 2 - 6;

  return (
    <View style={styles.wrap} accessibilityRole="progressbar" accessibilityLabel={label || 'Loading'}>
      <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        <Animated.View
          style={[
            styles.ring,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              borderWidth: ring,
              transform: [{ rotate }],
            },
          ]}
        />
        <Animated.Image
          source={logo}
          style={{ width: inner, height: inner, borderRadius: inner / 2, transform: [{ scale }] }}
          resizeMode="cover"
        />
      </View>
      {label ? <Text style={styles.label}>{label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    borderColor: '#F5A623',
    borderTopColor: 'rgba(245, 166, 35, 0.18)',
    borderRightColor: 'rgba(245, 166, 35, 0.45)',
  },
  label: { marginTop: 12, color: '#6B7280', fontSize: 14 },
});

