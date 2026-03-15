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
    body:  'Pieces move forward only — straight or diagonal. No jumping, no captures.',
  },
  {
    icon:  'color-palette-outline',
    title: 'The Lock Mechanic',
    body:  'When your piece lands on a colored cell, your opponent must move the piece matching that color. This chain reaction is the heart of Kamisado.',
  },
  {
    icon:  'trophy-outline',
    title: 'Win Condition',
    body:  "Land any piece on the opponent\u2019s back rank to win the round.",
  },
  {
    icon:  'refresh-outline',
    title: 'Rule M6 — Forfeit',
    body:  'If the forced piece has no legal moves, that player forfeits their turn. The new forced color is the cell color under the trapped piece.',
  },
  {
    icon:  'ban-outline',
    title: 'Rule M8 — Loop Loss',
    body:  'Causing the same board position to repeat within the last 10 moves results in an immediate loss.',
  },
];

export default function RulesScreen(): React.JSX.Element {
  const navigation = useNavigation();

  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(24);

  useEffect(() => {
    opacity.value    = withTiming(1, { duration: 400 });
    translateY.value = withTiming(0, { duration: 400 });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={animatedStyle}>

          <Text style={styles.title}>GAME RULES</Text>
          <Text style={styles.subtitle}>& STRATEGY GUIDE</Text>

          {RULES.map(rule => (
            <View key={rule.title} style={styles.ruleCard}>
              <Ionicons
                name={rule.icon}
                size={22}
                color="rgba(255,255,255,0.55)"
                style={{ marginBottom: 8 }}
              />
              <Text style={styles.ruleTitle}>{rule.title}</Text>
              <Text style={styles.ruleBody}>{rule.body}</Text>
            </View>
          ))}

          <View style={styles.strategyCard}>
            <Text style={styles.strategyHeading}>STRATEGY TIP</Text>
            <Text style={styles.strategyBody}>
              Think several moves ahead — the color you land on dictates your
              opponent&apos;s next piece. Force them onto a color that benefits you,
              not them.
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Ionicons name="arrow-back-outline" size={16} color="rgba(255,255,255,0.5)" />
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
    backgroundColor: '#0F172A',
  },
  scrollContent: {
    flexGrow:          1,
    paddingHorizontal: 20,
    paddingVertical:   64,
    alignItems:        'center',
    gap:               12,
  },

  title: {
    color:         '#FFFFFF',
    fontSize:      28,
    fontWeight:    '800',
    letterSpacing: 6,
    textAlign:     'center',
  },
  subtitle: {
    color:         'rgba(255,255,255,0.28)',
    fontSize:      11,
    fontWeight:    '300',
    letterSpacing: 4,
    textAlign:     'center',
    marginBottom:  16,
  },

  ruleCard: {
    width:             '100%',
    backgroundColor:   'rgba(255,255,255,0.05)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.09)',
    borderRadius:      20,
    paddingVertical:   20,
    paddingHorizontal: 20,
    alignItems:        'center',
    gap:               4,
  },
  ruleTitle: {
    color:         '#FFFFFF',
    fontSize:      14,
    fontWeight:    '700',
    letterSpacing: 0.8,
    textAlign:     'center',
  },
  ruleBody: {
    color:      'rgba(255,255,255,0.48)',
    fontSize:   13,
    fontWeight: '300',
    lineHeight: 20,
    textAlign:  'center',
    marginTop:  4,
  },

  strategyCard: {
    width:             '100%',
    backgroundColor:   'rgba(99,102,241,0.10)',
    borderWidth:       1,
    borderColor:       'rgba(99,102,241,0.25)',
    borderRadius:      20,
    paddingVertical:   20,
    paddingHorizontal: 20,
    alignItems:        'center',
    gap:               8,
    marginTop:         4,
  },
  strategyHeading: {
    color:         'rgba(165,180,252,0.9)',
    fontSize:      11,
    fontWeight:    '700',
    letterSpacing: 2.5,
  },
  strategyBody: {
    color:      'rgba(199,210,254,0.65)',
    fontSize:   13,
    fontWeight: '300',
    lineHeight: 20,
    textAlign:  'center',
  },

  backButton: {
    flexDirection:   'row',
    alignItems:      'center',
    gap:             6,
    paddingVertical:   10,
    paddingHorizontal: 20,
    borderRadius:      12,
    marginTop:         8,
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  backButtonText: {
    color:         'rgba(255,255,255,0.45)',
    fontSize:      13,
    fontWeight:    '400',
    letterSpacing: 0.5,
  },
});
