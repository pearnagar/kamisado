import React, { useState, useCallback } from 'react';
import { StyleSheet, View, StatusBar } from 'react-native';
import Board from './src/components/Board';
import StatusBanner from './src/components/StatusBanner';

export default function App(): React.JSX.Element {
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
      <Board onDeadlock={handleDeadlock} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0F172A',
  },
});
