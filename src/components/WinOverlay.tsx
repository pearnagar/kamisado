import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GameStatus } from '../constants/gameConstants';

interface WinOverlayProps {
  status: GameStatus;
  onReset: () => void;
}

const STATUS_LABEL: Partial<Record<GameStatus, string>> = {
  [GameStatus.WonPlayer1]: 'White Wins!',
  [GameStatus.WonPlayer2]: 'Black Wins!',
  [GameStatus.Draw]:       "It's a Draw!",
};

export default function WinOverlay({ status, onReset }: WinOverlayProps): React.JSX.Element {
  const opacity = useSharedValue(0);
  const isVisible = status !== GameStatus.Active;

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: 350 });
  }, [isVisible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleReset = (): void => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onReset();
  };

  // Keep in tree so Reanimated can animate out; pointer events off when hidden
  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[styles.overlay, overlayStyle]}
    >
      <Text style={styles.title}>{STATUS_LABEL[status] ?? ''}</Text>
      <Pressable
        onPress={handleReset}
        style={({ pressed }) => [styles.button, pressed && styles.buttonPressed]}
      >
        <Text style={styles.buttonText}>New Game</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: 1,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  buttonText: {
    color: '#0F172A',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
