import React, { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, StatusBar } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';

export default function RulesScreen(): React.JSX.Element {
  const navigation = useNavigation();

  const opacity     = useSharedValue(0);
  const translateY  = useSharedValue(24);

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
          <Text style={styles.title}>חוקי המשחק</Text>
          <Text style={styles.subtitle}>Rules coming soon in Phase 8</Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>Coming in Phase 8</Text>
            <Text style={styles.cardBody}>
              Full rules reference, move animations tutorial, and interactive
              examples will be added here.
            </Text>
          </View>

          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
          >
            <Text style={styles.backButtonText}>← חזרה</Text>
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
    justifyContent:    'center',
    alignItems:        'center',
    paddingHorizontal: 24,
    paddingVertical:   60,
  },
  title: {
    color:         '#FFFFFF',
    fontSize:      32,
    fontWeight:    '700',
    textAlign:     'center',
    letterSpacing: 0.5,
    marginBottom:  8,
  },
  subtitle: {
    color:        'rgba(255,255,255,0.45)',
    fontSize:     14,
    textAlign:    'center',
    marginBottom: 40,
  },
  card: {
    width:           '100%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.13)',
    borderRadius:    24,
    padding:         28,
    marginBottom:    32,
    alignItems:      'center',
  },
  cardTitle: {
    color:         '#FFFFFF',
    fontSize:      18,
    fontWeight:    '600',
    textAlign:     'center',
    marginBottom:  12,
  },
  cardBody: {
    color:      'rgba(255,255,255,0.55)',
    fontSize:   14,
    lineHeight: 22,
    textAlign:  'center',
  },
  backButton: {
    paddingVertical:   12,
    paddingHorizontal: 32,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.2)',
  },
  backButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  backButtonText: {
    color:      'rgba(255,255,255,0.6)',
    fontSize:   14,
    fontWeight: '500',
  },
});
