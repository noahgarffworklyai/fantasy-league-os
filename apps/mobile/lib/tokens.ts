import { StyleSheet } from 'react-native';
import { darkHex, lightHex, type HexPalette } from './colors';

export type TextVariant =
  | 'eyebrow'
  | 'hero'
  | 'subtitle'
  | 'body'
  | 'bodySm'
  | 'bodyMuted'
  | 'caption'
  | 'captionSuccess'
  | 'scoreXL'
  | 'scoreLG'
  | 'statValue'
  | 'link'
  | 'tab'
  | 'pill'
  | 'button'
  | 'sectionTitle'
  | 'titleMd'
  | 'titleLg'
  | 'titleXl'
  | 'potAmount';

export function createTokens(hex: HexPalette, dark: boolean) {
  const ink = dark ? '255,255,255' : '13,13,13';

  const type = StyleSheet.create({
    eyebrow: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 2,
      textTransform: 'uppercase',
      color: hex.mutedForeground,
    },
    hero: {
      fontSize: 34,
      fontWeight: '600',
      lineHeight: 36,
      letterSpacing: -0.6,
      color: hex.foreground,
    },
    subtitle: {
      fontSize: 13,
      color: hex.mutedForeground,
    },
    body: {
      fontSize: 15,
      fontWeight: '500',
      letterSpacing: -0.2,
      color: hex.foreground,
    },
    bodySm: {
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: -0.2,
      color: hex.foreground,
    },
    bodyMuted: {
      fontSize: 12,
      color: hex.mutedForeground,
    },
    caption: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.5,
      color: hex.mutedForeground,
    },
    captionSuccess: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.5,
      color: hex.success,
    },
    scoreXL: {
      fontSize: 44,
      fontWeight: '600',
      lineHeight: 44,
      letterSpacing: -0.6,
      color: hex.foreground,
    },
    scoreLG: {
      fontSize: 28,
      fontWeight: '600',
      letterSpacing: -0.6,
      color: hex.foreground,
    },
    statValue: {
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: -0.6,
      color: hex.foreground,
    },
    link: {
      fontSize: 13,
      fontWeight: '500',
      letterSpacing: -0.2,
      color: hex.foreground,
    },
    tab: {
      fontSize: 13,
      fontWeight: '600',
      letterSpacing: -0.2,
      textAlign: 'center',
    },
    pill: {
      fontSize: 10,
      fontWeight: '500',
      letterSpacing: 0.5,
    },
    button: {
      fontSize: 13,
      fontWeight: '600',
    },
    sectionTitle: {
      fontSize: 20,
      fontWeight: '600',
      letterSpacing: -0.6,
      color: hex.foreground,
    },
    titleMd: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: -0.2,
      color: hex.foreground,
    },
    titleLg: {
      fontSize: 18,
      fontWeight: '600',
      letterSpacing: -0.2,
      color: hex.foreground,
    },
    titleXl: {
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 32,
      letterSpacing: -0.6,
      color: hex.foreground,
    },
    potAmount: {
      fontSize: 40,
      fontWeight: '600',
      letterSpacing: -0.6,
      color: hex.foreground,
    },
  });

  const layout = StyleSheet.create({
    screen: {
      width: '100%',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 40,
      gap: 20,
    },
    section: { gap: 16 },
    stackSm: { gap: 10 },
    intro: { paddingHorizontal: 4, paddingTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    rowStart: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
    rowEnd: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      gap: 16,
    },
    rowWrap: { flexDirection: 'row', flexWrap: 'wrap' },
    flex1: { flex: 1 },
    alignEnd: { alignItems: 'flex-end' },
    cardPad: { padding: 24 },
    cardFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 24,
      paddingVertical: 14,
    },
    listRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    half: { width: '50%', paddingBottom: 20 },
    healthRow: { flexDirection: 'row', paddingHorizontal: 8, paddingVertical: 20 },
    healthCell: { flex: 1, alignItems: 'center' },
    healthCellBorder: {
      flex: 1,
      alignItems: 'center',
      borderLeftWidth: StyleSheet.hairlineWidth,
      borderLeftColor: hex.hairline,
    },
    sectionBlock: { gap: 12 },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 16,
      backgroundColor: hex.surfaceElevated,
      paddingHorizontal: 16,
      paddingVertical: 12,
    },
    iconButton: {
      width: 44,
      height: 44,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 16,
      backgroundColor: hex.surfaceElevated,
    },
    iconButtonSm: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hex.hairline,
      backgroundColor: hex.background,
    },
    listRowBorder: {
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: hex.hairline,
    },
    centered: { alignItems: 'center', justifyContent: 'center' },
    fill: { flex: 1 },
  });

  const surfaces = StyleSheet.create({
    card: {
      backgroundColor: hex.surfaceElevated,
      borderRadius: 30,
      overflow: 'hidden',
    },
    cardBorder: {
      backgroundColor: hex.surfaceElevated,
      borderRadius: 30,
      overflow: 'hidden',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hex.border,
    },
    pill: { borderRadius: 9999 },
    pillMuted: {
      borderRadius: 9999,
      backgroundColor: `rgba(${ink},0.06)`,
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    pillSuccess: {
      borderRadius: 9999,
      backgroundColor: 'rgba(40,189,95,0.15)',
      paddingHorizontal: 10,
      paddingVertical: 4,
    },
    iconBox: {
      width: 40,
      height: 40,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxSm: {
      width: 36,
      height: 36,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
    },
    iconBoxDark: {
      width: 36,
      height: 36,
      borderRadius: 16,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: hex.primary,
    },
    segmented: {
      flexDirection: 'row',
      width: '100%',
      backgroundColor: hex.surfaceElevated,
      borderRadius: 9999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hex.border,
      padding: 4,
    },
    segmentedTab: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      paddingVertical: 8,
    },
    segmentedTabActive: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      paddingVertical: 8,
      backgroundColor: hex.primary,
    },
    hairline: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: hex.hairline,
    },
    aiCard: {
      backgroundColor: hex.surfaceElevated,
      borderRadius: 30,
      padding: 16,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: `rgba(${ink},0.1)`,
    },
    aiButton: {
      marginTop: 12,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 9999,
      paddingVertical: 10,
    },
    aiButtonPrimary: {
      backgroundColor: hex.primary,
    },
    aiButtonSecondary: {
      backgroundColor: hex.muted,
    },
    primaryButton: {
      height: 56,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      backgroundColor: hex.primary,
    },
    secondaryButton: {
      height: 56,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      backgroundColor: hex.surfaceElevated,
    },
    authButton: {
      height: 56,
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
      borderRadius: 9999,
      paddingHorizontal: 20,
    },
    authButtonDark: {
      backgroundColor: hex.primary,
    },
    authButtonLight: {
      backgroundColor: hex.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hex.border,
    },
    roundedCard: {
      borderRadius: 24,
      overflow: 'hidden',
      backgroundColor: hex.surfaceElevated,
    },
    roundedCardLg: {
      borderRadius: 28,
      overflow: 'hidden',
      backgroundColor: hex.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: hex.hairline,
      padding: 24,
    },
    badge: {
      position: 'absolute',
      top: -4,
      right: -4,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      backgroundColor: hex.success,
      paddingHorizontal: 4,
    },
    progressTrack: {
      marginTop: 6,
      height: 6,
      overflow: 'hidden',
      borderRadius: 9999,
      backgroundColor: hex.border,
    },
    progressFill: {
      height: '100%',
      borderRadius: 9999,
    },
    emptyState: {
      alignItems: 'center',
      borderRadius: 24,
      backgroundColor: hex.surfaceElevated,
      paddingHorizontal: 24,
      paddingVertical: 40,
    },
    sheetGroup: {
      overflow: 'hidden',
      borderRadius: 24,
      backgroundColor: hex.surface,
    },
  });

  const toneBg = {
    success: 'rgba(40,189,95,0.15)',
    warning: dark ? 'rgba(245,200,66,0.2)' : 'rgba(242,177,13,0.25)',
    danger: 'rgba(238,55,52,0.15)',
    neutral: hex.muted,
  } as const;

  const toneFg = {
    success: hex.success,
    warning: hex.foreground,
    danger: hex.danger,
    neutral: hex.mutedForeground,
  } as const;

  return { type, layout, surfaces, toneBg, toneFg };
}

export type TokenSet = ReturnType<typeof createTokens>;

export const lightTokens = createTokens(lightHex, false);
export const darkTokens = createTokens(darkHex, true);

/** @deprecated Use useThemeStyles() from @/lib/theme */
export const type = lightTokens.type;
/** @deprecated Use useThemeStyles() from @/lib/theme */
export const layout = lightTokens.layout;
/** @deprecated Use useThemeStyles() from @/lib/theme */
export const surfaces = lightTokens.surfaces;
/** @deprecated Use useThemeStyles() from @/lib/theme */
export const toneBg = lightTokens.toneBg;
/** @deprecated Use useThemeStyles() from @/lib/theme */
export const toneFg = lightTokens.toneFg;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24 } as const;
