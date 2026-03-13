import React, { useState, useCallback } from 'react';
import { Button, StyleSheet, Text, View, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import Board from './src/components/Board';
import StatusBanner from './src/components/StatusBanner';

type GameMode = 'pvp' | 'pve';
type Difficulty = 'easy' | 'medium' | 'hard';
type MatchType = 'single' | 'match';

type RootStackParamList = {
  Home: undefined;
  Game: { gameMode: GameMode; difficulty: Difficulty; matchType: MatchType };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

function HomeScreen({ navigation }: NativeStackScreenProps<RootStackParamList, 'Home'>): React.JSX.Element {
  const [gameMode, setGameMode] = useState<GameMode>('pve');
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [matchType, setMatchType] = useState<MatchType>('single');

  return (
    <View style={styles.root}>
      <Text style={styles.homeTitle}>Kamisado</Text>

      <Text style={styles.label}>Mode</Text>
      <View style={styles.row}>
        <Button title="vs CPU" onPress={() => setGameMode('pve')} />
        <Text style={styles.sep} />
        <Button title="vs Player" onPress={() => setGameMode('pvp')} />
      </View>
      <Text style={styles.value}>{gameMode === 'pve' ? 'vs CPU' : 'vs Player'}</Text>

      {gameMode === 'pve' && (
        <>
          <Text style={styles.label}>Difficulty</Text>
          <View style={styles.row}>
            <Button title="Easy" onPress={() => setDifficulty('easy')} />
            <Text style={styles.sep} />
            <Button title="Medium" onPress={() => setDifficulty('medium')} />
            <Text style={styles.sep} />
            <Button title="Hard" onPress={() => setDifficulty('hard')} />
          </View>
          <Text style={styles.value}>{difficulty}</Text>
        </>
      )}

      <Text style={styles.label}>Match Type</Text>
      <View style={styles.row}>
        <Button title="Single" onPress={() => setMatchType('single')} />
        <Text style={styles.sep} />
        <Button title="Match" onPress={() => setMatchType('match')} />
      </View>
      <Text style={styles.value}>{matchType}</Text>

      <View style={styles.playButton}>
        <Button title="Play" onPress={() => navigation.navigate('Game', { gameMode, difficulty, matchType })} />
      </View>
    </View>
  );
}

function GameScreen({ route }: NativeStackScreenProps<RootStackParamList, 'Game'>): React.JSX.Element {
  const { gameMode = 'pve', difficulty = 'medium', matchType = 'single' } = route.params ?? {};
  const [bannerMessage, setBannerMessage] = useState('');
  const [showBanner, setShowBanner] = useState(false);

  const handleDeadlock = useCallback((message: string): void => {
    setBannerMessage(message);
    setShowBanner(true);
    setTimeout(() => setShowBanner(false), 2400);
  }, []);

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <StatusBanner visible={showBanner} message={bannerMessage} />
      {/* @ts-expect-error Board props will be updated in next refactor */}
      <Board onDeadlock={handleDeadlock} gameMode={gameMode} difficulty={difficulty} matchType={matchType} />
    </View>
  );
}

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

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
  homeTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 20,
  },
  label: {
    color: '#94A3B8',
    fontSize: 13,
    marginTop: 16,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sep: {
    width: 8,
  },
  value: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 4,
  },
  playButton: {
    marginTop: 32,
  },
});
