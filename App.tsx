import React from 'react';
import { View, StatusBar } from 'react-native';
import Board from './src/components/Board';

export default function App(): React.JSX.Element {
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0F172A' }}>
      <StatusBar translucent barStyle="light-content" backgroundColor="transparent" />
      <Board />
    </View>
  );
}
