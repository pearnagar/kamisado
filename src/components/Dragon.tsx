import React, { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { KamisadoColor, Player, COLOR_KANJI, COLOR_HEX } from '../constants/gameConstants';

interface DragonProps {
  color: KamisadoColor;
  player: Player;
  cellSize: number;
  selected?: boolean;
  onPress?: () => void;
}

export default function Dragon({ color, player, cellSize, selected, onPress }: DragonProps): React.JSX.Element {
  const size = cellSize * 0.82;
  const stoneColor = player === Player.White ? '#FFFFFF' : '#1A1A1A';
  const kanjiColor = COLOR_HEX[color];

  const scale = useSharedValue(1);

  useEffect(() => {
    if (selected) {
      scale.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 400 }),
          withTiming(1.0, { duration: 400 }),
        ),
        -1,
      );
    } else {
      scale.value = withTiming(1.0, { duration: 150 });
    }
  }, [selected]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = (): void => {
    Haptics.selectionAsync();
    onPress?.();
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={handlePress}
        style={[styles.stone, { width: size, height: size, backgroundColor: stoneColor }]}
      >
        {/* Camber bevel — simulates curved stone surface catching light */}
        <View pointerEvents="none" style={styles.bevel} />
        <Text style={[styles.kanji, { color: kanjiColor, fontSize: size * 0.6 }]}>
          {COLOR_KANJI[color]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stone: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
  bevel: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 999,
    borderWidth: 3,
    borderTopColor: 'rgba(255,255,255,0.4)',
    borderLeftColor: 'rgba(255,255,255,0.15)',
    borderBottomColor: 'rgba(0,0,0,0.4)',
    borderRightColor: 'rgba(0,0,0,0.15)',
  },
  kanji: {
    fontWeight: '400',
  },
});
