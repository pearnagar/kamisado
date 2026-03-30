import * as SecureStore from 'expo-secure-store';

/**
 * Returns true if the device supports secure (hardware-backed) storage.
 * Always call this before using save/load in contexts where the device tier is unknown.
 */
export async function isSecureStoreAvailable(): Promise<boolean> {
  return SecureStore.isAvailableAsync();
}

/**
 * Saves a string value to the device's secure storage (Keystore on Android,
 * Keychain on iOS). Keys must be alphanumeric + underscore/hyphen only.
 * Returns true on success, false if the platform does not support secure storage.
 */
export async function saveSecure(key: string, value: string): Promise<boolean> {
  const available = await SecureStore.isAvailableAsync();
  if (!available) return false;
  await SecureStore.setItemAsync(key, value);
  return true;
}

/**
 * Loads a string value from secure storage.
 * Returns null if the key does not exist or secure storage is unavailable.
 */
export async function loadSecure(key: string): Promise<string | null> {
  const available = await SecureStore.isAvailableAsync();
  if (!available) return null;
  return SecureStore.getItemAsync(key);
}

/**
 * Removes a key from secure storage.
 */
export async function deleteSecure(key: string): Promise<void> {
  await SecureStore.deleteItemAsync(key);
}
