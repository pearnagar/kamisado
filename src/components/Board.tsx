import React, { useState, useMemo, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { BOARD_COLORS, BOARD_SIZE, GameStatus, KamisadoColor, Player } from '../constants/gameConstants';
import { GameState, createInitialGameState, resetGame } from '../engine/gameState';
import { getLegalMoves, getAvailablePieces } from '../engine/moveValidator';
import { makeMove } from '../engine/moveLogic';
import Cell from './Cell';
import Dragon from './Dragon';
import WinOverlay from './WinOverlay';

const CELL_SIZE = 44;
const boardWidth = BOARD_SIZE * CELL_SIZE;
const FLAT_BOARD_COLORS: readonly KamisadoColor[] = BOARD_COLORS.flat() as KamisadoColor[];

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
  const [gameState, setGameState] = useState<GameState>(createInitialGameState);
  const [selectedPiece, setSelectedPiece] = useState<{ row: number; col: number } | null>(null);
  const [animatingMove, setAnimatingMove] = useState<AnimatingMove | null>(null);

  const isGameOver = gameState.status !== GameStatus.Active;

  // Deadlock side-effects: haptics, notify parent, clear flag after 2s
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

  const availableSet = useMemo(() => {
    const available = getAvailablePieces(gameState);
    return new Set(available.map(p => p.row * BOARD_SIZE + p.col));
  }, [gameState]);

  const legalMoveIndices = useMemo(() => {
    if (!selectedPiece) return new Set<number>();
    const moves = getLegalMoves(gameState.board, selectedPiece.row, selectedPiece.col);
    return new Set(moves.map(m => m.row * BOARD_SIZE + m.col));
  }, [selectedPiece, gameState.board]);

  const handleDragonPress = (row: number, col: number): void => {
    if (isGameOver || !availableSet.has(row * BOARD_SIZE + col)) return;
    setSelectedPiece(prev =>
      prev?.row === row && prev?.col === col ? null : { row, col },
    );
  };

  const handleCellPress = (row: number, col: number): void => {
    if (isGameOver || !selectedPiece || !legalMoveIndices.has(row * BOARD_SIZE + col)) return;
    const from = selectedPiece;
    const to = { row, col };
    setAnimatingMove({ from, to });
    setGameState(prev => makeMove(prev, from, to));
    setSelectedPiece(null);
  };

  const handleReset = (): void => {
    setGameState(resetGame());
    setSelectedPiece(null);
    setAnimatingMove(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.board}>
        {FLAT_BOARD_COLORS.map((color, index) => {
          const row = Math.floor(index / BOARD_SIZE);
          const col = index % BOARD_SIZE;
          const piece = gameState.board[row][col];
          const isSelected = selectedPiece?.row === row && selectedPiece?.col === col;
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
              onPress={piece === null && !isGameOver ? () => handleCellPress(row, col) : undefined}
            >
              <LegalMoveDot visible={isLegalMove} />
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
      <WinOverlay status={gameState.status} onReset={handleReset} />
    </View>
  );
}

const styles = StyleSheet.create({
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
});
