import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GameMode, GameStatus, Player } from '../constants/gameConstants';

interface WinOverlayProps {
  status:     GameStatus;
  gameMode:   GameMode;
  matchScore: { readonly p1: number; readonly p2: number };
  onReset:    () => void;
}

const WINNER: Partial<Record<GameStatus, Player>> = {
  [GameStatus.WonPlayer1]: Player.White,
  [GameStatus.WonPlayer2]: Player.Black,
};

function buildTitle(status: GameStatus, gameMode: GameMode): string {
  const winner = WINNER[status];
  if (status === GameStatus.Draw)    return "It's a Draw!";
  if (winner === undefined)          return '';
  const suffix = gameMode === GameMode.Single ? 'Wins!' : 'wins the Match!';
  return `${winner} ${suffix}`;
}

function buildScore(status: GameStatus, gameMode: GameMode, matchScore: WinOverlayProps['matchScore']): string {
  if (gameMode === GameMode.Single) return '';
  if (status === GameStatus.Draw)   return '';
  const unit = gameMode === GameMode.Marathon ? ' pts' : '';
  return `${matchScore.p1}${unit} — ${matchScore.p2}${unit}`;
}

export default function WinOverlay({ status, gameMode, matchScore, onReset }: WinOverlayProps): React.JSX.Element {
  const opacity   = useSharedValue(0);
  const isVisible = status !== GameStatus.Active;

  useEffect(() => {
    opacity.value = withTiming(isVisible ? 1 : 0, { duration: 350 });
  }, [isVisible]);

  const overlayStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  const handleReset = (): void => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onReset();
  };

  const title    = buildTitle(status, gameMode);
  const scoreStr = buildScore(status, gameMode, matchScore);

  // Keep in tree so Reanimated can animate out; pointer events off when hidden
  return (
    <Animated.View
      pointerEvents={isVisible ? 'auto' : 'none'}
      style={[styles.overlay, overlayStyle]}
    >
      <Text style={styles.title}>{title}</Text>
      {scoreStr !== '' && (
        <View style={styles.scoreRow}>
          <Text style={styles.scoreLabel}>White</Text>
          <Text style={styles.scoreLine}>{scoreStr}</Text>
          <Text style={styles.scoreLabel}>Black</Text>
        </View>
      )}
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
    justifyContent:  'center',
    alignItems:      'center',
    gap:             20,
  },
  title: {
    color:         '#FFFFFF',
    fontSize:      28,
    fontWeight:    '700',
    letterSpacing: 1,
  },
  scoreRow: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            10,
  },
  scoreLabel: {
    color:      'rgba(255,255,255,0.5)',
    fontSize:   13,
    fontWeight: '500',
  },
  scoreLine: {
    color:         '#FFFFFF',
    fontSize:      22,
    fontWeight:    '700',
    letterSpacing: 1,
  },
  button: {
    paddingVertical:   14,
    paddingHorizontal: 40,
    backgroundColor:   '#FFFFFF',
    borderRadius:      12,
  },
  buttonPressed: {
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  buttonText: {
    color:         '#0F172A',
    fontSize:      16,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },
});
