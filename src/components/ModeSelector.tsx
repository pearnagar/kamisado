import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { GameMode } from '../constants/gameConstants';

interface ModeSelectorProps {
  value:    GameMode;
  onChange: (mode: GameMode) => void;
}

const MODES: { key: GameMode; label: string }[] = [
  { key: GameMode.Single, label: '1 Game'      },
  { key: GameMode.Match,  label: 'Match (3)'   },
];

export default function ModeSelector({ value, onChange }: ModeSelectorProps): React.JSX.Element {
  const handlePress = (mode: GameMode): void => {
    if (mode === value) return;
    Haptics.selectionAsync();
    onChange(mode);
  };

  return (
    <View style={styles.row}>
      {MODES.map(({ key, label }, i) => {
        const isActive = key === value;
        const isFirst  = i === 0;
        const isLast   = i === MODES.length - 1;
        return (
          <Pressable
            key={key}
            onPress={() => handlePress(key)}
            style={[
              styles.segment,
              isFirst  && styles.segmentFirst,
              isLast   && styles.segmentLast,
              isActive && styles.segmentActive,
            ]}
          >
            <Text style={[styles.label, isActive && styles.labelActive]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection:  'row',
    borderRadius:   20,
    borderWidth:    1,
    borderColor:    'rgba(255,255,255,0.2)',
    overflow:       'hidden',
  },
  segment: {
    paddingVertical:   9,
    paddingHorizontal: 18,
    backgroundColor:   'rgba(255,255,255,0.08)',
  },
  segmentFirst: {
    borderTopLeftRadius:    19,
    borderBottomLeftRadius: 19,
  },
  segmentLast: {
    borderTopRightRadius:    19,
    borderBottomRightRadius: 19,
  },
  segmentActive: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  label: {
    color:       'rgba(255,255,255,0.65)',
    fontSize:    12,
    fontWeight:  '600',
    letterSpacing: 0.2,
  },
  labelActive: {
    color: '#0F172A',
  },
});
