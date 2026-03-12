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
      style={[styles.cell, { width: size, height: size, backgroundColor: COLOR_HEX[color] }]}
    >
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
