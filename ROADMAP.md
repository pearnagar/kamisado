# Kamisado Mobile — Roadmap

## Phase 1: Scaffold & Core Engine
**Goal:** Playable local 2-player game, no polish.

- [ ] Expo + TypeScript project init (`expo-router`, strict tsconfig)
- [ ] NativeWind + Reanimated + Gesture Handler setup
- [ ] EAS configuration (`eas.json` with dev/preview/production profiles)
- [ ] Board renderer: dynamic cell sizing, correct color grid
- [ ] Game state model: `GameState`, `Piece`, `Cell`, `Player` types
- [ ] `SingleRoundStrategy` implementing `IRoundStrategy`
- [ ] Move validation engine (forward-only, no jumps, no captures)
- [ ] Lock mechanic: post-move color → opponent's forced piece
- [ ] Win detection: back-rank landing + stalemate
- [ ] Local 2-player turn loop (pass device)

**Exit criteria:** Two people can play a complete game.

---

## Phase 2: Feel & Polish ✅
**Goal:** The game feels great to play on a phone.

- [x] Drag-and-drop with Reanimated (lift, ghost, snap-back)
- [x] Valid move highlights animate in on piece select
- [x] Piece placement transition (slide to cell, not teleport)
- [x] Win screen animation
- [x] `expo-haptics` on all interactions (select / place / invalid / win)
- [ ] Sound FX via `expo-av` (piece click, slide, win fanfare)
- [x] Active dragon pulsing indicator (colorblind-safe)
- [ ] Dark/light theme via NativeWind

**Exit criteria:** Playtesting feels polished and responsive.

---

## Phase 3: Gameplay Logic ✅
**Goal:** Full turn loop, move execution, and win/deadlock handling wired to the UI.

- [x] Minimax with alpha-beta pruning (`src/engine/aiEngine.ts`)
- [x] Evaluation heuristic: advancement score + mobility (`evaluateBoard`)
- [x] Difficulty levels:
  - [x] Easy: depth 2, random tie-breaking among equal-scored moves
  - [x] Medium: depth 4
  - [x] Hard: depth 6
- [x] AI sequenced via `setTimeout` + `requestAnimationFrame` — no UI jank
- [x] "Bot is thinking…" spinner while AI computes
- [x] Game mode toggle: vs Human / vs Bot + Easy / Medium / Hard segmented control
- [x] AI diagonal move blindness fixed: candidate pool + shuffle tie-breaking
- [x] Rule M6 (forfeit): `handleDeadlock` + orange `StatusBanner` notification
- [x] Rule M8 (loop): position-hash history → immediate loss for looping player
- [x] Dragon animation overhaul: deferred `makeMove`, absolute overlay, z-index 1000
- [x] **30/30 Jest unit tests** — run with `npm test`

**Exit criteria:** Hard AI is genuinely challenging. ✓ Verified 2026-03-12.

---

## Phase 4: Scoring Modes & Timers ✅
**Goal:** Match mode with chess clocks, fully integrated and tested.

- [x] `IRoundStrategy` + `MatchStrategy` (best-of-3, 1 pt/round) — `src/engine/scoringLogic.ts`
- [x] `ModeSelector` UI: `1 Game | Match (3)` segmented control
- [x] `ScoreHeader`: live `Round N · White X — Y Black` bar (Match mode only)
- [x] `ChessClock`: self-contained per-player countdown, `key`-remount reset pattern
- [x] Timeout win conditions: `WonPlayer1_Timeout` / `WonPlayer2_Timeout`
- [x] `WinOverlay` shows "by Timeout" and match score line
- [x] AI clock ticks during minimax — no special-casing needed
- [x] `app.json` created: `com.peer.kamisado`, `version: 1.0.0`
- [x] **38/38 Jest unit tests** — run with `npm test`

**Exit criteria:** Match mode is playable with chess clocks. ✓ Verified 2026-03-12.

---

## Phase 5: Undo & UI Polish ✅
**Goal:** Premium undo system, clean press feedback, verified with a Jest suite.

- [x] Suppress Android ripple / pressed-state square highlight on Cell and Dragon (`android_ripple={null}` + function-style `style` prop)
- [x] Remove "Bot is thinking…" overlay — `isAiThinking` kept as input-blocking flag only
- [x] History stack in `Board.tsx`: `HistoryEntry[]` storing pre-move `{gameState, lastMove, move}` snapshots
- [x] `handleUndo` — PvP: pop 1 entry; PvE: pop 2 entries (bot reply + human move)
- [x] Animated undo via existing overlay-Dragon slide system (`PendingMove.isUndo` + `pendingUndoChainRef`)
- [x] Key-based overlay Dragon remount (`overlay-dragon-{row}-{col}`) to fix PvE teleport bug
- [x] Undo button disabled states (`canUndo` guard: no pending animation, no AI thinking, sufficient history)
- [x] **26/26 Jest unit tests** (`src/engine/__tests__/boardHistory.test.ts`) — run with `npm test`

**Exit criteria:** Undo works in PvP and PvE with slide animation. 26 tests green. ✓ Verified 2026-03-13.

---

## Phase 6: Mega-Board (10×10) ✅
**Goal:** Playable 10×10 variant on the same codebase.

- [x] `Silver` (#C0C0C0 / 銀) and `Gold` (#D4AF37 / 金) added to `KamisadoColor` enum
- [x] `MEGA_BOARD_COLORS` — valid 10×10 Latin square with 180° rotational symmetry (`gameConstants.ts`)
- [x] `BoardVariant` enum (`Standard` | `Mega`) + `BoardConfig` interface (`size`, `colors`, `maxMoveDist`)
- [x] `BOARD_CONFIGS` record — centralised config for both variants
- [x] `boardConfig: BoardConfig` field added to `GameState` — threads variant through entire engine
- [x] `createInitialGameState(variant?)` — places 10 pieces per player on rows 0 and 9 for Mega
- [x] `getLegalMoves` enforces `maxMoveDist = 7` in Mega mode (Megasado-specific rule)
- [x] `getAvailablePieces` / move loops use `boardConfig.size` — no hardcoded 8
- [x] Win condition checks `row (size-1)` dynamically — correct for both 8×8 and 10×10
- [x] `aiEngine.ts` passes `boardConfig` to all `getLegalMoves` calls; `evaluateBoard` uses `boardConfig.size`
- [x] `scoringLogic.ts` — `startNextRound` passes `state.boardConfig.variant` so a Mega match stays Mega
- [x] `Board.tsx` — `boardVariant` prop; `CELL_SIZE = floor((screenWidth - 32) / boardSize)` via `useWindowDimensions`; AI depth capped at 4 for Mega (`MEGA_MAX_DEPTH`)
- [x] `App.tsx` — `ToggleButton` component; "Standard (8×8)" / "Mega (10×10)" selector in `HomeScreen`; `boardVariant` threaded through navigation params
- [x] Greedy win check in `findBestMove` — returns winning move immediately, before minimax (`aiEngine.ts`)
- [x] Undo history cleared on round boundary — `handleAnimationComplete` wipes stack when `roundNumber` advances (`Board.tsx`)
- [x] **67/67 Jest unit tests** — run with `npm test`

**Exit criteria:** A full 10×10 game is playable with AI on device. ✓ Verified 2026-03-15.

---

## Phase 7: Home Screen Redesign
**Goal:** A premium, polished landing experience.

- [ ] Modern UI layout for game mode selection (PvP / PvE)
- [ ] Difficulty selector (Easy / Medium / Hard) and Variant selector (8×8 / 10×10) overhaul
- [ ] High-quality background assets or gradients
- [ ] Animated transitions from Home to Board
- [ ] Consistent typography and button styles using NativeWind

**Exit criteria:** Home screen feels premium and transitions smoothly to the board.
