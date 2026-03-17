import React from 'react';
import { StyleSheet, View, Image } from 'react-native';

export default function DragonWatermark(): React.JSX.Element {
  return (
    <View style={styles.container} pointerEvents="none">
      <Image
        source={require('../../assets/dragon_bg.png')}
        style={styles.image}
        resizeMode="stretch"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center', 
    justifyContent: 'center'
  },
  image: {
    width: '100%',
    height: '100%',
  },
});