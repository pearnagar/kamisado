import React, { useState, useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, StatusBar } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
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
      onPress={onPress}
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
// ModeCard — animated scale on press
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
      onPress={onPress}
      onPressIn={() => { scale.value = withTiming(0.96, { duration: 90 }); }}
      onPressOut={() => { scale.value = withTiming(1.0, { duration: 160 }); }}
    >
      <Animated.View style={[
        styles.modeCard,
        selected && styles.modeCardSelected,
        scaleStyle,
      ]}>
        <Ionicons
          name={iconName}
          size={28}
          color={selected ? '#FFFFFF' : 'rgba(255,255,255,0.45)'}
          style={{ marginBottom: 6 }}
        />
        <Text style={[styles.modeCardTitle, selected && styles.modeCardTitleSelected]}>
          {title}
        </Text>
        <Text style={styles.modeCardSubtitle}>{subtitle}</Text>
        {children}
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// SegmentToggle
// ---------------------------------------------------------------------------
function SegmentToggle({
  options,
  value,
  onChange,
}: {
  options:  { label: string; value: string }[];
  value:    string;
  onChange: (v: string) => void;
}): React.JSX.Element {
  return (
    <View style={styles.segmentWrap}>
      {options.map((opt, i) => (
        <Pressable
          key={opt.value}
          onPress={() => onChange(opt.value)}
          style={[
            styles.segmentOption,
            i === 0                  && styles.segmentFirst,
            i === options.length - 1 && styles.segmentLast,
            value === opt.value      && styles.segmentOptionActive,
          ]}
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

  // Staggered entrance — 4 stages: header → card 1 → card 2 → footer
  const op0 = useSharedValue(0); const y0 = useSharedValue(28);
  const op1 = useSharedValue(0); const y1 = useSharedValue(28);
  const op2 = useSharedValue(0); const y2 = useSharedValue(28);
  const op3 = useSharedValue(0); const y3 = useSharedValue(28);

  useEffect(() => {
    const cfg = { duration: 480 };
    op0.value = withTiming(1, cfg);              y0.value = withTiming(0, cfg);
    op1.value = withDelay(130, withTiming(1, cfg)); y1.value = withDelay(130, withTiming(0, cfg));
    op2.value = withDelay(230, withTiming(1, cfg)); y2.value = withDelay(230, withTiming(0, cfg));
    op3.value = withDelay(350, withTiming(1, cfg)); y3.value = withDelay(350, withTiming(0, cfg));
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

      {/* Two-tone depth layer (gradient simulation) */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={{ flex: 1, backgroundColor: '#0F172A' }} />
        <View style={{ flex: 1, backgroundColor: '#1E293B', opacity: 0.65 }} />
      </View>
      <View style={styles.bgGlow} pointerEvents="none" />

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
            title="VS COMPUTER"
            subtitle="Challenge the AI dragon"
            selected={gameMode === 'pve'}
            onPress={() => setGameMode('pve')}
          >
            <View style={styles.diffRow}>
              <DifficultyPill label="EASY"   active={difficulty === 'easy'}   onPress={() => setDifficulty('easy')} />
              <DifficultyPill label="MEDIUM" active={difficulty === 'medium'} onPress={() => setDifficulty('medium')} />
              <DifficultyPill label="HARD"   active={difficulty === 'hard'}   onPress={() => setDifficulty('hard')} />
            </View>
          </ModeCard>
        </Animated.View>

        {/* ── PvP Card ── */}
        <Animated.View style={[styles.fullWidth, anim2]}>
          <ModeCard
            iconName="people-outline"
            title="LOCAL MULTIPLAYER"
            subtitle="Two players, one device"
            selected={gameMode === 'pvp'}
            onPress={() => setGameMode('pvp')}
          />
        </Animated.View>

        {/* ── Controls + footer ── */}
        <Animated.View style={[styles.fullWidth, styles.footerBlock, anim3]}>

          {/* Game type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>GAME TYPE</Text>
            <SegmentToggle
              options={[
                { label: 'Classic Mode', value: 'single' },
                { label: 'Match (Best of 3)', value: 'match' },
              ]}
              value={matchType}
              onChange={v => setMatchType(v as MatchType)}
            />
          </View>

          {/* Board */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>BOARD</Text>
            <SegmentToggle
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
            onPress={() =>
              navigation.navigate('Game', { gameMode, difficulty, matchType, boardVariant })
            }
            onPressIn={() => { playScale.value = withTiming(0.96, { duration: 90 }); }}
            onPressOut={() => { playScale.value = withTiming(1.0, { duration: 160 }); }}
          >
            <Animated.View style={[styles.playButton, playScaleStyle]}>
              <Text style={styles.playButtonText}>▶  PLAY</Text>
            </Animated.View>
          </Pressable>

          {/* How to Play link */}
          <Pressable
            onPress={() => navigation.navigate('Rules')}
            style={({ pressed }) => [styles.rulesLink, pressed && styles.rulesLinkPressed]}
          >
            <Text style={styles.rulesLinkText}>How to Play</Text>
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
    backgroundColor: '#0F172A',
  },

  bgGlow: {
    position:        'absolute',
    top:             -160,
    alignSelf:       'center',
    width:           480,
    height:          480,
    borderRadius:    240,
    backgroundColor: 'rgba(99,102,241,0.06)',
  },

  scrollContent: {
    flexGrow:        1,
    alignItems:      'center',
    paddingVertical: 64,
    paddingHorizontal: 20,
    gap:             16,
  },

  fullWidth: {
    width: '100%',
  },

  // ── Header ──────────────────────────────────────────────────────────────
  header: {
    alignItems:   'center',
    marginBottom: 8,
  },
  homeTitle: {
    color:         '#FFFFFF',
    fontSize:      40,
    fontWeight:    '800',
    letterSpacing: 8,
    textAlign:     'center',
  },
  homeTitleSub: {
    color:         'rgba(255,255,255,0.28)',
    fontSize:      11,
    fontWeight:    '300',
    letterSpacing: 5,
    textAlign:     'center',
    marginTop:     6,
  },

  // ── Mode cards (glassmorphism) ───────────────────────────────────────────
  modeCard: {
    width:             '100%',
    backgroundColor:   'rgba(255,255,255,0.05)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.10)',
    borderRadius:      24,
    paddingVertical:   24,
    paddingHorizontal: 20,
    alignItems:        'center',
    gap:               4,
    shadowColor:       '#6366F1',
    shadowOffset:      { width: 0, height: 8 },
    shadowOpacity:     0.20,
    shadowRadius:      20,
    elevation:         6,
  },
  modeCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.10)',
    borderColor:     'rgba(255,255,255,0.28)',
    shadowOpacity:   0.35,
    elevation:       10,
  },
  modeCardTitle: {
    color:         'rgba(255,255,255,0.65)',
    fontSize:      17,
    fontWeight:    '700',
    letterSpacing: 1.5,
    textAlign:     'center',
  },
  modeCardTitleSelected: {
    color: '#FFFFFF',
  },
  modeCardSubtitle: {
    color:         'rgba(255,255,255,0.38)',
    fontSize:      12,
    fontWeight:    '300',
    letterSpacing: 0.5,
    textAlign:     'center',
  },

  // ── Difficulty pills ─────────────────────────────────────────────────────
  diffRow: {
    flexDirection: 'row',
    gap:           8,
    marginTop:     14,
  },
  diffPill: {
    paddingVertical:   6,
    paddingHorizontal: 14,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.14)',
  },
  diffPillActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor:     'rgba(255,255,255,0.42)',
  },
  diffPillPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  diffPillText: {
    color:         'rgba(255,255,255,0.38)',
    fontSize:      11,
    fontWeight:    '600',
    letterSpacing: 1,
  },
  diffPillTextActive: {
    color: '#FFFFFF',
  },

  // ── Controls footer ──────────────────────────────────────────────────────
  footerBlock: {
    alignItems: 'center',
    gap:        16,
    marginTop:  4,
  },
  section: {
    width:      '100%',
    alignItems: 'center',
    gap:        8,
  },
  sectionLabel: {
    color:         'rgba(255,255,255,0.28)',
    fontSize:      10,
    fontWeight:    '600',
    letterSpacing: 2.5,
  },

  // ── Segment toggle ────────────────────────────────────────────────────────
  segmentWrap: {
    flexDirection: 'row',
    width:         '100%',
    borderRadius:  14,
    borderWidth:   1,
    borderColor:   'rgba(255,255,255,0.10)',
    overflow:      'hidden',
  },
  segmentOption: {
    flex:            1,
    paddingVertical: 11,
    alignItems:      'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  segmentFirst: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.08)',
  },
  segmentLast: {},
  segmentOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.11)',
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
    color:         'rgba(255,255,255,0.28)',
    fontSize:      11,
    fontWeight:    '300',
    letterSpacing: 0.3,
    textAlign:     'center',
    fontStyle:     'italic',
  },

  // ── Play button ───────────────────────────────────────────────────────────
  playButton: {
    width:           '100%',
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderRadius:    20,
    alignItems:      'center',
    marginTop:       4,
    shadowColor:     '#FFFFFF',
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.15,
    shadowRadius:    12,
    elevation:       8,
  },
  playButtonText: {
    color:         '#0F172A',
    fontSize:      15,
    fontWeight:    '800',
    letterSpacing: 3,
  },

  // ── Rules link ────────────────────────────────────────────────────────────
  rulesLink: {
    paddingVertical:   8,
    paddingHorizontal: 20,
    borderRadius:      12,
  },
  rulesLinkPressed: {
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  rulesLinkText: {
    color:         'rgba(255,255,255,0.30)',
    fontSize:      12,
    fontWeight:    '400',
    letterSpacing: 1,
    textAlign:     'center',
  },
});
