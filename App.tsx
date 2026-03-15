import React, { useState, useCallback, useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, StatusBar } from 'react-native';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
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
// DifficultyPill — compact pill button for the difficulty row
// ---------------------------------------------------------------------------
interface DifficultyPillProps {
  label:   string;
  active:  boolean;
  onPress: () => void;
}

function DifficultyPill({ label, active, onPress }: DifficultyPillProps): React.JSX.Element {
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
// ModeCard — large selectable card for PvE or PvP
// ---------------------------------------------------------------------------
interface ModeCardProps {
  icon:      string;
  title:     string;
  subtitle:  string;
  selected:  boolean;
  onPress:   () => void;
  children?: React.ReactNode;
}

function ModeCard({ icon, title, subtitle, selected, onPress, children }: ModeCardProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.modeCard,
        selected && styles.modeCardSelected,
        pressed  && styles.modeCardPressed,
      ]}
    >
      <Text style={styles.modeCardIcon}>{icon}</Text>
      <Text style={styles.modeCardTitle}>{title}</Text>
      <Text style={styles.modeCardSubtitle}>{subtitle}</Text>
      {children}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// SegmentToggle — horizontal two-option pill control
// ---------------------------------------------------------------------------
interface SegmentOption { label: string; value: string }
interface SegmentToggleProps {
  options:  SegmentOption[];
  value:    string;
  onChange: (v: string) => void;
}

function SegmentToggle({ options, value, onChange }: SegmentToggleProps): React.JSX.Element {
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

  // Fade-in + slide-up on mount
  const opacity    = useSharedValue(0);
  const translateY = useSharedValue(32);

  useEffect(() => {
    opacity.value    = withTiming(1, { duration: 520 });
    translateY.value = withTiming(0, { duration: 520 });
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity:   opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />

      {/* Subtle radial-ish glow behind the title */}
      <View style={styles.bgGlow} pointerEvents="none" />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View style={[styles.homeContent, animatedStyle]}>

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.homeTitle}>Kamisado</Text>
            <Text style={styles.homeTitleSub}>משחק הדרקונים</Text>
          </View>

          {/* Mode cards */}
          <ModeCard
            icon="🐉"
            title="משחק נגד הבוט"
            subtitle="(הדרקון)"
            selected={gameMode === 'pve'}
            onPress={() => setGameMode('pve')}
          >
            <View style={styles.diffRow}>
              <DifficultyPill label="קל"     active={difficulty === 'easy'}   onPress={() => setDifficulty('easy')} />
              <DifficultyPill label="בינוני" active={difficulty === 'medium'} onPress={() => setDifficulty('medium')} />
              <DifficultyPill label="קשה"    active={difficulty === 'hard'}   onPress={() => setDifficulty('hard')} />
            </View>
          </ModeCard>

          <ModeCard
            icon="⚔️"
            title="דו-קרב מקומי"
            subtitle="שני שחקנים על אותו מכשיר"
            selected={gameMode === 'pvp'}
            onPress={() => setGameMode('pvp')}
          />

          {/* Match type */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>סוג משחק</Text>
            <SegmentToggle
              options={[
                { label: 'משחק יחיד', value: 'single' },
                { label: 'מטש (3)',   value: 'match'  },
              ]}
              value={matchType}
              onChange={v => setMatchType(v as MatchType)}
            />
          </View>

          {/* Board variant */}
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>לוח</Text>
            <SegmentToggle
              options={[
                { label: '8×8 (קלאסי)', value: 'standard' },
                { label: '10×10 (מגה)', value: 'mega'     },
              ]}
              value={boardVariant}
              onChange={v => setBoardVariant(v as BoardVariant)}
            />
            {boardVariant === 'mega' && (
              <Text style={styles.megaNote}>
                מגאסאדו · כסף וזהב · מקסימום 7 משבצות למהלך
              </Text>
            )}
          </View>

          {/* Play button */}
          <Pressable
            onPress={() =>
              navigation.navigate('Game', { gameMode, difficulty, matchType, boardVariant })
            }
            style={({ pressed }) => [styles.playButton, pressed && styles.playButtonPressed]}
          >
            <Text style={styles.playButtonText}>▶  שחק</Text>
          </Pressable>

          {/* Rules link */}
          <Pressable
            onPress={() => navigation.navigate('Rules')}
            style={({ pressed }) => [styles.rulesLink, pressed && styles.rulesLinkPressed]}
          >
            <Text style={styles.rulesLinkText}>חוקי המשחק</Text>
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

  // Faint indigo glow centred behind the title
  bgGlow: {
    position:        'absolute',
    top:             -140,
    alignSelf:       'center',
    width:           440,
    height:          440,
    borderRadius:    220,
    backgroundColor: 'rgba(99,102,241,0.07)',
  },

  scrollContent: {
    flexGrow:        1,
    alignItems:      'center',
    paddingVertical: 60,
  },

  homeContent: {
    width:  '100%',
    maxWidth: 480,
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 16,
  },

  // Header
  header: {
    alignItems:   'center',
    marginBottom: 4,
  },
  homeTitle: {
    color:         '#FFFFFF',
    fontSize:      44,
    fontWeight:    '800',
    letterSpacing: 1.5,
    textAlign:     'center',
  },
  homeTitleSub: {
    color:         'rgba(255,255,255,0.35)',
    fontSize:      12,
    letterSpacing: 3.5,
    textAlign:     'center',
    marginTop:     6,
  },

  // Mode cards (glassmorphism)
  modeCard: {
    width:             '100%',
    backgroundColor:   'rgba(255,255,255,0.07)',
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.12)',
    borderRadius:      24,
    paddingVertical:   24,
    paddingHorizontal: 20,
    alignItems:        'center',
    gap:               5,
  },
  modeCardSelected: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderColor:     'rgba(255,255,255,0.32)',
  },
  modeCardPressed: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  modeCardIcon: {
    fontSize:     30,
    marginBottom: 2,
  },
  modeCardTitle: {
    color:         '#FFFFFF',
    fontSize:      19,
    fontWeight:    '700',
    textAlign:     'center',
    letterSpacing: 0.3,
  },
  modeCardSubtitle: {
    color:     'rgba(255,255,255,0.42)',
    fontSize:  13,
    textAlign: 'center',
  },

  // Difficulty pills inside PvE card
  diffRow: {
    flexDirection: 'row',
    gap:           8,
    marginTop:     14,
  },
  diffPill: {
    paddingVertical:   6,
    paddingHorizontal: 16,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.16)',
  },
  diffPillActive: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderColor:     'rgba(255,255,255,0.45)',
  },
  diffPillPressed: {
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  diffPillText: {
    color:      'rgba(255,255,255,0.42)',
    fontSize:   13,
    fontWeight: '500',
  },
  diffPillTextActive: {
    color: '#FFFFFF',
  },

  // Section
  section: {
    width:      '100%',
    alignItems: 'center',
    gap:        8,
  },
  sectionLabel: {
    color:         'rgba(255,255,255,0.35)',
    fontSize:      10,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },

  // Segment toggle
  segmentWrap: {
    flexDirection: 'row',
    width:         '100%',
    borderRadius:  14,
    borderWidth:   1,
    borderColor:   'rgba(255,255,255,0.13)',
    overflow:      'hidden',
  },
  segmentOption: {
    flex:              1,
    paddingVertical:   11,
    paddingHorizontal: 8,
    alignItems:        'center',
    justifyContent:    'center',
    backgroundColor:   'rgba(255,255,255,0.04)',
  },
  segmentFirst: {
    borderRightWidth: 1,
    borderRightColor: 'rgba(255,255,255,0.1)',
  },
  segmentLast: {},
  segmentOptionActive: {
    backgroundColor: 'rgba(255,255,255,0.13)',
  },
  segmentText: {
    color:      'rgba(255,255,255,0.4)',
    fontSize:   13,
    fontWeight: '500',
    textAlign:  'center',
  },
  segmentTextActive: {
    color:      '#FFFFFF',
    fontWeight: '600',
  },

  megaNote: {
    color:     'rgba(255,255,255,0.32)',
    fontSize:  11,
    textAlign: 'center',
    fontStyle: 'italic',
  },

  // Play button
  playButton: {
    width:           '100%',
    paddingVertical: 18,
    backgroundColor: '#FFFFFF',
    borderRadius:    20,
    alignItems:      'center',
    marginTop:       8,
  },
  playButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.82)',
  },
  playButtonText: {
    color:         '#0F172A',
    fontSize:      17,
    fontWeight:    '700',
    letterSpacing: 0.5,
  },

  // Rules link
  rulesLink: {
    paddingVertical:   8,
    paddingHorizontal: 20,
    borderRadius:      12,
  },
  rulesLinkPressed: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  rulesLinkText: {
    color:         'rgba(255,255,255,0.35)',
    fontSize:      13,
    textAlign:     'center',
    letterSpacing: 0.3,
  },
});
