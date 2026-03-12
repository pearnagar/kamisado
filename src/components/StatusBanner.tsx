import React, { useEffect } from 'react';
import { StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';

const BANNER_HEIGHT = 52;

interface StatusBannerProps {
  visible: boolean;
  message: string;
}

export default function StatusBanner({ visible, message }: StatusBannerProps): React.JSX.Element {
  const translateY = useSharedValue(-BANNER_HEIGHT);

  useEffect(() => {
    translateY.value = withTiming(visible ? 0 : -BANNER_HEIGHT, { duration: 320 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View pointerEvents="none" style={[styles.banner, animatedStyle]}>
      <Text style={styles.text}>{message}</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BANNER_HEIGHT,
    backgroundColor: 'rgba(255, 140, 0, 0.93)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 10,
  },
  text: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
