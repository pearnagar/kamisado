import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { useNavigation } from '@react-navigation/native';
import {
  BOARD_COLORS,
  MEGA_BOARD_COLORS,
  BoardVariant,
  BOARD_CONFIGS,
  DEFAULT_CLOCK_SECONDS,
  GameMode,
  GameStatus,
  KamisadoColor,
  Player,
} from '../constants/gameConstants';
import { GameState, createInitialGameState } from '../engine/gameState';
import { getLegalMoves, getAvailablePieces } from '../engine/moveValidator';
import { makeMove } from '../engine/moveLogic';
import { findBestMove } from '../engine/aiEngine';
import { initSounds, unloadSounds, playSound } from '../utils/soundManager';
import Cell from './Cell';
import ChessClock from './ChessClock';
import Dragon from './Dragon';
import ScoreHeader from './ScoreHeader';
import WinOverlay from './WinOverlay';

const AI_PLAYER = Player.Black;

/** PvE = vs Bot, PvP = pass-and-play */
type OpponentMode = 'PvE' | 'PvP';
type Difficulty   = 'Easy' | 'Medium' | 'Hard';

const DIFFICULTY_DEPTH: Record<Difficulty, number> = {
  Easy:   2,
  Medium: 4,
  Hard:   6,
};

/**
 * On 10×10 Mega boards the branching factor is significantly higher.
 * Cap the effective search depth to keep the AI responsive on mid-range devices.
 */
const MEGA_MAX_DEPTH = 4;

/**
 * A pending move holds the pre-computed next GameState so that the board
 * update is deferred until the slide animation finishes. This eliminates the
 * one-frame ghost that occurred when makeMove() ran before the Dragon mounted.
 *
 * isUndo: when true, handleAnimationComplete skips the history push and
 * restores nextLastMove instead of recording the new position as lastMove.
 */
interface PendingMove {
  from:          { row: number; col: number };
  to:            { row: number; col: number };
  nextState:     GameState;
  isUndo?:       boolean;
  nextLastMove?: { from: { row: number; col: number }; to: { row: number; col: number } } | null;
}

interface BoardProps {
  onDeadlock?:   (message: string) => void;
  gameMode:      'pvp' | 'pve';
  difficulty:    'easy' | 'medium' | 'hard';
  matchType:     'single' | 'match';
  boardVariant?: 'standard' | 'mega';
}

export default function Board({
  onDeadlock,
  gameMode,
  difficulty,
  matchType,
  boardVariant = 'standard',
}: BoardProps): React.JSX.Element {
  const navigation = useNavigation<any>();
  const { width: screenWidth } = useWindowDimensions();

  // --- Derive board config from the prop ---
  const variant: BoardVariant =
    boardVariant === 'mega' ? BoardVariant.Mega : BoardVariant.Standard;
  const activeBoardConfig = BOARD_CONFIGS[variant];
  const boardSize  = activeBoardConfig.size;
  const boardColors = boardVariant === 'mega' ? MEGA_BOARD_COLORS : BOARD_COLORS;

  // Dynamic cell size — fill screen width minus 16px padding on each side.
  const CELL_SIZE  = Math.floor((screenWidth - 32) / boardSize);
  const boardWidth = boardSize * CELL_SIZE;

  // Flat list of cell colors for the board grid renderer.
  // Recomputed only when boardVariant changes.
  const FLAT_BOARD_COLORS = useMemo(
    () => boardColors.flat() as KamisadoColor[],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [boardVariant],
  );

  // Map props to internal types
  const opponentMode: OpponentMode = gameMode === 'pvp' ? 'PvP' : 'PvE';
  const internalDifficulty: Difficulty =
    (difficulty.charAt(0).toUpperCase() + difficulty.slice(1)) as Difficulty;
  const scoringMode: GameMode = matchType === 'match' ? GameMode.Match : GameMode.Single;

  interface HistoryEntry {
    gameState: GameState;
    lastMove:  { from: { row: number; col: number }; to: { row: number; col: number } } | null;
    /** The move that was made to reach this state — needed to animate in reverse. */
    move:      { from: { row: number; col: number }; to: { row: number; col: number } };
  }

  /** Creates a fresh game with the chosen scoring mode and board variant baked in. */
  const newGame = useCallback((mode: GameMode): GameState => ({
    ...createInitialGameState(variant),
    gameMode: mode,
  }), [variant]);

  const [gameState, setGameState]         = useState<GameState>(() => newGame(scoringMode));
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [pendingMove, setPendingMove]     = useState<PendingMove | null>(null);
  const [isAiThinking, setIsAiThinking]   = useState(false);
  const [history, setHistory]             = useState<HistoryEntry[]>([]);
  // Incremented on every explicit reset so ChessClock key changes even when
  // roundNumber stays at 1 (e.g. restarting a finished Single game).
  const [clockEpoch, setClockEpoch]       = useState(0);
  const [lastMove, setLastMove]           = useState<{
    from: { row: number; col: number };
    to:   { row: number; col: number };
  } | null>(null);

  // Stable refs so async callbacks always read the latest values without
  // those values being in effect dependency arrays.
  const gameStateRef        = useRef(gameState);
  const difficultyRef       = useRef(internalDifficulty);
  const pendingMoveRef      = useRef(pendingMove);
  const lastMoveRef         = useRef(lastMove);
  // Holds the second undo step for PvE so it can be chained inside
  // handleAnimationComplete without a setTimeout.
  const pendingUndoChainRef = useRef<HistoryEntry | null>(null);
  gameStateRef.current   = gameState;
  difficultyRef.current  = internalDifficulty;
  pendingMoveRef.current = pendingMove;
  lastMoveRef.current    = lastMove;

  const isGameOver     = gameState.status !== GameStatus.Active;
  const hasGameStarted = gameState.moveHistory.length > 0;

  // -------------------------------------------------------------------------
  // Sound: preload pool on mount, release on unmount
  // -------------------------------------------------------------------------
  useEffect(() => {
    void initSounds();
    return () => { void unloadSounds(); };
  }, []);

  // -------------------------------------------------------------------------
  // AI: fires when the turn belongs to the AI, mode is PvE, and no animation
  //     is in progress.
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (opponentMode !== 'PvE') return;
    if (gameState.status !== GameStatus.Active || gameState.turn !== AI_PLAYER) return;
    if (gameState.isDeadlocked) return;
    if (pendingMove !== null) return; // wait for slide animation to finish

    let frameId: ReturnType<typeof requestAnimationFrame>;

    const timer = setTimeout(() => {
      const state = gameStateRef.current;
      // Cap depth for Mega boards to keep AI responsive
      const baseDepth  = DIFFICULTY_DEPTH[difficultyRef.current];
      const depth      = variant === BoardVariant.Mega
        ? Math.min(baseDepth, MEGA_MAX_DEPTH)
        : baseDepth;

      if (
        opponentMode !== 'PvE' ||
        state.status !== GameStatus.Active ||
        state.turn !== AI_PLAYER ||
        state.isDeadlocked ||
        pendingMoveRef.current !== null
      ) return;

      frameId = requestAnimationFrame(() => {
        setIsAiThinking(true);
        const currentState = gameStateRef.current;
        const best = findBestMove(currentState, depth, AI_PLAYER);
        if (best !== null) {
          const nextState = makeMove(currentState, best.from, best.to);
          playSound('slide');
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

    playSound('warning');
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
  // Derived sets (memoised) — index = row * boardSize + col
  // -------------------------------------------------------------------------
  const availableSet = useMemo(() => {
    const available = getAvailablePieces(gameState);
    return new Set(available.map(p => p.row * boardSize + p.col));
  }, [gameState, boardSize]);

  const legalMoveIndices = useMemo(() => {
    if (!selectedPiece) return new Set<number>();
    const moves = getLegalMoves(
      gameState.board,
      selectedPiece.row,
      selectedPiece.col,
      gameState.boardConfig,
    );
    return new Set(moves.map(m => m.row * boardSize + m.col));
  }, [selectedPiece, gameState.board, gameState.boardConfig, boardSize]);

  const lastMoveIndices = useMemo(() => {
    if (!lastMove) return new Set<number>();
    return new Set([
      lastMove.from.row * boardSize + lastMove.from.col,
      lastMove.to.row   * boardSize + lastMove.to.col,
    ]);
  }, [lastMove, boardSize]);

  // Forced piece: only when exactly one piece can move (all turns after the first).
  const forcedPieceIndex = useMemo(() => {
    if (!hasGameStarted || isGameOver || availableSet.size !== 1) return -1;
    return [...availableSet][0];
  }, [hasGameStarted, isGameOver, availableSet]);

  // -------------------------------------------------------------------------
  // Human input handlers
  // -------------------------------------------------------------------------
  const handleDragonPress = useCallback((row: number, col: number): void => {
    if (isGameOver || isAiThinking || pendingMove !== null) return;
    if (!availableSet.has(row * boardSize + col)) return;
    const isDeselect = selectedPiece?.row === row && selectedPiece?.col === col;
    if (!isDeselect) playSound('select');
    setSelectedPiece(prev =>
      prev?.row === row && prev?.col === col ? null : { row, col },
    );
  }, [isGameOver, isAiThinking, pendingMove, availableSet, boardSize, selectedPiece]);

  const handleCellPress = useCallback((row: number, col: number): void => {
    if (isGameOver || isAiThinking || pendingMove !== null) return;
    if (!selectedPiece) return;
    if (!legalMoveIndices.has(row * boardSize + col)) {
      playSound('invalid');
      return;
    }
    const from      = selectedPiece;
    const to        = { row, col };
    const nextState = makeMove(gameStateRef.current, from, to);
    playSound('slide');
    setPendingMove({ from, to, nextState });
    setSelectedPiece(null);
  }, [isGameOver, isAiThinking, pendingMove, selectedPiece, legalMoveIndices, boardSize]);

  const handleAnimationComplete = useCallback((): void => {
    const pm = pendingMoveRef.current;
    if (!pm) return;

    if (!pm.isUndo) {
      const roundChanged = pm.nextState.roundNumber > gameStateRef.current.roundNumber;
      if (roundChanged) {
        // A new round started — wipe history so Undo cannot cross round boundaries.
        setHistory([]);
        setLastMove(null);
      } else {
        setHistory(prev => [...prev, {
          gameState: gameStateRef.current,
          lastMove:  lastMoveRef.current,
          move:      { from: pm.from, to: pm.to },
        }]);
        setLastMove({ from: pm.from, to: pm.to });
      }
    } else {
      setLastMove(pm.nextLastMove !== undefined ? pm.nextLastMove : null);
    }

    setGameState(pm.nextState);
    setPendingMove(null);

    // Chain second undo step (PvE only)
    const chain = pendingUndoChainRef.current;
    if (chain) {
      pendingUndoChainRef.current = null;
      setPendingMove({
        from:         chain.move.to,
        to:           chain.move.from,
        nextState:    chain.gameState,
        nextLastMove: chain.lastMove,
        isUndo:       true,
      });
    }
  }, []);

  // -------------------------------------------------------------------------
  // Timeout handlers
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

  const handleUndo = (): void => {
    if (opponentMode === 'PvP') {
      if (history.length < 1) return;
      const entry = history[history.length - 1];
      setHistory(prev => prev.slice(0, -1));
      setSelectedPiece(null);
      setPendingMove({
        from:         entry.move.to,
        to:           entry.move.from,
        nextState:    entry.gameState,
        nextLastMove: entry.lastMove,
        isUndo:       true,
      });
      return;
    }

    // PvE: reverse bot's move then chain human's move reversal.
    if (history.length < 2) return;
    const botEntry   = history[history.length - 1];
    const humanEntry = history[history.length - 2];
    setHistory(prev => prev.slice(0, -2));
    setSelectedPiece(null);
    pendingUndoChainRef.current = humanEntry;
    setPendingMove({
      from:         botEntry.move.to,
      to:           botEntry.move.from,
      nextState:    botEntry.gameState,
      nextLastMove: botEntry.lastMove,
      isUndo:       true,
    });
  };

  const handleReset = (): void => {
    setClockEpoch(prev => prev + 1);
    setIsAiThinking(false);
    pendingUndoChainRef.current = null;
    setGameState(newGame(scoringMode));
    setSelectedPiece(null);
    setPendingMove(null);
    setLastMove(null);
    setHistory([]);
  };

  // -------------------------------------------------------------------------
  // Overlay Dragon
  // -------------------------------------------------------------------------
  const overlayPiece = pendingMove !== null
    ? gameState.board[pendingMove.from.row][pendingMove.from.col]
    : null;

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <View style={styles.wrapper}>
      <ScoreHeader
        gameMode={gameState.gameMode}
        matchScore={gameState.matchScore}
        roundNumber={gameState.roundNumber}
      />

      <View style={[styles.clockRow, { width: boardWidth }]}>
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
      <View style={{ width: boardWidth, height: boardWidth, position: 'relative' }}>
        <View style={{ width: boardWidth, height: boardWidth, flexDirection: 'row', flexWrap: 'wrap' }}>
          {FLAT_BOARD_COLORS.map((color, index) => {
            const row   = Math.floor(index / boardSize);
            const col   = index % boardSize;
            const piece = gameState.board[row][col];
            const isSelected    = selectedPiece?.row === row && selectedPiece?.col === col;
            const isLegalMove   = legalMoveIndices.has(index);
            const isLastMove    = lastMoveIndices.has(index);
            const isForcedPiece = forcedPieceIndex === index;

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
                {isLastMove && (
                  <View pointerEvents="none" style={styles.lastMoveOverlay} />
                )}
                <LegalMoveDot
                  visible={isLegalMove && !isAiThinking}
                  cellSize={CELL_SIZE}
                />
                {piece !== null && !isAnimatingSource && (
                  <View style={isForcedPiece ? [
                    styles.forcedPieceWrapper,
                    { borderColor: piece.player === Player.White ? '#000000' : '#FFFFFF' },
                  ] : undefined}>
                    <Dragon
                      key={`${piece.color}-${piece.player}`}
                      color={piece.color}
                      player={piece.player}
                      cellSize={CELL_SIZE}
                      selected={isSelected}
                      shakeNow={shakeNow}
                      onPress={() => handleDragonPress(row, col)}
                    />
                  </View>
                )}
              </Cell>
            );
          })}
        </View>

        {/* Overlay Dragon — rendered above all cells during animation */}
        {pendingMove !== null && overlayPiece !== null && (
          <View
            pointerEvents="none"
            style={{
              position:        'absolute',
              width:           CELL_SIZE,
              height:          CELL_SIZE,
              left:            pendingMove.from.col * CELL_SIZE,
              top:             pendingMove.from.row * CELL_SIZE,
              justifyContent:  'center',
              alignItems:      'center',
              zIndex:          1000,
              elevation:       20,
            }}
          >
            <Dragon
              key={`overlay-dragon-${pendingMove.from.row}-${pendingMove.from.col}`}
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

        <WinOverlay
          status={gameState.status}
          gameMode={gameState.gameMode}
          matchScore={gameState.matchScore}
          onReset={handleReset}
          onGoBack={() => navigation.goBack()}
        />
      </View>

      {/* Bottom controls */}
      {!isGameOver && (
        <View style={styles.bottomRow}>
          {(() => {
            const canUndo = pendingMove === null && !isAiThinking &&
              history.length >= (opponentMode === 'PvE' ? 2 : 1);
            return (
              <Pressable
                onPress={handleUndo}
                disabled={!canUndo}
                style={({ pressed }) => [
                  styles.quitButton,
                  pressed && canUndo && styles.quitButtonPressed,
                  !canUndo && styles.quitButtonDisabled,
                ]}
              >
                <Text style={[styles.quitButtonText, !canUndo && styles.quitButtonTextDisabled]}>
                  Undo
                </Text>
              </Pressable>
            );
          })()}
          <Pressable
            onPress={() => navigation.goBack()}
            style={({ pressed }) => [styles.quitButton, pressed && styles.quitButtonPressed]}
          >
            <Text style={styles.quitButtonText}>Forfeit / Quit</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

// -------------------------------------------------------------------------
// LegalMoveDot — receives cellSize as prop so it can scale correctly
// -------------------------------------------------------------------------
function LegalMoveDot({
  visible,
  cellSize,
}: {
  visible:  boolean;
  cellSize: number;
}): React.JSX.Element {
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: 200 });
  }, [visible]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
  const dotSize = cellSize * 0.28;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position:     'absolute',
          width:        dotSize,
          height:       dotSize,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.75)',
        },
        animatedStyle,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 14,
  },
  clockRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
  },
  lastMoveOverlay: {
    position:        'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.3)',
  },
  forcedPieceWrapper: {
    borderRadius: 999,
    borderWidth:  3,
    borderColor:  '#FFFFFF',
  },
  quitButton: {
    paddingVertical:   8,
    paddingHorizontal: 24,
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       'rgba(255,255,255,0.2)',
  },
  quitButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  quitButtonText: {
    color:         'rgba(255,255,255,0.45)',
    fontSize:      13,
    fontWeight:    '500',
    letterSpacing: 0.2,
  },
  quitButtonDisabled: {
    borderColor: 'rgba(255,255,255,0.08)',
  },
  quitButtonTextDisabled: {
    color: 'rgba(255,255,255,0.2)',
  },
  bottomRow: {
    flexDirection: 'row',
    gap:           12,
  },
});
