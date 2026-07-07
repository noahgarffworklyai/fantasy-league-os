import Constants from 'expo-constants';
import { NativeModules, Platform, UIManager } from 'react-native';

function hasNativeWebViewManager(): boolean {
  try {
    if (NativeModules.RNCWebView != null) return true;
    if (typeof UIManager.hasViewManagerConfig === 'function') {
      return UIManager.hasViewManagerConfig('RNCWebView');
    }
    if (typeof UIManager.getViewManagerConfig === 'function') {
      return UIManager.getViewManagerConfig('RNCWebView') != null;
    }
  } catch {
    return false;
  }
  return false;
}

/** True when Expo Go has the native WebView view manager (does not load JS native component). */
export function isEspnWebViewSupported(): boolean {
  if (Platform.OS === 'web') return false;
  return hasNativeWebViewManager();
}

export function espnWebViewSupportMessage(): string | null {
  if (isEspnWebViewSupported()) return null;
  const sdk = Constants.expoConfig?.sdkVersion ?? 'unknown';
  return `ESPN sign-in needs WebView (SDK ${sdk}). Quit Expo Go completely, reopen it from the App Store, then run "pnpm start --clear" and reload.`;
}
