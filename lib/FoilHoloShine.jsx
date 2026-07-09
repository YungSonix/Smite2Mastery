import React, { useEffect, useRef } from 'react';
import { Animated, StyleSheet } from 'react-native';

/**
 * Diagonal holo sweep — RN-safe (transform + opacity only).
 */
export default function FoilHoloShine({
  active = true,
  shineColor = 'rgba(255, 255, 255, 0.42)',
  durationMs = 3200,
}) {
  const sweep = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return undefined;
    const sweepLoop = Animated.loop(
      Animated.timing(sweep, {
        toValue: 1,
        duration: durationMs,
        useNativeDriver: true,
      }),
    );
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1400, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1400, useNativeDriver: true }),
      ]),
    );
    sweepLoop.start();
    pulseLoop.start();
    return () => {
      sweepLoop.stop();
      pulseLoop.stop();
    };
  }, [active, durationMs, pulse, sweep]);

  if (!active) return null;

  const translateX = sweep.interpolate({
    inputRange: [0, 1],
    outputRange: [-140, 280],
  });

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.shineBand,
        {
          backgroundColor: shineColor,
          opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.14, 0.4] }),
          transform: [{ translateX }, { rotate: '22deg' }, { scaleY: 1.75 }],
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  shineBand: {
    position: 'absolute',
    top: -8,
    left: 0,
    width: '36%',
    height: '130%',
    borderRadius: 8,
  },
});
