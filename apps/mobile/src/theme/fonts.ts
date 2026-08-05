// ============================================================
// Font loading.
//
// The dashboard's Arabic UI face is IBM Plex Sans Arabic (see the web's
// app/layout.tsx). Before this existed the app declared a family name it
// never loaded, so every screen silently fell back to the Android system
// font — the single largest reason the app did not look like the site.
//
// React Native cannot synthesise weight for a custom family: each weight
// is its own file, and `text()` in tokens.ts picks the right one.
// ============================================================
import {
  useFonts,
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_500Medium,
  IBMPlexSansArabic_600SemiBold,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic'

/** True once every weight is resident. The splash stays up until then —
 *  swapping the family mid-session would reflow every screen. */
export function useAppFonts(): boolean {
  const [loaded, error] = useFonts({
    IBMPlexSansArabic_400Regular,
    IBMPlexSansArabic_500Medium,
    IBMPlexSansArabic_600SemiBold,
    IBMPlexSansArabic_700Bold,
  })
  // A font that fails to decode must not strand the app on the splash;
  // the system face is a poor match but an infinite splash is worse.
  return loaded || !!error
}
