# Kamisado Core — Game Logic Reference

## The Board

8×8 grid. Each cell has a fixed color. The layout is rotationally symmetric — Black's view mirrors White's.

### Color Grid (Row 0 = Black's back rank)

```
O  B  P  M  Y  R  G  Br   (row 0 — Black's home rank)
R  O  M  G  B  Y  Br  P
G  M  O  R  P  Br  Y  B
M  P  B  O  Br  G  R  Y
Y  R  G  Br  O  B  P  M
B  Y  Br  P  R  O  M  G
P  Br  Y  B  G  M  O  R
Br  G  R  Y  M  P  B  O   (row 7 — White's home rank)
```

Key: O=Orange, B=Blue, R=Red, G=Green, Y=Yellow, P=Purple, M=Pink, Br=Brown

## Pieces

Each player has 8 dragon pieces, one per color.
Initial positions: Black on row 0, White on row 7 — each piece placed on its matching color cell.

## Movement Rules

- Pieces move **forward only** (toward the opponent's back rank), straight or diagonal
- No jumping over pieces
- Cannot move to an occupied cell
- No captures

## The Lock Mechanic (Core of Kamisado)

> When a piece lands on a colored cell, the **opponent must move the piece matching that cell's color**.

This chain reaction is the entire game. Players rarely choose freely — the previous move dictates the next.

## Win Condition

Land any piece on the opponent's back rank (row 7 for Black, row 0 for White).

---

## Rules Reference

### Rule M6 — Forfeit (Deadlock)

If the forced piece has no legal moves:

1. The stuck player's turn is **forfeited** — the opponent moves again.
2. The new forced color is the board color of the cell **under the trapped piece**.
3. If both players are simultaneously blocked → **Draw**.

Implemented in `src/engine/moveLogic.ts → handleDeadlock`.

### Rule M8 — Loop Loss (Repetition)

If a player causes the same `(board, turn)` position to recur (within the last 10 moves), that player **immediately loses**.

Implemented via `moveHistory` hash array in `GameState` and `computeStateHash` in `moveLogic.ts`.

---

## Architecture

### Engine Layer (`src/engine/`)

All engine functions are **pure** — they take a `GameState` and return a new `GameState`. No mutations, no side effects.

```
gameConstants.ts   — enums (Player, GameStatus, GameMode, KamisadoColor), board layout, piece definitions
gameState.ts       — GameState interface + createInitialGameState / resetGame
moveValidator.ts   — getLegalMoves, getAvailablePieces, isDeadlocked
moveLogic.ts       — makeMove (immutable), handleDeadlock (M6), M8 loop detection
aiEngine.ts        — minimax + alpha-beta pruning, findBestMove, evaluateBoard
scoringLogic.ts    — IRoundStrategy, SingleGameStrategy, MatchStrategy, MarathonStrategy, getStrategy
```

### Strategy Pattern — `IRoundStrategy`

`makeMove` calls `getStrategy(gameState.gameMode).handleRoundEnd(state, winner)` whenever a player reaches the opponent's back rank. The strategy decides whether to end the match or start a new round.

| Strategy | Trigger | Board after |
|---|---|---|
| `SingleGameStrategy` | Always | Terminal — no reset |
| `MatchStrategy` | After target wins (default: 3) | Fresh board, loser moves first |
| `MarathonStrategy` | After target pts (default: 10) | Fresh board, escalating point value |

`MarathonStrategy` is fully implemented in the engine but **not exposed in the UI** (deferred to Phase 5).

### GameState Fields

```ts
interface GameState {
  board:          BoardState;           // 8×8, null = empty
  turn:           Player;               // whose move it is
  activeColor:    KamisadoColor | null; // forced piece color (null = free choice)
  selectedPiece:  { row, col } | null;  // UI selection
  status:         GameStatus;           // Active | Won* | Draw | *_Timeout
  isDeadlocked:   boolean;              // true for one state after M6 forfeit
  deadlockedPiece: { row, col } | null; // position of the blocked piece
  moveHistory:    string[];             // hashes for M8 loop detection
  gameMode:       GameMode;             // Single | Match | Marathon
  matchScore:     { p1, p2 };          // running round wins (p1 = White)
  roundNumber:    number;               // 1-based, increments each round
}
```

---

## Phase 4 — Chess Clocks

### Design Goal

The chess clock must **not** cause board re-renders on every tick. The entire board (64 cells × Dragon components) would drop frames at 60 fps.

### Solution: Isolated `ChessClock` Component

`src/components/ChessClock.tsx` is self-contained:

- **Local state only** — `useState(initialSeconds)` lives entirely inside the component.
- **Two effects**:
  1. `isActive` effect — starts/stops a `setInterval` that decrements the counter. Uses functional `setSeconds(prev => prev - 1)` so `seconds` is never a dependency and the interval never restarts on each tick.
  2. `seconds === 0` effect — fires `onTimeOut()` exactly once via a stable `onTimeOutRef`.
- **Reset via React `key`** — the parent passes `key={\`w-${clockEpoch}-${roundNumber}\`}`. Changing the key unmounts and remounts the component with fresh state. No internal "reset" logic required.

### Clock Reset Triggers

| Event | What changes the key |
|---|---|
| User taps "New Game" | `clockEpoch` increments |
| Match round ends (score reset) | `roundNumber` increments |
| Scoring mode switches | `clockEpoch` increments (via `handleSetScoringMode`) |

### AI Clock

No special handling is needed. `AI_PLAYER = Player.Black`, so Black's clock is `isActive` whenever `gameState.turn === Player.Black`. This naturally covers the 600 ms delay before AI fires **and** the minimax computation time.

### Timeout Win Conditions

```
GameStatus.WonPlayer1_Timeout  — White wins; Black's clock reached 0
GameStatus.WonPlayer2_Timeout  — Black wins; White's clock reached 0
```

Both are set via functional `setGameState` with an `Active` guard to prevent double-firing if both clocks somehow expire on the same tick.

Timeout always ends the **match** immediately, regardless of `GameMode`. No score line is shown in `WinOverlay` for a timeout result.

---

## Phase 4 — Match Mode Scoring

### Rules

- **1 round win = 1 point**
- First to **3 points** wins the match
- After each non-terminal round win: board resets, loser of that round **moves first** in the next round (standard Kamisado tournament rule)
- Timeout → immediate match loss, regardless of current score

### UI

| Component | Role |
|---|---|
| `ModeSelector` | `1 Game \| Match (3)` segmented control below difficulty picker |
| `ScoreHeader` | `Round N · White X — Y Black` bar above the clock row (hidden in Single mode) |
| `WinOverlay` | "White wins the Match! · 3 — 1" for score wins; "by Timeout" for timeouts |

### State Flow

```
User taps Match (3)
  └── handleSetScoringMode(GameMode.Match)
        ├── setScoringMode(Match)
        └── setGameState(newGame(Match))   // gameMode: Match baked into GameState

Player reaches back rank
  └── makeMove → getStrategy(Match).handleRoundEnd(state, winner)
        ├── score < 3  → startNextRound()   // fresh board, roundNumber++, loser's turn
        └── score === 3 → { status: WonPlayer1 | WonPlayer2 }  // terminal
```

---

## Mobile UX Guidelines

### Touch Targets

- Minimum **44 × 44 dp** per cell (`CELL_SIZE = 44`)
- Board fills screen width; cell size is fixed, not dynamic

### Animations

- All animations via `react-native-reanimated` (`useSharedValue`, `withTiming`, `withSpring`)
- Dragon slide: overlay Dragon lifts to `zIndex: 1000` / `elevation: 20`; board state deferred via `PendingMove` until `onAnimationComplete` fires
- Never use `Animated` API; never `setState` inside worklets — use `runOnJS`

### Haptics

| Event | Haptic |
|---|---|
| Piece tap/select | `selectionAsync()` |
| Piece placement | `impactAsync(Medium)` |
| Invalid move | `notificationAsync(Error)` |
| Deadlock (M6) | `notificationAsync(Warning)` |
| Win / timeout | `notificationAsync(Success)` |

### Dragon Piece Rendering

- Stone color: White `#FFFFFF` / Black `#1A1A1A`
- Kanji color: always the dragon's own `COLOR_HEX[color]` — independent of player
- Selected state: Reanimated scale pulse `1.0 → 1.05` via `withRepeat(withSequence(...))`
