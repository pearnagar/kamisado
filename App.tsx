import React, { useState, useCallback, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  StatusBar,
  LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import Board from './src/components/Board';
import StatusBanner from './src/components/StatusBanner';
import RulesScreen from './src/screens/RulesScreen';

type GameMode     = 'pvp' | 'pve';
type Difficulty   = 'easy' | 'medium' | 'hard';
type MatchType    = 'single' | 'match';
type BoardVariant = 'standard' | 'mega';

type RootStackParamList = {
  Home:  undefined;
  Game:  { gameMode: GameMode; difficulty: Difficulty; matchType: MatchType; boardVariant: BoardVariant };
  Rules: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ---------------------------------------------------------------------------
// DifficultyPill
// ---------------------------------------------------------------------------
function DifficultyPill({
  label,
  active,
  onPress,
}: {
  label: string; active: boolean; onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.diffPill,
        active  && styles.diffPillActive,
        pressed && styles.diffPillPressed,
      ]}
    >
      <Text style={[styles.diffPillText, active && styles.diffPillTextActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// ModeCard — BlurView glassmorphism, horizontal layout, scale on press
// ---------------------------------------------------------------------------
function ModeCard({
  iconName,
  title,
  subtitle,
  selected,
  onPress,
  children,
}: {
  iconName:  React.ComponentProps<typeof Ionicons>['name'];
  title:     string;
  subtitle:  string;
  selected:  boolean;
  onPress:   () => void;
  children?: React.ReactNode;
}): React.JSX.Element {
  const scale = useSharedValue(1);
  const scaleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      onPress={() => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      onPressIn={() => { scale.value = withTiming(0.96, { duration: 90 }); }}
      onPressOut={() => { scale.value = withTiming(1.0, { duration: 170 }); }}
    >
      {/* Outer Animated.View handles scale + border + clip */}
      <Animated.View style={[
        styles.cardWrapper,
        selected && styles.cardWrapperSelected,
        scaleStyle,
      ]}>
        <BlurView intensity={22} tint="dark" style={styles.blurFill}>
          {/* Subtle white tint so card reads on any background */}
          <View style={[StyleSheet.absoluteFill, styles.cardTintOverlay,
            selected && styles.cardTintOverlaySelected,
          ]} />

          {/* Horizontal content row */}
          <View style={styles.cardRow}>
            <View style={[styles.cardIconWrap, selected && styles.cardIconWrapSelected]}>
              <Ionicons
                name={iconName}
                size={26}
                color={selected ? '#FFFFFF' : 'rgba(255,255,255,0.5)'}
              />
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                {title}
              </Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={18} color="rgba(255,255,255,0.55)" />
            )}
          </View>

          {children}
        </BlurView>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// SlidingSegment — segment control with animated background highlight
// ---------------------------------------------------------------------------
function SlidingSegment({
  options,
  value,
  onChange,
}: {
  options:  { label: string; value: string }[];
  value:    string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  const [containerWidth, setContainerWidth] = useState(0);
  const activeIndex  = options.findIndex(o => o.value === value);
  const sliderX      = useSharedValue(0);
  const optionWidth  = containerWidth > 0 ? containerWidth / options.length : 0;

  useEffect(() => {
    if (containerWidth > 0) {
      sliderX.value = withTiming(activeIndex * optionWidth, { duration: 220 });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, containerWidth]);

  const sliderStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: sliderX.value }],
  }));

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  }, []);

  return (
    <View style={styles.segmentWrap} onLayout={onLayout}>
      {/* Animated sliding highlight — rendered behind text */}
      {optionWidth > 0 && (
        <Animated.View style={[styles.segmentSlider, { width: optionWidth }, sliderStyle]} />
      )}
      {options.map(opt => (
        <Pressable
          key={opt.value}
          onPress={() => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            onChange(opt.value);
          }}
          style={styles.segmentOption}
        >
          <Text style={[styles.segmentText, value === opt.value && styles.segmentTextActive]}>
            {opt.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// HomeScreen
// ---------------------------------------------------------------------------
function HomeScreen({
  navigation,
}: NativeStackScreenProps<RootStackParamList, 'Home'>): React.JSX.Element {
  const [gameMode,     setGameMode]     = useState<GameMode>('pve');
  const [difficulty,   setDifficulty]   = useState<Difficulty>('medium');
  const [matchType,    setMatchType]    = useState<MatchType>('single');
  const [boardVariant, setBoardVariant] = useState<BoardVariant>('standard');

  // Staggered entrance:
  //   Header  — drops from y:-20 → 0
  //   Card 1  — slides up from y:30 → 0, delay 100ms
  //   Card 2  — slides up from y:30 → 0, delay 200ms
  //   Footer  — slides up from y:30 → 0, delay 300ms
  const op0 = useSharedValue(0); const y0 = useSharedValue(-20);
  const op1 = useSharedValue(0); const y1 = useSharedValue(30);
  const op2 = useSharedValue(0); const y2 = useSharedValue(30);
  const op3 = useSharedValue(0); const y3 = useSharedValue(30);

  useEffect(() => {
    const cfg = { duration: 500 };
    op0.value = withTiming(1, cfg);                 y0.value = withTiming(0, cfg);
    op1.value = withDelay(100, withTiming(1, cfg)); y1.value = withDelay(100, withTiming(0, cfg));
    op2.value = withDelay(200, withTiming(1, cfg)); y2.value = withDelay(200, withTiming(0, cfg));
    op3.value = withDelay(300, withTiming(1, cfg)); y3.value = withDelay(300, withTiming(0, cfg));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const anim0 = useAnimatedStyle(() => ({ opacity: op0.value, transform: [{ translateY: y0.value }] }));
  const anim1 = useAnimatedStyle(() => ({ opacity: op1.value, transform: [{ translateY: y1.value }] }));
  const anim2 = useAnimatedStyle(() => ({ opacity: op2.value, transform: [{ translateY: y2.value }] }));
  const anim3 = useAnimatedStyle(() => ({ opacity: op3.value, transform: [{ translateY: y3.value }] }));

  // Play button scale
  const playScale = useSharedValue(1);
  const playScaleStyle = useAnimatedStyle(() => ({ transform: [{ scale: playScale.value }] }));

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* True vertical gradient: #020617 → #0f172a */}
      <LinearGradient
        colors={['#020617', '#0f172a']}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      {/* Top-center glow for depth */}
      <View style={styles.topGlow} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <Animated.View style={[styles.header, anim0]}>
          <Text style={styles.homeTitle}>KAMISADO</Text>
          <Text style={styles.homeTitleSub}>DRAGON STRATEGY</Text>
        </Animated.View>

        {/* ── PvE Card ── */}
        <Animated.View style={[styles.fullWidth, anim1]}>
          <ModeCard
            iconName="hardware-chip-outline"
            title="Master the AI Dragon"
            subtitle="VS COMPUTER · Easy / Medium / Hard"
            selected={gameMode === 'pve'}
            onPress={() => setGameMode('pve')}
          >
            {/* Difficulty row visible only when PvE selected */}
            {gameMode === 'pve' && (
              <View style={styles.diffRow}>
                <DifficultyPill label="EASY"   active={difficulty === 'easy'}   onPress={() => setDifficulty('easy')} />
                <DifficultyPill label="MEDIUM" active={difficulty === 'medium'} onPress={() => setDifficulty('medium')} />
                <DifficultyPill label="HARD"   active={difficulty === 'hard'}   onPress={() => setDifficulty('hard')} />
              </View>
            )}
          </ModeCard>
        </Animated.View>

        {/* ── PvP Card ── */}
        <Animated.View style={[styles.fullWidth, anim2]}>
          <ModeCard
            iconName="people-outline"
            title="Challenge a Friend"
            subtitle="LOCAL DUEL · Two players, one device"
            selected={gameMode === 'pvp'}
            onPress={() => setGameMode('pvp')}
          />
        </Animated.View>

        {/* ── Controls + footer ── */}
        <Animated.View style={[styles.fullWidth, styles.footerBlock, anim3]}>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GAME TYPE</Text>
            <SlidingSegment
              options={[
                { label: 'Classic Mode',    value: 'single' },
                { label: 'Match (Best of 3)', value: 'match' },
              ]}
              value={matchType}
              onChange={v => setMatchType(v as MatchType)}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BOARD</Text>
            <SlidingSegment
              options={[
                { label: '8×8 Standard', value: 'standard' },
                { label: '10×10 Mega',   value: 'mega' },
              ]}
              value={boardVariant}
              onChange={v => setBoardVariant(v as BoardVariant)}
            />
            {boardVariant === 'mega' && (
              <Text style={styles.megaNote}>
                Megasado · Silver &amp; Gold pieces · Max 7 squares per move
              </Text>
            )}
          </View>

          {/* Play CTA */}
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              navigation.navigate('Game', { gameMode, difficulty, matchType, boardVariant });
            }}
            onPressIn={() => { playScale.value = withTiming(0.96, { duration: 90 }); }}
            onPressOut={() => { playScale.value = withTiming(1.0, { duration: 170 }); }}
          >
            <Animated.View style={[styles.playButton, playScaleStyle]}>
              <Text style={styles.playButtonText}>▶  PLAY</Text>
            </Animated.View>
          </Pressable>

          {/* How to Play — underlined subtle link */}
          <Pressable
            onPress={() => navigation.navigate('Rules')}
            style={({ pressed }) => [styles.rulesLink, pressed && styles.rulesLinkPressed]}
          >
            <Text style={styles.rulesLinkText}>HOW TO PLAY</Text>
          </Pressable>

        </Animated.View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------------------
// GameScreen
// ---------------------------------------------------------------------------
function GameScreen({
  route,
}: NativeStackScreenProps<RootStackParamList, 'Game'>): React.JSX.Element {
  const {
    gameMode     = 'pve',
    difficulty   = 'medium',
    matchType    = 'single',
    boardVariant = 'standard',
  } = route.params ?? {};

  const [bannerMessage, setBannerMessage] = useState('');
  const [showBanner,    setShowBanner]    = useState(false);

  const handleDeadlock = useCallback((message: string): void => {
    setBannerMessage(message);
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 2400);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <StatusBanner visible={showBanner} message={bannerMessage} />
      <Board
        onDeadlock={handleDeadlock}
        gameMode={gameMode}
        difficulty={difficulty}
        matchType={matchType}
        boardVariant={boardVariant}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------
export default function App(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Home"  component={HomeScreen} />
        <Stack.Screen name="Game"  component={GameScreen} />
        <Stack.Screen name="Rules" component={RulesScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#020617',
  },

  // Top-centre glow — radial-ish bleed of indigo light
  topGlow: {
    position:        'absolute',
    top:             -200,
    alignSelf:       'center',
    width:           520,
    height:          520,
    borderRadius:    260,
    backgroundColor: 'rgba(99,102,241,0.08)',
  },

  scrollContent: {
    flexGrow:          1,
    alignItems:        'center',
    paddingTop:        72,
    paddingBottom:     56,
    paddingHorizontal: 20,
    gap:               14,
  },

  fullWidth: {
    width: '100%',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    alignItems:   'center',
    marginBottom: 10,
  },
  homeTitle: {
    color:         '#FFFFFF',
    fontSize:      38,
    fontWeight:    '800',
    letterSpacing: 10,
    textAlign:     'center',
  },
  homeTitleSub: {
    color:         'rgba(255,255,255,0.25)',
    fontSize:      10,
    fontWeight:    '300',
    letterSpacing: 5,
    textAlign:     'center',
    marginTop:     8,
  },

  // ── Glassmorphism card ──────────────────────────────────────────────────────
  cardWrapper: {
    width:        '100%',
    borderRadius: 32,
    borderWidth:  1,
    borderColor:  'rgba(255,255,255,0.10)',
    overflow:     'hidden',          // clips BlurView to the rounded rect
  },
  cardWrapperSelected: {
    borderColor: 'rgba(255,255,255,0.28)',
  },
  blurFill: {
    width: '100%',
  },
  cardTintOverlay: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  cardTintOverlaySelected: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  // Horizontal content row inside the card
  cardRow: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingVertical:   26,
    paddingHorizontal: 24,
    gap:               16,
  },
  cardIconWrap: {
    width:           52,
    height:          52,
    borderRadius:    16,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.10)',
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardIconWrapSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor:     'rgba(255,255,255,0.22)',
  },
  cardTextBlock: {
    flex: 1,
    gap:  3,
  },
  cardTitle: {
    color:      'rgba(255,255,255,0.60)',
    fontSize:   17,
    fontWeight: '600',
    lineHeight: 22,
  },
  cardTitleSelected: {
    color: '#FFFFFF',
  },
  cardSubtitle: {
    color:         'rgba(255,255,255,0.35)',
    fontSize:      12,
    fontWeight:    '300',
    letterSpacing: 0.4,
    lineHeight:    17,
  },

  // Difficulty pills (inside PvE card)
  diffRow: {
    flexDirection:   'row',
    gap:             8,
    paddingBottom:   22,
    paddingTop:      2,
    justifyContent:  'center',
  },
  diffPill: {
    paddingVertical:   7,
    paddingHorizontal: 16,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.13)',
  },
  diffPillActive: {
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor:     'rgba(255,255,255,0.38)',
  },
  diffPillPressed: {
    backgroundColor: 'rgba(255,255,255,0.07)',
  },
  diffPillText: {
    color:         'rgba(255,255,255,0.35)',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 1.2,
  },
  diffPillTextActive: {
    color: '#FFFFFF',
  },

  // ── Footer controls ─────────────────────────────────────────────────────────
  footerBlock: {
    alignItems: 'center',
    gap:        14,
    marginTop:  6,
  },
  section: {
    width:      '100%',
    alignItems: 'center',
    gap:        8,
  },
  sectionLabel: {
    color:         'rgba(255,255,255,0.25)',
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 2.5,
  },

  // ── Sliding segment control ──────────────────────────────────────────────────
  segmentWrap: {
    flexDirection:   'row',
    width:           '100%',
    height:          44,
    borderRadius:    14,
    borderWidth:     1,
    borderColor:     'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow:        'hidden',
    position:        'relative',
  },
  // Absolute sliding pill behind the text
  segmentSlider: {
    position:        'absolute',
    top:             4,
    bottom:          4,
    left:            4,
    borderRadius:    10,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  segmentOption: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         1,              // renders above the slider
  },
  segmentText: {
    color:         'rgba(255,255,255,0.38)',
    fontSize:      12,
    fontWeight:    '500',
    letterSpacing: 0.3,
    textAlign:     'center',
  },
  segmentTextActive: {
    color:      '#FFFFFF',
    fontWeight: '600',
  },

  megaNote: {
    color:         'rgba(255,255,255,0.25)',
    fontSize:      11,
    fontWeight:    '300',
    letterSpacing: 0.3,
    textAlign:     'center',
    fontStyle:     'italic',
  },

  // ── Play button ──────────────────────────────────────────────────────────────
  playButton: {
    width:           '100%',
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderRadius:    20,
    alignItems:      'center',
    marginTop:       4,
  },
  playButtonText: {
    color:         '#020617',
    fontSize:      14,
    fontWeight:    '800',
    letterSpacing: 4,
  },

  // ── How to Play link ─────────────────────────────────────────────────────────
  rulesLink: {
    paddingVertical:   8,
    paddingHorizontal: 16,
    borderRadius:      8,
  },
  rulesLinkPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rulesLinkText: {
    color:                'rgba(255,255,255,0.28)',
    fontSize:             11,
    fontWeight:           '400',
    letterSpacing:        2,
    textDecorationLine:   'underline',
    textDecorationColor:  'rgba(255,255,255,0.15)',
    textAlign:            'center',
  },
});
