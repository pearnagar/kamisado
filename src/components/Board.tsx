import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BOARD_COLORS, BOARD_SIZE, GameStatus, KamisadoColor, Player } from '../constants/gameConstants';
import { GameState, createInitialGameState, resetGame } from '../engine/gameState';
import { getLegalMoves, getAvailablePieces } from '../engine/moveValidator';
import { makeMove } from '../engine/moveLogic';
import { findBestMove } from '../engine/aiEngine';
import Cell from './Cell';
import Dragon from './Dragon';
import WinOverlay from './WinOverlay';

const CELL_SIZE  = 44;
const boardWidth = BOARD_SIZE * CELL_SIZE;
const FLAT_BOARD_COLORS: readonly KamisadoColor[] = BOARD_COLORS.flat() as KamisadoColor[];

const AI_PLAYER = Player.Black;
const AI_DEPTH  = 4;

type GameMode = 'PvE' | 'PvP';

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

interface AnimatingMove {
  from: { row: number; col: number };
  to:   { row: number; col: number };
}

interface BoardProps {
  onDeadlock?: (message: string) => void;
}

export default function Board({ onDeadlock }: BoardProps): React.JSX.Element {
  const [gameState, setGameState]         = useState<GameState>(createInitialGameState);
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [animatingMove, setAnimatingMove] = useState<AnimatingMove | null>(null);
  const [isAiThinking, setIsAiThinking]   = useState(false);
  const [gameMode, setGameMode]           = useState<GameMode>('PvE');

  // Stable ref so the AI timeout always reads the latest state without
  // `gameState` itself being in the effect's dependency array.
  const gameStateRef = useRef(gameState);
  gameStateRef.current = gameState;

  const isGameOver = gameState.status !== GameStatus.Active;

  // -------------------------------------------------------------------------
  // AI: fires when the turn belongs to the AI, mode is PvE, and no deadlock
  //     animation is in progress.
  //
  // Dependency on `gameState.isDeadlocked` is intentional: when a move causes
  // the opponent to be deadlocked and the turn stays with (or returns to) the
  // AI, `gameState.turn` alone doesn't change — adding `isDeadlocked` ensures
  // the effect re-evaluates once the shake animation clears the flag.
  // -------------------------------------------------------------------------
  useEffect(() => {
    // PvP mode: humans control both sides
    if (gameMode !== 'PvE') return;

    // Not AI's turn or game is over
    if (gameState.status !== GameStatus.Active || gameState.turn !== AI_PLAYER) return;

    // Deadlock shake is still playing — wait for the flag to clear
    if (gameState.isDeadlocked) return;

    setIsAiThinking(true);

    const t = setTimeout(() => {
      const state = gameStateRef.current;

      // Re-validate: state may have changed while the timer was pending
      if (
        gameMode !== 'PvE' ||
        state.status !== GameStatus.Active ||
        state.turn !== AI_PLAYER ||
        state.isDeadlocked
      ) {
        setIsAiThinking(false);
        return;
      }

      const best = findBestMove(state, AI_DEPTH, AI_PLAYER);
      if (best !== null) {
        const from = best.from;
        const to   = best.to;
        setAnimatingMove({ from, to });
        setGameState(makeMove(state, from, to));
      }
      setIsAiThinking(false);
    }, 500);

    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameState.turn, gameState.status, gameState.isDeadlocked, gameMode]);

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
  // Human input handlers — blocked while AI is thinking
  // -------------------------------------------------------------------------
  const handleDragonPress = (row: number, col: number): void => {
    if (isGameOver || isAiThinking || !availableSet.has(row * BOARD_SIZE + col)) return;
    setSelectedPiece(prev =>
      prev?.row === row && prev?.col === col ? null : { row, col },
    );
  };

  const handleCellPress = (row: number, col: number): void => {
    if (isGameOver || isAiThinking || !selectedPiece || !legalMoveIndices.has(row * BOARD_SIZE + col)) return;
    const from = selectedPiece;
    const to   = { row, col };
    setAnimatingMove({ from, to });
    setGameState(prev => makeMove(prev, from, to));
    setSelectedPiece(null);
  };

  const handleReset = (): void => {
    setIsAiThinking(false);
    setGameState(resetGame());
    setSelectedPiece(null);
    setAnimatingMove(null);
  };

  const handleToggleMode = (): void => {
    Haptics.selectionAsync();
    const next: GameMode = gameMode === 'PvE' ? 'PvP' : 'PvE';
    setGameMode(next);
    setIsAiThinking(false);
    setGameState(resetGame());
    setSelectedPiece(null);
    setAnimatingMove(null);
  };

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------
  return (
    <View style={styles.wrapper}>
      {/* Board area */}
      <View style={styles.container}>
        <View style={styles.board}>
          {FLAT_BOARD_COLORS.map((color, index) => {
            const row   = Math.floor(index / BOARD_SIZE);
            const col   = index % BOARD_SIZE;
            const piece = gameState.board[row][col];
            const isSelected  = selectedPiece?.row === row && selectedPiece?.col === col;
            const isLegalMove = legalMoveIndices.has(index);

            const isAnimatingTarget =
              animatingMove?.to.row === row && animatingMove?.to.col === col;
            const animateFrom = isAnimatingTarget && animatingMove
              ? {
                  dx: (animatingMove.from.col - col) * CELL_SIZE,
                  dy: (animatingMove.from.row - row) * CELL_SIZE,
                }
              : undefined;

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
                onPress={piece === null && !isGameOver && !isAiThinking ? () => handleCellPress(row, col) : undefined}
              >
                <LegalMoveDot visible={isLegalMove && !isAiThinking} />
                {piece !== null && (
                  <Dragon
                    color={piece.color}
                    player={piece.player}
                    cellSize={CELL_SIZE}
                    selected={isSelected}
                    animateFrom={animateFrom}
                    onAnimationComplete={() => setAnimatingMove(null)}
                    shakeNow={shakeNow}
                    onPress={() => handleDragonPress(row, col)}
                  />
                )}
              </Cell>
            );
          })}
        </View>

        {/* Thinking indicator — floats above the board, non-interactive */}
        {isAiThinking && (
          <View style={styles.thinkingBanner} pointerEvents="none">
            <ActivityIndicator size="small" color="rgba(255,255,255,0.9)" />
            <Text style={styles.thinkingText}>Bot is thinking…</Text>
          </View>
        )}

        <WinOverlay status={gameState.status} onReset={handleReset} />
      </View>

      {/* Mode toggle — sits below the board */}
      <Pressable
        onPress={handleToggleMode}
        style={({ pressed }) => [styles.modeButton, pressed && styles.modeButtonPressed]}
      >
        <Text style={styles.modeButtonText}>
          {gameMode === 'PvE' ? 'Mode: vs Bot' : 'Mode: vs Human'}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
    gap: 16,
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
  modeButton: {
    paddingVertical: 10,
    paddingHorizontal: 28,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modeButtonPressed: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  modeButtonText: {
    color: 'rgba(255,255,255,0.75)',
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
