import { StyleSheet } from 'react-native';
import { darkHex, lightHex, type HexPalette } from './colors';

/** Minimum touch target (Apple HIG / WCAG). */
export const MIN_TOUCH_TARGET = 44;

/** Shared pill control shell padding used by segmented controls and search/filter rows. */
export const CONTROL_SHELL_PADDING = 4;

/** Outer height for segmented controls, search bar, and filter buttons. */
export const CONTROL_HEIGHT = MIN_TOUCH_TARGET + CONTROL_SHELL_PADDING * 2;

/** Nav bar is taller for icon + label stacking with vertical cushion. */
export const NAV_SHELL_PADDING = 6;

/** Inner tab area height inside the nav shell. */
export const NAV_TAB_HEIGHT = 48;

/** Floating bottom nav bar height. */
export const NAV_BAR_HEIGHT = NAV_TAB_HEIGHT + NAV_SHELL_PADDING * 2;

/** Hero title line height — profile avatar aligns to this on page headers. */
export const PAGE_TITLE_LINE_HEIGHT = 36;

/** Nav bar icon size (matches reference screenshot). */
export const NAV_ICON_SIZE = 20;

/** Icon size used inside search bars, filters, and nav tabs. */
export const CONTROL_ICON_SIZE = 18;

/** Space reserved above bottom safe area for the floating nav bar. */
export const BOTTOM_BAR_SPACE = 8 + NAV_BAR_HEIGHT + 52;

/** Vertical rhythm: screen (20) between major blocks; section (16) within blocks; tight (8) inline. */
export const spacing = {
  screen: 20,
  section: 16,
  tight: 8,
} as const;

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
  | 'navLabel'
  | 'pill'
  | 'button'
  | 'sectionTitle'
  | 'titleMd'
  | 'titleLg'
  | 'titleXl'
  | 'potAmount';

export function createTokens(hex: HexPalette, dark: boolean) {
  const ink = dark ? '255,255,255' : '13,13,13';

  const floatingShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: dark ? 6 : 4 },
    shadowOpacity: dark ? 0.38 : 0.1,
    shadowRadius: dark ? 16 : 12,
    elevation: dark ? 10 : 6,
  } as const;

  const segmentedTrackBg = dark ? '#1A1A1A' : '#EBEBEB';
  const segmentedTrackBorder = dark ? '#333333' : '#E4E4E4';
  const navSurfaceBg = dark ? 'rgba(28,28,28,0.94)' : 'rgba(255,255,255,0.88)';
  const navSurfaceBorder = dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.85)';
  const navActiveBg = dark ? 'rgba(255,255,255,0.18)' : 'rgba(13,13,13,0.08)';
  const navFg = dark ? hex.foreground : '#0D0D0D';

  const navShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: dark ? 0.22 : 0.06,
    shadowRadius: 10,
    elevation: 4,
  } as const;

  const segmentedShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: dark ? 0.18 : 0.03,
    shadowRadius: dark ? 5 : 3,
    elevation: dark ? 2 : 1,
  } as const;

  const activeSegmentShadow = {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: dark ? 0.12 : 0.03,
    shadowRadius: 2,
    elevation: 1,
  } as const;

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
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: -0.2,
      lineHeight: 18,
      textAlign: 'center',
    },
    navLabel: {
      fontSize: 10,
      fontWeight: '500',
      letterSpacing: 0,
      lineHeight: 12,
      textAlign: 'center',
    },
    pill: {
      fontSize: 11,
      fontWeight: '600',
      letterSpacing: 0.3,
    },
    button: {
      fontSize: 15,
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
      gap: spacing.screen,
    },
    screenStack: {
      gap: spacing.screen,
    },
    section: { gap: spacing.section },
    stackSm: { gap: spacing.section },
    tight: { gap: spacing.tight },
    intro: { paddingHorizontal: 4, paddingTop: 4 },
    row: { flexDirection: 'row', alignItems: 'center' },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    pageTitleRow: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
    },
    pageTitle: {
      flex: 1,
      minWidth: 0,
      fontSize: 34,
      fontWeight: '600',
      lineHeight: PAGE_TITLE_LINE_HEIGHT,
      height: PAGE_TITLE_LINE_HEIGHT,
      letterSpacing: -0.6,
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
    sectionBlock: { gap: spacing.section },
    sectionHeader: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    searchBar: {
      flex: 1,
      height: CONTROL_HEIGHT,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.tight,
      borderRadius: 9999,
      backgroundColor: hex.surfaceElevated,
      paddingHorizontal: 16,
    },
    clearButton: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: -8,
    },
    iconButton: {
      width: CONTROL_HEIGHT,
      height: CONTROL_HEIGHT,
      flexShrink: 0,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      backgroundColor: hex.surfaceElevated,
    },
    iconButtonSm: {
      width: MIN_TOUCH_TARGET,
      height: MIN_TOUCH_TARGET,
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
      height: CONTROL_HEIGHT,
      backgroundColor: segmentedTrackBg,
      borderRadius: 9999,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: segmentedTrackBorder,
      padding: CONTROL_SHELL_PADDING,
      ...segmentedShadow,
    },
    segmentedTab: {
      flex: 1,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      paddingHorizontal: 10,
    },
    segmentedTabActive: {
      flex: 1,
      height: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      paddingHorizontal: 10,
      backgroundColor: hex.surfaceElevated,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: segmentedTrackBorder,
      ...activeSegmentShadow,
    },
    navBarFloat: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      height: NAV_BAR_HEIGHT,
      borderRadius: 9999,
      padding: NAV_SHELL_PADDING,
      backgroundColor: navSurfaceBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: navSurfaceBorder,
      ...navShadow,
    },
    navTeamCircle: {
      width: NAV_BAR_HEIGHT,
      height: NAV_BAR_HEIGHT,
      borderRadius: NAV_BAR_HEIGHT / 2,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: navSurfaceBg,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: navSurfaceBorder,
      ...navShadow,
    },
    navTab: {
      flex: 1,
      height: NAV_TAB_HEIGHT,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      paddingHorizontal: 4,
      gap: 4,
    },
    navTabActive: {
      backgroundColor: navActiveBg,
    },
    filterChip: {
      minHeight: MIN_TOUCH_TARGET,
      minWidth: MIN_TOUCH_TARGET,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      paddingHorizontal: 16,
      backgroundColor: hex.background,
    },
    filterChipActive: {
      backgroundColor: hex.foreground,
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
      minHeight: MIN_TOUCH_TARGET,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      borderRadius: 9999,
      paddingVertical: 14,
      paddingHorizontal: 16,
    },
    aiButtonPrimary: {
      backgroundColor: hex.primary,
    },
    aiButtonSecondary: {
      backgroundColor: hex.muted,
    },
    primaryButton: {
      minHeight: 56,
      height: 56,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      backgroundColor: hex.primary,
      paddingHorizontal: 20,
    },
    secondaryButton: {
      minHeight: 56,
      height: 56,
      width: '100%',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 9999,
      backgroundColor: hex.surfaceElevated,
      paddingHorizontal: 20,
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

  return { type, layout, surfaces, toneBg, toneFg, navFg };
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
