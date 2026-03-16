import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, StatusBar } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

interface RuleItem {
  icon:  React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  body:  string;
}

const RULES: RuleItem[] = [
  {
    icon:  'arrow-forward-outline',
    title: 'Movement',
    body:  'Pieces advance forward only — straight or diagonally. No jumping over pieces, no captures.',
  },
  {
    icon:  'color-palette-outline',
    title: 'The Color Lock',
    body:  'When your piece lands on a colored square, your opponent must move the piece that matches that color. This forced chain reaction is the strategic core of Kamisado.',
  },
  {
    icon:  'trophy-outline',
    title: 'Victory Condition',
    body:  "Advance any of your pieces onto the opponent's back rank to win the round.",
  },
  {
    icon:  'refresh-outline',
    title: 'Rule M6 — Forfeit',
    body:  'If the forced piece has no legal moves, that player forfeits their turn. The forced color resets to the square currently occupied by the trapped piece.',
  },
  {
    icon:  'ban-outline',
    title: 'Rule M8 — Repetition Loss',
    body:  'If you cause the same board position to repeat within the last 10 moves, you immediately lose the round.',
  },
];

export default function RulesScreen(): React.JSX.Element {
  const navigation = useNavigation();

  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(20);

  useEffect(() => {
    opacity.value    = withTiming(1, { duration: 450 });
    translateY.value = withTiming(0, { duration: 450 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.content, animatedStyle]}>

          <Text style={styles.title}>GAME RULES</Text>
          <Text style={styles.subtitle}>STRATEGY GUIDE</Text>

          {RULES.map(rule => (
            <View key={rule.title} style={styles.ruleCard}>
              <View style={styles.ruleIconWrap}>
                <Ionicons name={rule.icon} size={20} color="#94A3B8" />
              </View>
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleBody}>{rule.body}</Text>
            </View>
          ))}

          <View style={styles.strategyCard}>
            <Text style={styles.strategyHeading}>STRATEGIC INSIGHT</Text>
            <Text style={styles.strategyBody}>
              Plan several moves ahead. The color you land on determines which
              piece your opponent is forced to move. Control the color chain —
              direct their pieces to squares that serve your advance, not theirs.
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="arrow-back-outline" size={16} color="#94A3B8" />
            <Text style={styles.backButtonText}>Back</Text>
          </Pressable>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#F8FAFC',
  },
  scrollContent: {
    flexGrow:          1,
    paddingHorizontal: 20,
    paddingVertical:   64,
  },
  content: {
    alignItems: 'center',
    gap:        12,
  },

  title: {
    color:         '#0F172A',
    fontSize:      28,
    fontWeight:    '900',
    letterSpacing: 6,
    textAlign:     'center',
  },
  subtitle: {
    color:         '#94A3B8',
    fontSize:      11,
    fontWeight:    '400',
    letterSpacing: 5,
    textAlign:     'center',
    marginBottom:  16,
  },

  ruleCard: {
    width:             '100%',
    backgroundColor:   '#FFFFFF',
    borderWidth:       1,
    borderColor:       'rgba(251,191,36,0.25)',
    borderRadius:      20,
    paddingVertical:   20,
    paddingHorizontal: 20,
    alignItems:        'center',
    gap:               6,
  },
  ruleIconWrap: {
    width:           40,
    height:          40,
    borderRadius:    12,
    backgroundColor: '#F1F5F9',
    borderWidth:     1,
    borderColor:     '#E2E8F0',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    4,
  },
  ruleTitle: {
    color:         '#0F172A',
    fontSize:      14,
    fontWeight:    '700',
    letterSpacing: 0.5,
    textAlign:     'center',
  },
  ruleBody: {
    color:      '#64748B',
    fontSize:   13,
    fontWeight: '400',
    lineHeight: 21,
    textAlign:  'center',
    marginTop:  2,
  },

  strategyCard: {
    width:             '100%',
    backgroundColor:   '#FFFBEB',
    borderWidth:       1,
    borderColor:       'rgba(251,191,36,0.45)',
    borderRadius:      20,
    paddingVertical:   20,
    paddingHorizontal: 20,
    alignItems:        'center',
    gap:               8,
    marginTop:         4,
  },
  strategyHeading: {
    color:         '#92400E',
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 2.5,
  },
  strategyBody: {
    color:      '#78350F',
    fontSize:   13,
    fontWeight: '400',
    lineHeight: 21,
    textAlign:  'center',
  },

  backButton: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               6,
    paddingVertical:   10,
    paddingHorizontal: 20,
    borderRadius:      12,
    marginTop:         8,
  },
  backButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  backButtonText: {
    color:         '#94A3B8',
    fontSize:      13,
    fontWeight:    '500',
    letterSpacing: 0.5,
  },
});
