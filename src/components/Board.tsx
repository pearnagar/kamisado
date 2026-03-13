import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BOARD_COLORS, BOARD_SIZE, DEFAULT_CLOCK_SECONDS, GameMode, GameStatus, KamisadoColor, Player } from '../constants/gameConstants';
import { GameState, createInitialGameState } from '../engine/gameState';
import { getLegalMoves, getAvailablePieces } from '../engine/moveValidator';
import { makeMove } from '../engine/moveLogic';
import { findBestMove } from '../engine/aiEngine';
import Cell from './Cell';
import ChessClock from './ChessClock';
import Dragon from './Dragon';
import ModeSelector from './ModeSelector';
import ScoreHeader from './ScoreHeader';
import WinOverlay from './WinOverlay';

const CELL_SIZE  = 44;
const boardWidth = BOARD_SIZE * CELL_SIZE;
const FLAT_BOARD_COLORS: readonly KamisadoColor[] = BOARD_COLORS.flat() as KamisadoColor[];

const AI_PLAYER = Player.Black;

/** PvE = vs Bot, PvP = pass-and-play */
type OpponentMode = 'PvE' | 'PvP';
type Difficulty   = 'Easy' | 'Medium' | 'Hard';

const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  Easy:   2,
  Medium: 4,
  Hard:   6,
};

const DIFFICULTIES: Difficulty[] = ['Easy', 'Medium', 'Hard'];

/** Creates a fresh board with the chosen scoring mode baked in. */
const newGame = (mode: GameMode): GameState => ({
  ...createInitialGameState(),
  gameMode: mode,
});

function LegalMoveDot({ visible }: { visible: boolean }): React.JSX.Element {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.legalMoveDot, animatedStyle]}
    />
  );
}

/**
 * A pending move holds the pre-computed next GameState so that the board
 * update is deferred until the slide animation finishes. This eliminates the
 * one-frame ghost that occurred when makeMove() ran before the Dragon mounted.
 */
interface PendingMove {
  from:      { row: number; col: number };
  to:        { row: number; col: number };
  nextState: GameState;
}

interface BoardProps {
  onDeadlock?: (message: string) => void;
}

export default function Board({ onDeadlock }: BoardProps): React.JSX.Element {
  const [gameState, setGameState]         = useState<GameState>(() => newGame(GameMode.Single));
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [pendingMove, setPendingMove]     = useState<PendingMove | null>(null);
  const [isAiThinking, setIsAiThinking]   = useState(false);
  const [opponentMode, setOpponentMode]   = useState<OpponentMode>('PvE');
  const [scoringMode, setScoringMode]     = useState<GameMode>(GameMode.Single);
  const [difficulty, setDifficulty]       = useState<Difficulty>('Medium');
  // Incremented on every explicit reset so ChessClock key changes even when
  // roundNumber stays at 1 (e.g. restarting a finished Single game).
  const [clockEpoch, setClockEpoch]       = useState(0);

  // Stable refs so async callbacks always read the latest values without
  // those values being in effect dependency arrays.
  const gameStateRef    = useRef(gameState);
  const difficultyRef   = useRef(difficulty);
  const pendingMoveRef  = useRef(pendingMove);
  const scoringModeRef  = useRef(scoringMode);
  gameStateRef.current   = gameState;
  difficultyRef.current  = difficulty;
  pendingMoveRef.current = pendingMove;
  scoringModeRef.current = scoringMode;

  const isGameOver     = gameState.status !== GameStatus.Active;
  const hasGameStarted = gameState.moveHistory.length > 0;

  // -------------------------------------------------------------------------
  // AI: fires when the turn belongs to the AI, mode is PvE, and no animation
  //     is in progress.
  //
  // `gameState.isDeadlocked` in deps: when a move deadlocks the opponent and
  // the turn stays with the AI, `turn` alone doesn't change — tracking
  // `isDeadlocked` ensures the effect re-fires once the shake clears the flag.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (opponentMode !== 'PvE') return;
    if (gameState.status !== GameStatus.Active || gameState.turn !== AI_PLAYER) return;
    if (gameState.isDeadlocked) return;
    if (pendingMove !== null) return; // wait for slide animation to finish

    let frameId: ReturnType<typeof requestAnimationFrame>;

    // 600 ms after the slide animation settles, show the thinking indicator,
    // then yield one frame so React flushes that render before JS blocks on minimax.
    const timer = setTimeout(() => {
      const state = gameStateRef.current;
      const depth = DIFFICULTY_DEPTH[difficultyRef.current];

      // Re-validate — state or mode may have changed while the timer was pending
      if (
        opponentMode !== 'PvE' ||
        state.status !== GameStatus.Active ||
        state.turn !== AI_PLAYER ||
        state.isDeadlocked ||
        pendingMoveRef.current !== null
      ) return;

      setIsAiThinking(true);
      frameId = requestAnimationFrame(() => {
        const currentState = gameStateRef.current;
        const best = findBestMove(currentState, depth, AI_PLAYER);
        if (best !== null) {
          const nextState = makeMove(currentState, best.from, best.to);
          setPendingMove({ from: best.from, to: best.to, nextState });
        }
        setIsAiThinking(false);
      });
    }, 600);

    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frameId);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turn, gameState.status, gameState.isDeadlocked, opponentMode, pendingMove]);

  // -------------------------------------------------------------------------
  // Deadlock side-effects: haptics, notify parent, clear flag after 2 s
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (!gameState.isDeadlocked) return;

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

    const blockedPlayer = gameState.turn === Player.White ? Player.Black : Player.White;
    onDeadlock?.(
      `${blockedPlayer} is trapped — ${gameState.turn} moves again`,
    );

    const t = setTimeout(() => {
      setGameState(prev => ({ ...prev, isDeadlocked: false, deadlockedPiece: null }));
    }, 2000);

    return () => clearTimeout(t);
  }, [gameState.isDeadlocked]);

  // -------------------------------------------------------------------------
  // Derived sets (memoised)
  // -------------------------------------------------------------------------
  const availableSet = useMemo(() => {
    const available = getAvailablePieces(gameState);
    return new Set(available.map(p => p.row * BOARD_SIZE + p.col));
  }, [gameState]);

  const legalMoveIndices = useMemo(() => {
    if (!selectedPiece) return new Set<number>();
    const moves = getLegalMoves(gameState.board, selectedPiece.row, selectedPiece.col);
    return new Set(moves.map(m => m.row * BOARD_SIZE + m.col));
  }, [selectedPiece, gameState.board]);

  // -------------------------------------------------------------------------
  // Human input handlers — blocked while AI is thinking or animating
  // -------------------------------------------------------------------------
  const handleDragonPress = useCallback((row: number, col: number): void => {
    if (isGameOver || isAiThinking || pendingMove !== null) return;
    if (!availableSet.has(row * BOARD_SIZE + col)) return;
    setSelectedPiece(prev =>
      prev?.row === row && prev?.col === col ? null : { row, col },
    );
  }, [isGameOver, isAiThinking, pendingMove, availableSet]);

  const handleCellPress = useCallback((row: number, col: number): void => {
    if (isGameOver || isAiThinking || pendingMove !== null) return;
    if (!selectedPiece || !legalMoveIndices.has(row * BOARD_SIZE + col)) return;
    const from      = selectedPiece;
    const to        = { row, col };
    const nextState = makeMove(gameStateRef.current, from, to);
    setPendingMove({ from, to, nextState });
    setSelectedPiece(null);
  }, [isGameOver, isAiThinking, pendingMove, selectedPiece, legalMoveIndices]);

  // Stable ref — zero deps keeps Dragon's memo comparator from seeing a new
  // function reference every render. pendingMoveRef gives access to latest state.
  const handleAnimationComplete = useCallback((): void => {
    const pm = pendingMoveRef.current;
    if (pm) {
      setGameState(pm.nextState);
      setPendingMove(null);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Timeout handlers — use functional setState to safely guard against the
  // rare case where both clocks hit 0 in the same tick (keeps first win only).
  // -------------------------------------------------------------------------
  const handleWhiteTimeout = useCallback((): void => {
    setGameState(prev => {
      if (prev.status !== GameStatus.Active) return prev;
      return { ...prev, status: GameStatus.WonPlayer2_Timeout };
    });
  }, []);

  const handleBlackTimeout = useCallback((): void => {
    setGameState(prev => {
      if (prev.status !== GameStatus.Active) return prev;
      return { ...prev, status: GameStatus.WonPlayer1_Timeout };
    });
  }, []);

  const handleReset = (): void => {
    setClockEpoch(prev => prev + 1);
    setIsAiThinking(false);
    setGameState(newGame(scoringModeRef.current));
    setSelectedPiece(null);
    setPendingMove(null);
  };

  const handleToggleOpponent = (): void => {
    Haptics.selectionAsync();
    setOpponentMode(prev => (prev === 'PvE' ? 'PvP' : 'PvE'));
    setIsAiThinking(false);
    setClockEpoch(prev => prev + 1);
    setGameState(newGame(scoringModeRef.current));
    setSelectedPiece(null);
    setPendingMove(null);
  };

  const handleSetDifficulty = (next: Difficulty): void => {
    if (next === difficulty) return;
    Haptics.selectionAsync();
    setDifficulty(next);
    setIsAiThinking(false);
    setClockEpoch(prev => prev + 1);
    setGameState(newGame(scoringModeRef.current));
    setSelectedPiece(null);
    setPendingMove(null);
  };

  const handleSetScoringMode = (mode: GameMode): void => {
    if (mode === scoringMode) return;
    setScoringMode(mode);
    setIsAiThinking(false);
    setClockEpoch(prev => prev + 1);
    setGameState(newGame(mode));
    setSelectedPiece(null);
    setPendingMove(null);
  };

  // -------------------------------------------------------------------------
  // Overlay Dragon: lifted out of its Cell so it renders above all sibling
  // cells regardless of paint order. Board state is deferred until the
  // animation completes, so the Cell below shows empty while it flies.
  // -------------------------------------------------------------------------
  const overlayPiece = pendingMove !== null
    ? gameState.board[pendingMove.from.row][pendingMove.from.col]
    : null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <View style={styles.wrapper}>
      {/* Score row — placeholder height in Single, live score in Match/Marathon */}
      <ScoreHeader
        gameMode={gameState.gameMode}
        matchScore={gameState.matchScore}
        roundNumber={gameState.roundNumber}
      />

      {/* Chess clocks — one per player, keyed so they remount on reset/new round */}
      <View style={styles.clockRow}>
        <ChessClock
          key={`w-${clockEpoch}-${gameState.roundNumber}`}
          label="White"
          isActive={hasGameStarted && gameState.turn === Player.White && !isGameOver}
          initialSeconds={DEFAULT_CLOCK_SECONDS}
          onTimeOut={handleWhiteTimeout}
        />
        <ChessClock
          key={`b-${clockEpoch}-${gameState.roundNumber}`}
          label="Black"
          isActive={hasGameStarted && gameState.turn === Player.Black && !isGameOver}
          initialSeconds={DEFAULT_CLOCK_SECONDS}
          onTimeOut={handleBlackTimeout}
        />
      </View>

      {/* Board area */}
      <View style={styles.container}>
        <View style={styles.board}>
          {FLAT_BOARD_COLORS.map((color, index) => {
            const row   = Math.floor(index / BOARD_SIZE);
            const col   = index % BOARD_SIZE;
            const piece = gameState.board[row][col];
            const isSelected  = selectedPiece?.row === row && selectedPiece?.col === col;
            const isLegalMove = legalMoveIndices.has(index);

            // Hide the in-cell Dragon while it's animating in the overlay.
            const isAnimatingSource =
              pendingMove?.from.row === row && pendingMove?.from.col === col;

            const shakeNow =
              gameState.isDeadlocked &&
              gameState.deadlockedPiece?.row === row &&
              gameState.deadlockedPiece?.col === col;

            return (
              <Cell
                key={index}
                color={color}
                size={CELL_SIZE}
                selected={isSelected}
                onPress={
                  piece === null && !isGameOver && !isAiThinking && pendingMove === null
                    ? () => handleCellPress(row, col)
                    : undefined
                }
              >
                <LegalMoveDot visible={isLegalMove && !isAiThinking} />
                {piece !== null && !isAnimatingSource && (
                  <Dragon
                    key={`${piece.color}-${piece.player}`}
                    color={piece.color}
                    player={piece.player}
                    cellSize={CELL_SIZE}
                    selected={isSelected}
                    shakeNow={shakeNow}
                    onPress={() => handleDragonPress(row, col)}
                  />
                )}
              </Cell>
            );
          })}
        </View>

        {/* Overlay: animating Dragon rendered above all cells.
            Positioned at the source cell; Dragon translates to the destination.
            pointerEvents="none" keeps it non-interactive. */}
        {pendingMove !== null && overlayPiece !== null && (
          <View
            pointerEvents="none"
            style={[
              styles.dragonOverlay,
              {
                left: pendingMove.from.col * CELL_SIZE,
                top:  pendingMove.from.row * CELL_SIZE,
              },
            ]}
          >
            <Dragon
              key="overlay-dragon"
              color={overlayPiece.color}
              player={overlayPiece.player}
              cellSize={CELL_SIZE}
              selected={false}
              animateTo={{
                dx: (pendingMove.to.col - pendingMove.from.col) * CELL_SIZE,
                dy: (pendingMove.to.row - pendingMove.from.row) * CELL_SIZE,
              }}
              onAnimationComplete={handleAnimationComplete}
              shakeNow={false}
            />
          </View>
        )}

        {/* Thinking indicator — floats above the board, non-interactive */}
        {isAiThinking && (
          <View style={styles.thinkingBanner} pointerEvents="none">
            <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
            <Text style={styles.thinkingText}>Bot is thinking…</Text>
          </View>
        )}

        <WinOverlay
          status={gameState.status}
          gameMode={gameState.gameMode}
          matchScore={gameState.matchScore}
          onReset={handleReset}
        />
      </View>

      {/* Controls row: opponent toggle + difficulty picker */}
      <View style={styles.controlsRow}>
        {/* Opponent toggle */}
        <Pressable
          onPress={handleToggleOpponent}
          style={({ pressed }) => [styles.modeButton, pressed && styles.controlPressed]}
        >
          <Text style={styles.modeButtonText}>
            {opponentMode === 'PvE' ? 'vs Bot' : 'vs Human'}
          </Text>
        </Pressable>

        {/* Difficulty segmented control — only meaningful in PvE */}
        <View style={[styles.difficultyRow, opponentMode === 'PvP' && styles.difficultyRowDisabled]}>
          {DIFFICULTIES.map((level, i) => {
            const isActive = difficulty === level;
            const isFirst  = i === 0;
            const isLast   = i === DIFFICULTIES.length - 1;
            return (
              <Pressable
                key={level}
                onPress={() => handleSetDifficulty(level)}
                disabled={opponentMode === 'PvP'}
                style={[
                  styles.diffSegment,
                  isFirst  && styles.diffSegmentFirst,
                  isLast   && styles.diffSegmentLast,
                  isActive && styles.diffSegmentActive,
                ]}
              >
                <Text style={[styles.diffSegmentText, isActive && styles.diffSegmentTextActive]}>
                  {level}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Scoring mode selector: Single | Match | Marathon */}
      <ModeSelector value={scoringMode} onChange={handleSetScoringMode} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 14,
  },
  container: {
    width: boardWidth,
    height: boardWidth,
    position: 'relative',
  },
  board: {
    width: boardWidth,
    height: boardWidth,
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  legalMoveDot: {
    position: 'absolute',
    width: CELL_SIZE * 0.28,
    height: CELL_SIZE * 0.28,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.75)',
  },
  thinkingBanner: {
    position: 'absolute',
    top: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  thinkingText: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  // ---- controls ----
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modeButton: {
    paddingVertical: 9,
    paddingHorizontal: 18,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  controlPressed: {
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  modeButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  // ---- difficulty segmented control ----
  difficultyRow: {
    flexDirection: 'row',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    overflow: 'hidden',
  },
  difficultyRowDisabled: {
    opacity: 0.35,
  },
  diffSegment: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  diffSegmentFirst: {
    borderTopLeftRadius: 19,
    borderBottomLeftRadius: 19,
  },
  diffSegmentLast: {
    borderTopRightRadius: 19,
    borderBottomRightRadius: 19,
  },
  diffSegmentActive: {
    backgroundColor: 'rgba(255,255,255,0.85)',
  },
  diffSegmentText: {
    color: 'rgba(255,255,255,0.65)',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  diffSegmentTextActive: {
    color: '#0F172A',
  },
  dragonOverlay: {
    position: 'absolute',
    width:  CELL_SIZE,
    height: CELL_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    elevation: 20,
  },
  clockRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    width:          boardWidth,
  },
});
