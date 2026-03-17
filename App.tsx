import React, { useState, useCallback, useEffect } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
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
import DragonWatermark from './src/components/DragonWatermark';
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
interface IconTint {
  bg:     string;
  border: string;
  color:  string;
}

function ModeCard({
  iconName,
  title,
  subtitle,
  selected,
  onPress,
  children,
  iconTint,
}: {
  iconName:  React.ComponentProps<typeof Ionicons>['name'];
  title:     string;
  subtitle:  string;
  selected:  boolean;
  onPress:   () => void;
  children?: React.ReactNode;
  iconTint?: IconTint;
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
      <Animated.View style={[
        styles.cardWrapper,
        selected && styles.cardWrapperSelected,
        scaleStyle,
      ]}>
        <BlurView intensity={15} tint="light" style={styles.blurFill}>
          <View style={styles.cardRow}>
            <View style={[
              styles.cardIconWrap,
              selected && styles.cardIconWrapSelected,
              !selected && iconTint != null && { backgroundColor: iconTint.bg, borderColor: iconTint.border },
            ]}>
              <Ionicons
                name={iconName}
                size={26}
                color={selected ? '#0F172A' : (iconTint?.color ?? '#94A3B8')}
              />
            </View>
            <View style={styles.cardTextBlock}>
              <Text style={[styles.cardTitle, selected && styles.cardTitleSelected]}>
                {title}
              </Text>
              <Text style={styles.cardSubtitle}>{subtitle}</Text>
            </View>
            {selected && (
              <Ionicons name="checkmark-circle" size={18} color="rgba(15,23,42,0.30)" />
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
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      <DragonWatermark />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Header ── */}
        <Animated.View style={[styles.header, anim0]}>
          <Text style={styles.homeTitle}>KAMISADO</Text>
          <Text style={styles.homeTitleSub}>STRATEGIC DRAGON CHESS</Text>
        </Animated.View>

        {/* ── PvE Card ── */}
        <Animated.View style={[styles.fullWidth, anim1]}>
          <ModeCard
            iconName="hardware-chip-outline"
            title="Master the AI Dragon"
            subtitle="VS COMPUTER · Easy / Medium / Hard"
            selected={gameMode === 'pve'}
            onPress={() => setGameMode('pve')}
            iconTint={{ bg: 'rgba(220,38,38,0.07)', border: 'rgba(220,38,38,0.18)', color: '#DC2626' }}
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
            iconTint={{ bg: 'rgba(99,102,241,0.07)', border: 'rgba(99,102,241,0.18)', color: '#6366F1' }}
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

          {/* Play CTA + How to Play — grouped */}
          <View style={styles.buttonGroup}>
            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                navigation.navigate('Game', { gameMode, difficulty, matchType, boardVariant });
              }}
              onPressIn={() => { playScale.value = withTiming(0.97, { duration: 80 }); }}
              onPressOut={() => { playScale.value = withTiming(1.0, { duration: 160 }); }}
            >
              <Animated.View style={[styles.playButton, playScaleStyle]}>
                <Ionicons name="play" size={22} color="#0F172A" style={{ marginRight: 12 }} />
                <Text style={styles.playButtonText}>PLAY</Text>
              </Animated.View>
            </TouchableOpacity>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Rules')}
              style={styles.rulesLink}
            >
              <Ionicons name="book-outline" size={16} color="#334155" style={{ marginRight: 8 }} />
              <Text style={styles.rulesLinkText}>How to play</Text>
            </TouchableOpacity>
          </View>

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
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      <DragonWatermark />
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
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: '#F8FAFC' } }}>
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
    backgroundColor: '#FFFFFF',
  },

  scrollView: {
    backgroundColor: 'transparent',
  },
  scrollContent: {
    flexGrow:          1,
    alignItems:        'center',
    paddingTop:        100,
    paddingBottom:     56,
    paddingHorizontal: 20,
    gap:               14,
    backgroundColor:   'transparent',
  },

  fullWidth: {
    width: '100%',
  },

  // ── Header ─────────────────────────────────────────────────────────────────
  header: {
    alignItems:     'center',
    justifyContent: 'center',
    marginBottom:   28,
  },
  homeTitle: {
    color:         '#0F172A',
    fontSize:      42,
    fontWeight:    '600',
    letterSpacing: 12,
    textAlign:     'center',
  },
  homeTitleSub: {
    color:         '#475569',
    fontSize:      13,
    fontWeight:    '600',
    letterSpacing: 5,
    textAlign:     'center',
    marginTop:     12,
  },

  // ── Glassmorphism card ──────────────────────────────────────────────────────
  cardWrapper: {
    width:           '100%',
    borderRadius:    38,
    borderWidth:     0.5,
    borderColor:     'rgba(251,191,36,0.15)',
    backgroundColor: '#FFFFFF',
    overflow:        'hidden',
    // Soft lifted shadow
    shadowColor:     '#000000',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.04,
    shadowRadius:    12,
    elevation:       2,
  },
  cardWrapperSelected: {
    borderColor: 'rgba(251,191,36,0.45)',
  },
  blurFill: {
    width: '100%',
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
    backgroundColor: '#F1F5F9',
    borderWidth:     1,
    borderColor:     '#E2E8F0',
    alignItems:      'center',
    justifyContent:  'center',
  },
  cardIconWrapSelected: {
    backgroundColor: 'rgba(251,191,36,0.12)',
    borderColor:     'rgba(251,191,36,0.35)',
  },
  cardTextBlock: {
    flex: 1,
    gap:  3,
  },
  cardTitle: {
    color:      '#0F172A',
    fontSize:   17,
    fontWeight: '600',
    lineHeight: 22,
  },
  cardTitleSelected: {
    color: '#0F172A',
  },
  cardSubtitle: {
    color:         '#64748B',
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
    borderColor:       '#E2E8F0',
  },
  diffPillActive: {
    backgroundColor: 'rgba(251,191,36,0.08)',
    borderColor:     'rgba(251,191,36,0.55)',
  },
  diffPillPressed: {
    backgroundColor: '#F8FAFC',
  },
  diffPillText: {
    color:         '#94A3B8',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 1.2,
  },
  diffPillTextActive: {
    color: '#92400E',
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
    color:         '#94A3B8',
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
    borderColor:     '#E2E8F0',
    backgroundColor: '#F1F5F9',
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
    backgroundColor: '#FFFFFF',
    // Android shadow
    elevation:       2,
    // iOS shadow
    shadowColor:     '#000000',
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.08,
    shadowRadius:    4,
  },
  segmentOption: {
    flex:           1,
    alignItems:     'center',
    justifyContent: 'center',
    zIndex:         1,              // renders above the slider
  },
  segmentText: {
    color:         '#94A3B8',
    fontSize:      12,
    fontWeight:    '500',
    letterSpacing: 0.3,
    textAlign:     'center',
  },
  segmentTextActive: {
    color:      '#0F172A',
    fontWeight: '600',
  },

  megaNote: {
    color:         '#94A3B8',
    fontSize:      11,
    fontWeight:    '300',
    letterSpacing: 0.3,
    textAlign:     'center',
    fontStyle:     'italic',
  },

  // ── Button group (Play + How to play) ────────────────────────────────────────
  buttonGroup: {
    alignItems:  'center',
    gap:         16,
    marginTop:   28,
    marginBottom: 20,
    width:       '100%',
  },

  // ── Play button ──────────────────────────────────────────────────────────────
  playButton: {
    flexDirection:     'row',
    justifyContent:    'center',
    alignItems:        'center',
    minWidth:          220,
    maxWidth:          260,
    paddingVertical:   18,
    paddingHorizontal: 48,
    backgroundColor:   '#D4AF37',
    borderRadius:      50,
    borderWidth:       1.5,
    borderColor:       'rgba(255, 255, 255, 0.5)',
    shadowColor:       '#92400E',
    shadowOffset:      { width: 0, height: 10 },
    shadowOpacity:     0.4,
    shadowRadius:      15,
    elevation:         10,
  },
  playButtonText: {
    color:         '#0F172A',
    fontSize:      20,
    fontWeight:    '900',
    letterSpacing: 6,
    marginLeft:    6,
  },

  // ── How to Play ghost/outline button ─────────────────────────────────────────
  rulesLink: {
    flexDirection:   'row',
    justifyContent:  'center',
    alignItems:      'center',
    width:           '60%',
    height:          50,
    borderRadius:    25,
    borderWidth:     2,
    borderColor:     '#334155',
    backgroundColor: 'transparent',
  },
  rulesLinkText: {
    color:         '#334155',
    fontSize:      15,
    fontWeight:    '600',
    letterSpacing: 1,
    textAlign:     'center',
  },
});
