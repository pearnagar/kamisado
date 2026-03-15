import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { GameMode, GameStatus, Player } from '../constants/gameConstants';
import { playSound } from '../utils/soundManager';

interface WinOverlayProps {
  status:     GameStatus;
  gameMode:   GameMode;
  matchScore: { readonly p1: number; readonly p2: number };
  onReset:    () => void;
  onGoBack:   () => void;
}

const WINNER: Partial<Record<GameStatus, Player>> = {
  [GameStatus.WonPlayer1]:         Player.White,
  [GameStatus.WonPlayer2]:         Player.Black,
  [GameStatus.WonPlayer1_Timeout]: Player.White,
  [GameStatus.WonPlayer2_Timeout]: Player.Black,
};

const isTimeoutStatus = (s: GameStatus): boolean =>
  s === GameStatus.WonPlayer1_Timeout || s === GameStatus.WonPlayer2_Timeout;

function buildTitle(status: GameStatus, gameMode: GameMode): string {
  if (status === GameStatus.Draw) return "It's a Draw!";
  const winner = WINNER[status];
  if (winner === undefined)       return '';
  if (isTimeoutStatus(status))    return `${winner} Wins! (by Timeout)`;
  const suffix = gameMode === GameMode.Single ? 'Wins!' : 'wins the Match!';
  return `${winner} ${suffix}`;
}

function buildScore(status: GameStatus, gameMode: GameMode, matchScore: WinOverlayProps['matchScore']): string {
  if (isTimeoutStatus(status))    return '';  // timeout ends match instantly — no partial score line
  if (gameMode === GameMode.Single) return '';
  if (status === GameStatus.Draw)   return '';
  return `${matchScore.p1} — ${matchScore.p2}`;
}

export default function WinOverlay({ status, gameMode, matchScore, onReset, onGoBack }: WinOverlayProps): React.JSX.Element {
  const opacity   = useSharedValue(0);
  const isVisible = status !== GameStatus.Active;

  useEffect(() => {
    if (isVisible) playSound('win');
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
      <Pressable
        onPress={onGoBack}
        style={({ pressed }) => [styles.menuButton, pressed && styles.menuButtonPressed]}
      >
        <Text style={styles.menuButtonText}>Main Menu</Text>
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
  menuButton: {
    paddingVertical:   10,
    paddingHorizontal: 32,
    borderRadius:      12,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.35)',
  },
  menuButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  menuButtonText: {
    color:         'rgba(255,255,255,0.7)',
    fontSize:      14,
    fontWeight:    '600',
    letterSpacing: 0.3,
  },
});
