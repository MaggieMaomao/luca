// Capacitor plugin initialization for the luca mobile app.
//
// Wires up the native plugins (StatusBar, SplashScreen, Haptics, Network)
// to the basketball game and gallery. This module is loaded once
// at app start, before React renders.

import { Capacitor } from '@capacitor/core'
import { StatusBar, Style } from '@capacitor/status-bar'
import { SplashScreen } from '@capacitor/splash-screen'
import { Haptics, ImpactStyle } from '@capacitor/haptics'
import { Network } from '@capacitor/network'

/** Whether we're running in a native shell (vs. browser dev). */
export const isNative = Capacitor.isNativePlatform()

/** Initialize all Capacitor plugins. Call once at app start. */
export async function initCapacitor(): Promise<void> {
  if (!isNative) {
    // Browser: skip native plugin init. The web app works without them.
    return
  }

  // ── Status bar ─────────────────────────────────────────────────────
  // Match the basketball dark theme. Dark icons on dark background
  // = light text style. Show as overlay so the WebView can extend
  // under it.
  try {
    await StatusBar.setStyle({ style: Style.Dark })
    await StatusBar.setBackgroundColor({ color: '#1a1f2e' })
    await StatusBar.setOverlaysWebView({ overlay: false })
  } catch (err) {
    console.warn('StatusBar init failed:', err)
  }

  // ── Splash screen ─────────────────────────────────────────────────
  // The SplashScreen plugin auto-hides after launchShowDuration (1.5s).
  // We can call hide() earlier if the app is ready.
  try {
    // Wait for the app to be ready, then hide the splash.
    // Capacitor shows it by default; the config sets launchShowDuration.
    // We just need to make sure the splash is shown if we're starting cold.
    await SplashScreen.show({
      showDuration: 1500,
      autoHide: true,
    })
  } catch (err) {
    console.warn('SplashScreen init failed:', err)
  }

  // ── Network ───────────────────────────────────────────────────────
  // Listen for offline/online state changes. The basketball game
  // doesn't need network (it's a single-player game with no backend
  // in the MVP), so we just log the status.
  try {
    Network.addListener('networkStatusChange', (status) => {
      console.log('Network status changed:', status)
    })
  } catch (err) {
    console.warn('Network init failed:', err)
  }
}

/** Trigger haptic feedback on a shot release. Used by basketball
 *  when a shot is fired. */
export async function shotHaptic(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Medium })
  } catch {
    // Haptics is best-effort.
  }
}

/** Trigger light haptic on make/miss. */
export async function scoreHaptic(): Promise<void> {
  if (!isNative) return
  try {
    await Haptics.impact({ style: ImpactStyle.Light })
  } catch {
    // Haptics is best-effort.
  }
}