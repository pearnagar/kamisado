import React, { useCallback, useRef, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
  StatusBar,
  ViewToken,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import DragonWatermark from '../components/DragonWatermark';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Card is 85% of screen. Each card gets 16px margin on each side.
// SIDE_PADDING centres the first/last card when scroll offset = 0.
const CARD_WIDTH    = SCREEN_WIDTH * 0.85;
const CARD_MARGIN   = 16;
const SNAP_INTERVAL = CARD_WIDTH + CARD_MARGIN * 2;
const SIDE_PADDING  = (SCREEN_WIDTH - CARD_WIDTH) / 2 - CARD_MARGIN;

interface RuleCard {
  id:    string;
  icon:  React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  title: string;
  body:  string;
}

const CARDS: RuleCard[] = [
  {
    id:    '1',
    icon:  'flag-outline',
    label: 'THE GOAL',
    title: 'Reach the Back Rank',
    body:  "Advance any of your dragons to your opponent's back rank to win the round. First piece to reach the far end takes the point.",
  },
  {
    id:    '2',
    icon:  'navigate-outline',
    label: 'MOVEMENT',
    title: 'Forward, Never Back',
    body:  'Pieces move forward only — straight ahead or diagonally. They slide any number of squares in one direction per turn. No jumping over pieces. No captures.',
  },
  {
    id:    '3',
    icon:  'color-palette-outline',
    label: 'THE CORE RULE',
    title: 'The Color Lock',
    body:  "When your piece lands on a colored square, your opponent must move the piece matching that color. This forced chain reaction is the strategic heart of Kamisado.",
  },
  {
    id:    '4',
    icon:  'refresh-outline',
    label: 'RULE M6',
    title: 'Blocked? Forfeit.',
    body:  'If the forced piece has no legal moves, that player forfeits their turn. The color lock resets to the square the trapped piece currently occupies.',
  },
  {
    id:    '5',
    icon:  'bulb-outline',
    label: 'STRATEGY',
    title: 'Control the Chain',
    body:  'Plan several moves ahead. The color you land on dictates which dragon your opponent must move next. Direct their pieces to dead ends — or clear the path for your own advance.',
  },
];

export default function RulesScreen(): React.JSX.Element {
  const navigation = useNavigation();
  const [activeIndex, setActiveIndex] = useState(0);

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const onViewableItemsChanged = useCallback(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setActiveIndex(viewableItems[0].index);
      }
    },
    [],
  );

  const renderCard = useCallback(({ item }: { item: RuleCard }): React.JSX.Element => (
    <View style={styles.page}>
      <View style={styles.card}>
        <View style={styles.cardIconWrap}>
          <Ionicons name={item.icon} size={30} color="#D4AF37" />
        </View>
        <Text style={styles.cardLabel}>{item.label}</Text>
        <Text style={styles.cardTitle}>{item.title}</Text>
        <View style={styles.divider} />
        <Text style={styles.cardBody}>{item.body}</Text>
      </View>
    </View>
  ), []);

  return (
    <View style={styles.root}>
      <StatusBar translucent barStyle="dark-content" backgroundColor="transparent" />
      <DragonWatermark />

      {/* Back button — floating pill */}
      <Pressable
        onPress={() => navigation.goBack()}
        style={({ pressed }) => [styles.backButton, pressed && styles.backButtonPressed]}
      >
        <Ionicons name="arrow-back" size={18} color="#334155" />
      </Pressable>

      {/* Screen heading */}
      <View style={styles.header}>
        <Text style={styles.screenTitle}>GAME RULES</Text>
        <Text style={styles.screenSub}>Swipe to explore</Text>
      </View>

      {/* Horizontal carousel — snap-to-card, not snap-to-screen */}
      <FlatList
        data={CARDS}
        keyExtractor={item => item.id}
        renderItem={renderCard}
        horizontal
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={SNAP_INTERVAL}
        snapToAlignment="center"
        contentContainerStyle={{ paddingHorizontal: SIDE_PADDING }}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        style={styles.flatList}
      />

      {/* Pagination dots */}
      <View style={styles.dotsRow}>
        {CARDS.map((_, i) => (
          <View key={i} style={[styles.dot, i === activeIndex && styles.dotActive]} />
        ))}
      </View>

      {/* Card counter */}
      <Text style={styles.counter}>{activeIndex + 1} / {CARDS.length}</Text>

      {/* Privacy Policy */}
      <Pressable
        onPress={() => Linking.openURL('https://pearnagar.github.io/kamisado/')}
        style={({ pressed }) => [styles.privacyButton, pressed && styles.privacyButtonPressed]}
      >
        <Text style={styles.privacyText}>Privacy Policy</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: '#F8FAFC',
  },

  // ── Back button ──────────────────────────────────────────────────────────────
  backButton: {
    position:        'absolute',
    top:             52,
    left:            20,
    zIndex:          10,
    width:           40,
    height:          40,
    borderRadius:    20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     '#000',
    shadowOffset:    { width: 0, height: 2 },
    shadowOpacity:   0.08,
    shadowRadius:    6,
    elevation:       3,
  },
  backButtonPressed: {
    backgroundColor: '#E2E8F0',
  },

  // ── Header ───────────────────────────────────────────────────────────────────
  header: {
    alignItems:    'center',
    paddingTop:    88,
    paddingBottom: 16,
  },
  screenTitle: {
    color:         '#0F172A',
    fontSize:      22,
    fontWeight:    '700',
    letterSpacing: 6,
    textAlign:     'center',
  },
  screenSub: {
    color:         '#94A3B8',
    fontSize:      11,
    fontWeight:    '400',
    letterSpacing: 1.5,
    marginTop:     6,
  },

  // ── Carousel ─────────────────────────────────────────────────────────────────
  flatList: {
    flex: 1,
  },
  // Each page = card width + horizontal margins; FlatList height fills flex:1
  page: {
    width:          CARD_WIDTH,
    marginHorizontal: CARD_MARGIN,
    flex:           1,
    justifyContent: 'center',
    alignItems:     'center',
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    width:             CARD_WIDTH,
    backgroundColor:   'rgba(255, 255, 255, 0.85)',
    borderWidth:       1,
    borderColor:       'rgba(212, 175, 55, 0.4)',
    borderRadius:      28,
    padding:           28,
    alignItems:        'center',
    gap:               12,
    shadowColor:       '#000',
    shadowOffset:      { width: 0, height: 8 },
    shadowOpacity:     0.08,
    shadowRadius:      20,
    elevation:         6,
  },
  cardIconWrap: {
    width:           68,
    height:          68,
    borderRadius:    22,
    backgroundColor: 'rgba(212, 175, 55, 0.10)',
    borderWidth:     1,
    borderColor:     'rgba(212, 175, 55, 0.30)',
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    4,
  },
  cardLabel: {
    color:         '#D4AF37',
    fontSize:      10,
    fontWeight:    '700',
    letterSpacing: 3,
    textAlign:     'center',
  },
  cardTitle: {
    color:         '#0F172A',
    fontSize:      24,
    fontWeight:    '700',
    letterSpacing: 0.3,
    textAlign:     'center',
    lineHeight:    30,
  },
  divider: {
    width:           40,
    height:          2,
    backgroundColor: 'rgba(212, 175, 55, 0.5)',
    borderRadius:    1,
    marginVertical:  4,
  },
  cardBody: {
    color:      '#475569',
    fontSize:   16,
    fontWeight: '400',
    lineHeight: 24,
    textAlign:  'center',
  },

  // ── Pagination ───────────────────────────────────────────────────────────────
  dotsRow: {
    flexDirection:  'row',
    justifyContent: 'center',
    alignItems:     'center',
    paddingTop:     20,
    paddingBottom:  8,
  },
  dot: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: '#CBD5E1',
    marginHorizontal: 6,
  },
  dotActive: {
    width:           28,
    backgroundColor: '#D4AF37',
  },
  counter: {
    color:         '#94A3B8',
    fontSize:      11,
    fontWeight:    '500',
    letterSpacing: 1,
    textAlign:     'center',
    paddingBottom: 12,
  },

  // ── Privacy Policy ───────────────────────────────────────────────────────────
  privacyButton: {
    alignSelf:     'center',
    paddingVertical:   8,
    paddingHorizontal: 20,
    marginBottom:  24,
    borderRadius:  20,
    borderWidth:   1,
    borderColor:   '#CBD5E1',
  },
  privacyButtonPressed: {
    backgroundColor: '#F1F5F9',
  },
  privacyText: {
    color:         '#94A3B8',
    fontSize:      11,
    fontWeight:    '500',
    letterSpacing: 0.5,
  },
});
