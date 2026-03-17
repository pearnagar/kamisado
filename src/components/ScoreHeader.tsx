import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GameMode } from '../constants/gameConstants';

interface ScoreHeaderProps {
  gameMode:    GameMode;
  matchScore:  { readonly p1: number; readonly p2: number };
  roundNumber: number;
  boardWidth:  number;
}

export default function ScoreHeader({ gameMode, matchScore, roundNumber, boardWidth }: ScoreHeaderProps): React.JSX.Element {
  if (gameMode !== GameMode.Match) {
    return <View style={styles.placeholder} />;
  }

  return (
    <View style={[styles.row, { width: boardWidth }]}>
      <View style={styles.badge}>
        <Text style={styles.badgePlayer}>WHITE</Text>
        <Text style={styles.badgeScore}>{matchScore.p1}</Text>
      </View>

      <Text style={styles.round}>Round {roundNumber}</Text>

      <View style={styles.badge}>
        <Text style={styles.badgeScore}>{matchScore.p2}</Text>
        <Text style={styles.badgePlayer}>BLACK</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  placeholder: {
    height: 52,
  },
  row: {
    flexDirection:  'row',
    alignItems:     'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             8,
    paddingVertical:   8,
    paddingHorizontal: 12,
    borderRadius:    10,
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    borderWidth:     1,
    borderColor:     'rgba(212, 175, 55, 0.35)',
  },
  badgePlayer: {
    color:         '#64748B',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 1.5,
  },
  badgeScore: {
    color:         '#0F172A',
    fontSize:      18,
    fontWeight:    'bold',
    letterSpacing: 0.5,
  },
  round: {
    color:         '#94A3B8',
    fontSize:      11,
    fontWeight:    '500',
    letterSpacing: 0.4,
    textAlign:     'center',
    flex:          1,
  },
});
