import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameMode } from '../constants/gameConstants';

interface ScoreHeaderProps {
  gameMode:   GameMode;
  matchScore: { readonly p1: number; readonly p2: number };
  roundNumber: number;
}

/**
 * Displays a compact score bar above the board.
 * Only renders when a multi-round mode (Match / Marathon) is active.
 *
 * p1 = White (Player1), p2 = Black (Player2).
 * In Marathon mode the unit is "pts"; in Match mode it is the raw win count.
 */
export default function ScoreHeader({ gameMode, matchScore, roundNumber }: ScoreHeaderProps): React.JSX.Element {
  if (gameMode !== GameMode.Match) {
    return <View style={styles.placeholder} />;
  }

  const p1Label = `White  ${matchScore.p1}`;
  const p2Label = `${matchScore.p2}  Black`;

  return (
    <View style={styles.row}>
      <Text style={[styles.score, styles.left]}>{p1Label}</Text>
      <Text style={styles.round}>Round {roundNumber}</Text>
      <Text style={[styles.score, styles.right]}>{p2Label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Takes up the same vertical space as the header so layout doesn't shift. */
  placeholder: {
    height: 28,
  },
  row: {
    height:         28,
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    width:          352,   // 8 cells × 44px — matches boardWidth
  },
  score: {
    color:         'rgba(255,255,255,0.82)',
    fontSize:      13,
    fontWeight:    '600',
    letterSpacing: 0.2,
    flex:          1,
  },
  left: {
    textAlign: 'left',
  },
  right: {
    textAlign: 'right',
  },
  round: {
    color:         'rgba(255,255,255,0.45)',
    fontSize:      11,
    fontWeight:    '500',
    letterSpacing: 0.4,
    textAlign:     'center',
    flex:          1,
  },
});
