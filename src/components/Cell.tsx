import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { KamisadoColor, COLOR_HEX } from '../constants/gameConstants';

interface CellProps {
  color: KamisadoColor;
  size: number;
  selected?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}

const Cell = memo(function Cell({ color, size, selected, onPress, children }: CellProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      android_ripple={null}
      style={() => [styles.cell, { width: size, height: size, backgroundColor: COLOR_HEX[color] }]}
    >
      <View pointerEvents="none" style={styles.bevel} />
      {children}
      {selected && (
        <View pointerEvents="none" style={styles.selectedOverlay} />
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bevel: {
    position:          'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    borderTopWidth:    2,
    borderLeftWidth:   2,
    borderBottomWidth: 2,
    borderRightWidth:  2,
    borderTopColor:    'rgba(255,255,255,0.35)',
    borderLeftColor:   'rgba(255,255,255,0.20)',
    borderBottomColor: 'rgba(0,0,0,0.20)',
    borderRightColor:  'rgba(0,0,0,0.12)',
  },
  selectedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 4,
  },
});

export default Cell;
