import React, { useState, useCallback } from 'react';
import { Button, Pressable, StyleSheet, Text, View, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import Board from './src/components/Board';
import StatusBanner from './src/components/StatusBanner';

type GameMode    = 'pvp' | 'pve';
type Difficulty  = 'easy' | 'medium' | 'hard';
type MatchType   = 'single' | 'match';
type BoardVariant = 'standard' | 'mega';

type RootStackParamList = {
  Home: undefined;
  Game: { gameMode: GameMode; difficulty: Difficulty; matchType: MatchType; boardVariant: BoardVariant };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

// ---------------------------------------------------------------------------
// Toggle button helper — highlights the active option
// ---------------------------------------------------------------------------
function ToggleButton({
  title,
  active,
  onPress,
}: {
  title:   string;
  active:  boolean;
  onPress: () => void;
}): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggleBtn,
        active  && styles.toggleBtnActive,
        pressed && styles.toggleBtnPressed,
      ]}
    >
      <Text style={[styles.toggleBtnText, active && styles.toggleBtnTextActive]}>
        {title}
      </Text>
    </Pressable>
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

  return (
    <View style={styles.root}>
      <Text style={styles.homeTitle}>Kamisado</Text>

      {/* Mode */}
      <Text style={styles.label}>Mode</Text>
      <View style={styles.row}>
        <ToggleButton title="vs CPU"    active={gameMode === 'pve'} onPress={() => setGameMode('pve')} />
        <View style={styles.sep} />
        <ToggleButton title="vs Player" active={gameMode === 'pvp'} onPress={() => setGameMode('pvp')} />
      </View>

      {/* Difficulty — only when playing against the CPU */}
      {gameMode === 'pve' && (
        <>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.row}>
            <ToggleButton title="Easy"   active={difficulty === 'easy'}   onPress={() => setDifficulty('easy')} />
            <View style={styles.sep} />
            <ToggleButton title="Medium" active={difficulty === 'medium'} onPress={() => setDifficulty('medium')} />
            <View style={styles.sep} />
            <ToggleButton title="Hard"   active={difficulty === 'hard'}   onPress={() => setDifficulty('hard')} />
          </View>
        </>
      )}

      {/* Match type */}
      <Text style={styles.label}>Match Type</Text>
      <View style={styles.row}>
        <ToggleButton title="Single" active={matchType === 'single'} onPress={() => setMatchType('single')} />
        <View style={styles.sep} />
        <ToggleButton title="Match"  active={matchType === 'match'}  onPress={() => setMatchType('match')} />
      </View>

      {/* Board size */}
      <Text style={styles.label}>Board</Text>
      <View style={styles.row}>
        <ToggleButton
          title="Standard (8×8)"
          active={boardVariant === 'standard'}
          onPress={() => setBoardVariant('standard')}
        />
        <View style={styles.sep} />
        <ToggleButton
          title="Mega (10×10)"
          active={boardVariant === 'mega'}
          onPress={() => setBoardVariant('mega')}
        />
      </View>
      {boardVariant === 'mega' && (
        <Text style={styles.megaNote}>
          Megasado: Silver &amp; Gold pieces, max 7 squares per move
        </Text>
      )}

      <View style={styles.playButton}>
        <Button
          title="Play"
          onPress={() =>
            navigation.navigate('Game', { gameMode, difficulty, matchType, boardVariant })
          }
        />
      </View>
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
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="Game" component={GameScreen} />
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
    justifyContent:  'center',
    alignItems:      'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
  },
  homeTitle: {
    color:        '#FFFFFF',
    fontSize:     24,
    fontWeight:   '700',
    marginBottom: 20,
  },
  label: {
    color:        '#94A3B8',
    fontSize:     13,
    marginTop:    16,
    marginBottom: 6,
  },
  row: {
    flexDirection: 'row',
    alignItems:    'center',
    flexWrap:      'wrap',
    justifyContent: 'center',
    gap:           4,
  },
  sep: {
    width: 4,
  },
  toggleBtn: {
    paddingVertical:   6,
    paddingHorizontal: 14,
    borderRadius:      16,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.2)',
  },
  toggleBtnActive: {
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderColor:     'rgba(255,255,255,0.6)',
  },
  toggleBtnPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  toggleBtnText: {
    color:      'rgba(255,255,255,0.5)',
    fontSize:   13,
    fontWeight: '500',
  },
  toggleBtnTextActive: {
    color: '#FFFFFF',
  },
  megaNote: {
    color:      '#94A3B8',
    fontSize:   11,
    marginTop:  4,
    fontStyle:  'italic',
    textAlign:  'center',
  },
  playButton: {
    marginTop: 32,
    minWidth:  120,
  },
});
