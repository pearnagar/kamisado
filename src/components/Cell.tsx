import React, { memo } from 'react';
import { Pressable } from 'react-native';
import { KamisadoColor } from '../constants/gameConstants';

const COLOR_HEX: Readonly<Record<KamisadoColor, string>> = {
  [KamisadoColor.Orange]: '#FF8C00',
  [KamisadoColor.Blue]:   '#1E90FF',
  [KamisadoColor.Purple]: '#9B30FF',
  [KamisadoColor.Pink]:   '#FF69B4',
  [KamisadoColor.Yellow]: '#FFD700',
  [KamisadoColor.Red]:    '#DC143C',
  [KamisadoColor.Green]:  '#228B22',
  [KamisadoColor.Brown]:  '#8B4513',
} as const;

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
      style={{
        width: size,
        height: size,
        backgroundColor: COLOR_HEX[color],
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: selected ? 3 : 0,
        borderColor: selected ? '#FFFFFF' : 'transparent',
        boxSizing: 'border-box',
      }}
    >
      {children}
    </Pressable>
  );
});

export default Cell;
export { COLOR_HEX };
