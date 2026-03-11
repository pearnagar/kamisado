# Kamisado Mobile — Claude Context

## Project
React Native (Expo) board game for Google Play. TypeScript, NativeWind, Reanimated.

## Commands
```bash
npx expo start              # Dev server
npx expo run:android        # Local Android build
eas build --platform android --profile production  # AAB for Play Store
eas submit --platform android                       # Submit to Play Store
```

## Standards

### Components
- Functional components only, no class components
- Props typed via `interface`, not `type` aliases
- Co-locate styles with component (NativeWind `className` or `StyleSheet`)
- No inline logic — extract hooks for state/effects

### TypeScript
- `strict: true` in tsconfig — no `any`, no `@ts-ignore`
- Explicit return types on all functions
- Enums for game constants (colors, phases, directions)

### Animations (Reanimated)
- All animations must target 60fps on mid-range Android
- Use `useSharedValue` + `withTiming`/`withSpring` — never `Animated` API
- Worklets (`runOnUI`) for gesture callbacks
- Drag-and-drop via `react-native-gesture-handler` + Reanimated

### Haptics
- `expo-haptics` for all user interactions
- Light impact: piece tap/select
- Medium impact: piece placement
- Error notification: invalid move

## Deployment
- Build format: **AAB** (Android App Bundle) via EAS
- `eas.json` profiles: `development`, `preview` (APK), `production` (AAB)
- Target API: 34+ (Google Play requirement)
- Min SDK: 26 (Android 8.0)
