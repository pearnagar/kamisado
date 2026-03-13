# QA — Phase 5: Undo & UI Polish

Verified: 2026-03-13
Test file: `src/engine/__tests__/boardHistory.test.ts`
Runner: Jest + ts-jest (node environment)
Result: **26/26 tests passing**

---

## Test Suite Structure

### 1. History Stack Integrity (6 tests)

Verifies that `commitMove` (mirroring `handleAnimationComplete` in `Board.tsx`) maintains the stack correctly.

| Test | What it checks |
|---|---|
| Initial history is empty | Fresh game starts with `[]` |
| One commit → one entry | `history.length === 1` after first move |
| Entry stores pre-move state | `history[0].gameState` is the state object **before** the move was applied |
| Entry records correct move coordinates | `history[0].move` matches `{ from, to }` passed to `commitMove` |
| Second entry records first move's `lastMove` | `history[1].lastMove` equals the coordinates of move 1 |
| Immutability — later commits don't mutate earlier entries | `history[0].gameState` reference is unchanged after a second commit |

**Edge case covered:** Ensures history entries are built with spread (`[...history, entry]`), not mutation, so undo can safely slice without side effects.

---

### 2. PvP Undo — Reverts Exactly 1 Move (3 tests)

| Test | What it checks |
|---|---|
| Restores pre-move state and empties history | After 1 commit + 1 undo, `state === stateBefore` and `history.length === 0` |
| After 2 moves, leaves 1 entry | `undoPvP` after 2 commits yields `history.length === 1`, turn is Black |
| Repeated undo walks all the way back | 4 commits undone one-by-one; final state has empty `moveHistory` |

---

### 3. PvE Undo — Reverts Exactly 2 Moves (2 tests)

| Test | What it checks |
|---|---|
| Pops 2 entries, restores state before human move | After human + bot commit, `undoPvE` returns `history.length === 0`, `turn === White` |
| 4 moves (2 full PvE turns) → two sequential PvE undos reach opening position | `moveHistory.length === 0`, `turn === White` |

**Critical invariant:** After PvE undo the turn must be White (human) — not Black — so the bot does not immediately fire again.

---

### 4. Edge Cases & Safety (6 tests)

| Test | What it checks |
|---|---|
| `undoPvP([])` returns `null` without throwing | Empty history is handled gracefully |
| `undoPvE([])` returns `null` without throwing | Empty history is handled gracefully |
| `undoPvE` with 1 entry returns `null` | PvE requires ≥ 2 entries |
| `history` is empty after reset (simulated) | Setting `history = []` and `state = newGame()` restores `status === Active` |
| Undoing a game-ending move restores `GameStatus.Active` | History entry's `gameState.status` is `Active` (pre-winning-move snapshot) |
| `undoPvE` with exactly 2 entries does not corrupt the original array | `slice` is used, not `splice` — original array reference is unmodified |

---

### 5. "Bot is Thinking" Indicator — Confirmed Removed (1 test)

| Test | What it checks |
|---|---|
| `isAiThinking` blocks `canUndo`, has no visible UI | `canUndo(..., true, 'PvP')` returns `false`; no rendering assertion needed for pure logic |

Documents the structural contract: `isAiThinking` is an input-blocking flag only. No `thinkingBanner` style or conditional text render exists in `Board.tsx`.

---

### 6. `canUndo` Guard (8 tests)

Mirrors the inline `canUndo` expression from `Board.tsx`'s render section.

| Test | Expected |
|---|---|
| Empty history, PvP | `false` |
| Empty history, PvE | `false` |
| 1 move committed, PvP | `true` |
| 1 move committed, PvE | `false` (needs 2) |
| 2 moves committed, PvE | `true` |
| `pendingMove` is set (animation in progress) | `false` |
| `isAiThinking` is true | `false` |
| Both `pendingMove` and `isAiThinking` false, sufficient history | `true` |

---

## What Is NOT Tested Here

These aspects require `@testing-library/react-native` with native-module mocks and are deferred:

- Overlay Dragon slide animation frames (Reanimated `withTiming`)
- Haptic calls (`expo-haptics`) on undo tap
- Visual disabled state of the Undo button
- `pendingUndoChainRef` chaining across two React renders (requires component test)
- `android_ripple={null}` behavior (platform-specific, device test only)
