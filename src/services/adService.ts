import mobileAds, {
  AdEventType,
  InterstitialAd,
  TestIds,
} from 'react-native-google-mobile-ads';

// In production, set ADMOB_ANDROID_INTERSTITIAL_ID in your EAS environment variables.
// eas.json → build.production.env.ADMOB_ANDROID_INTERSTITIAL_ID
const INTERSTITIAL_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : (process.env.ADMOB_ANDROID_INTERSTITIAL_ID ?? TestIds.INTERSTITIAL);

let interstitial: InterstitialAd = createAd();
let isLoaded = false;
let unsubscribeLoaded:  (() => void) | null = null;
let unsubscribeClosed:  (() => void) | null = null;
let unsubscribeError:   (() => void) | null = null;

function createAd(): InterstitialAd {
  return InterstitialAd.createForAdRequest(INTERSTITIAL_UNIT_ID, {
    requestNonPersonalizedAdsOnly: true,
  });
}

function attachListeners(): void {
  unsubscribeLoaded?.();
  unsubscribeClosed?.();
  unsubscribeError?.();

  unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
    isLoaded = true;
  });

  // Re-load a fresh ad immediately after the player closes one.
  unsubscribeClosed = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
    isLoaded     = false;
    interstitial = createAd();
    attachListeners();
    interstitial.load();
  });

  unsubscribeError = interstitial.addAdEventListener(AdEventType.ERROR, () => {
    isLoaded = false;
  });
}

/**
 * Call once at app startup (e.g. inside the root App component).
 * Initialises the Mobile Ads SDK and pre-loads the first interstitial.
 */
export async function initAds(): Promise<void> {
  await mobileAds().initialize();
  attachListeners();
  interstitial.load();
}

/**
 * Show the pre-loaded interstitial ad.
 * No-ops silently if the ad has not finished loading yet — never throws.
 * After dismissal the service automatically pre-loads the next ad.
 */
export async function showGameOverAd(): Promise<void> {
  if (!isLoaded) return;
  await interstitial.show();
}
