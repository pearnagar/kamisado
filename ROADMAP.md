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
- [ ] Win screen animation
- [x] `expo-haptics` on all interactions (select / place / invalid / win)
- [ ] Sound FX via `expo-av` (piece click, slide, win fanfare)
- [x] Active dragon pulsing indicator (colorblind-safe)
- [ ] Dark/light theme via NativeWind

**Exit criteria:** Playtesting feels polished and responsive.

---

## Phase 3: Gameplay Logic ← active
**Goal:** Full turn loop, move execution, and win/deadlock handling wired to the UI.

- [ ] Minimax algorithm with alpha-beta pruning
- [ ] Evaluation heuristic: advancement score + mobility
- [ ] Difficulty levels:
  - Easy: depth 2, random tie-breaking
  - Medium: depth 4
  - Hard: depth 6+, optimized heuristic
- [ ] AI runs off main thread (no UI jank during think time)
- [ ] "Thinking" indicator while AI computes
- [ ] Game mode selection screen (vs Human / vs AI + difficulty)

**Exit criteria:** Hard AI is genuinely challenging.

---

## Phase 4: Scoring Modes & Store Launch
**Goal:** Feature-complete, on Google Play.

- [ ] `LongGameStrategy`: best-of series, running score
- [ ] `MarathonStrategy`: point accumulation across rounds
- [ ] Mode selection integrated into game flow
- [ ] Google Play Store assets: icon, feature graphic, screenshots (phone + tablet)
- [ ] App signing via EAS (`eas build --profile production` → AAB)
- [ ] Play Store listing: description, content rating, privacy policy
- [ ] `eas submit` pipeline configured
- [ ] Internal test track → closed track → production rollout

**Exit criteria:** App live on Google Play Store.
