import React, { memo, useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  runOnJS,
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
  /** If set, dragon slides OUT to this pixel offset (source-cell-relative coords). */
  animateTo?: { dx: number; dy: number };
  onAnimationComplete?: () => void;
  /** When toggled to true, plays a horizontal shake to signal the piece is blocked. */
  shakeNow?: boolean;
  onPress?: () => void;
}

const Dragon = memo(function Dragon({
  color,
  player,
  cellSize,
  selected,
  animateTo,
  onAnimationComplete,
  shakeNow,
  onPress,
}: DragonProps): React.JSX.Element {
  const size = cellSize * 0.82;
  const stoneColor = player === Player.White ? '#FFFFFF' : '#1A1A1A';
  const kanjiColor = COLOR_HEX[color];

  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);

  // Pulse when selected
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

  // Shake to signal piece is deadlocked
  useEffect(() => {
    if (!shakeNow) return;
    translateX.value = withSequence(
      withTiming(-6, { duration: 55 }),
      withTiming( 6, { duration: 55 }),
      withTiming(-4, { duration: 55 }),
      withTiming( 4, { duration: 55 }),
      withTiming( 0, { duration: 55 }),
    );
  }, [shakeNow]);

  // Slide out toward destination cell — board state updates only after this finishes.
  // The Dragon starts at (0,0) (its natural cell position) so there is no ghost frame.
  useEffect(() => {
    if (!animateTo) return;
    translateX.value = withTiming(animateTo.dx, { duration: 280 });
    translateY.value = withTiming(animateTo.dy, { duration: 280 }, (finished) => {
      'worklet';
      if (finished && onAnimationComplete) runOnJS(onAnimationComplete)();
    });
  }, [animateTo]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  const handlePress = (): void => {
    Haptics.selectionAsync();
    onPress?.();
  };

  return (
    // renderToHardwareTextureAndroid: composites into a GPU texture before
    // drawing, eliminating redraws during transform-only animations on Android.
    <Animated.View style={[styles.shadow, animatedStyle]} renderToHardwareTextureAndroid>
      <Pressable
        onPress={handlePress}
        android_ripple={null}
        style={() => [styles.stone, { width: size, height: size, backgroundColor: stoneColor }]}
      >
        {/* Camber bevel — simulates curved stone surface catching light */}
        <View pointerEvents="none" style={styles.bevel} />
        <Text style={[styles.kanji, { color: kanjiColor, fontSize: size * 0.6 }]}>
          {COLOR_KANJI[color]}
        </Text>
      </Pressable>
    </Animated.View>
  );
}, (prev, next) =>
  prev.color              === next.color              &&
  prev.player             === next.player             &&
  prev.cellSize           === next.cellSize           &&
  prev.selected           === next.selected           &&
  prev.shakeNow           === next.shakeNow           &&
  prev.onPress            === next.onPress            &&
  prev.onAnimationComplete === next.onAnimationComplete &&
  prev.animateTo?.dx      === next.animateTo?.dx      &&
  prev.animateTo?.dy      === next.animateTo?.dy,
);

export default Dragon;

const styles = StyleSheet.create({
  shadow: {
    shadowColor:   '#000',
    shadowOffset:  { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius:  4,
    elevation:     8,
  },
  stone: {
    borderRadius: 999,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
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
