# Kamisado Core — Game Logic Reference

## The Board
8x8 grid. Each cell has a fixed color. The layout is rotationally symmetric — black's view mirrors white's.

### Color Grid (Row 0 = Black's back rank)
```
O  B  R  G  Y  P  M  Br   (row 0)
R  O  G  M  B  Y  Br  P
G  M  O  R  P  Br  Y  B
M  G  B  O  Br  R  P  Y
Y  P  R  Br  O  B  G  M
P  Y  Br  B  R  O  M  G
Br  R  Y  P  M  G  B  O
B  M  P  Y  G  Br  O  R   (row 7 = White's back rank)
```
Key: O=Orange, B=Blue, R=Red, G=Green, Y=Yellow, P=Purple, M=Magenta, Br=Brown

## Pieces
Each player has 8 dragon pieces, one per color.
Initial positions: Black row 0, White row 7 (each piece on its matching color cell).

## Movement Rules
- Pieces move **forward only** (toward opponent's back rank), straight or diagonal
- No jumping over pieces
- Cannot move to an occupied cell
- No captures

## The Lock Mechanic (Core of Kamisado)
> When a piece lands on a colored cell, the **opponent must move the piece matching that color**.

This chain reaction is the entire game. Players rarely choose freely — the previous move dictates the next.

## Win Condition
Land any piece on the opponent's back rank.

## MVP Scope: Single-Round Mode
- One round per game
- First to reach opponent's back rank wins
- If a player cannot move (fully blocked): opponent wins

---

## Architecture: Strategy Pattern for Game Rules

```
GameEngine
  └── IRoundStrategy (interface)
        ├── SingleRoundStrategy   ← MVP
        ├── LongGameStrategy      ← Phase 4
        └── MarathonStrategy      ← Phase 4
```

`IRoundStrategy` defines:
- `isGameOver(state): boolean`
- `getWinner(state): Player | null`
- `getScore(state): ScoreResult`
- `onRoundEnd(state): GameState`

The core engine (`GameEngine`) never contains scoring or termination logic directly — it delegates to the active strategy. Swapping modes = swapping the strategy instance.

---

## Mobile UX Guidelines

### Touch Targets
- Minimum **44dp × 44dp** per cell (WCAG / HIG standard)
- Board must fill screen width; cell size calculated dynamically
- Selected piece: highlight ring + scale-up animation

### Drag & Drop
1. `onLongPress` or `onPressIn` → lift piece (scale + shadow)
2. Drag shows valid move highlights in real time
3. Drop on valid cell → animate to position → trigger haptic (Medium)
4. Drop on invalid cell → snap back → haptic (Error)

### Active Dragon Indicator
- Mandatory piece (locked by opponent's last move): pulsing border, high-contrast color badge
- Must be immediately obvious, especially for colorblind users — supplement color with shape/icon
