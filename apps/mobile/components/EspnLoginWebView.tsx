import { Component, type ErrorInfo, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, StyleSheet, View as RNView } from 'react-native';
import { WebView, type WebViewNavigation } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { LeagueSummary } from '@flos/shared';
import { X } from 'lucide-react-native';
import { Pressable, Text, View } from '@/components/ui/primitives';
import { fetchEspnLeagueById, fetchEspnLeagues } from '@/lib/imports-api';
import { buildEspnCaptureScript } from '@/lib/espn-capture-script';
import { espnWebViewSupportMessage, isEspnWebViewSupported } from '@/lib/espn-webview';
import { useThemeTokens } from '@/lib/theme';

export type EspnSession = {
  espnS2: string;
  swid: string;
  leagues?: LeagueSummary[];
};

const ESPN_LOGIN_URL =
  'https://www.espn.com/login?redirect=https%3A%2F%2Ffantasy.espn.com%2Ffootball';

/** Desktop Safari UA — reduces ESPN “open in app” handoff on iOS. */
const WEBVIEW_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

function buildLoginUrl(knownLeagueId?: string) {
  if (!knownLeagueId?.trim()) return ESPN_LOGIN_URL;
  const leagueUrl = encodeURIComponent(
    `https://fantasy.espn.com/football/league?leagueId=${knownLeagueId.trim()}`,
  );
  return `https://www.espn.com/login?redirect=${leagueUrl}`;
}

function isAllowedWebUrl(url: string) {
  if (!url) return false;
  const lower = url.toLowerCase();
  if (lower.startsWith('http://') || lower.startsWith('https://')) return true;
  return false;
}

type Props = {
  onClose: () => void;
  onSuccess: (session: EspnSession) => void;
  /** When set, we open this league after sign-in and validate it across recent seasons. */
  knownLeagueId?: string;
};

function leagueIdFromUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const id = parsed.searchParams.get('leagueId') ?? parsed.searchParams.get('league_id');
    if (id && /^\d{4,}$/.test(id)) return id;
  } catch {
    // ignore
  }
  const match = /leagueId[=:/](\d{4,})/i.exec(url);
  return match?.[1] ?? null;
}

function isFantasyLoggedIn(url: string) {
  return (
    url.includes('fantasy.espn.com') &&
    !url.includes('/login') &&
    !url.includes('signin') &&
    !url.includes('register')
  );
}

class WebViewErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn('ESPN WebView unavailable:', error.message, info.componentStack);
  }

  render() {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}

function EspnLoginUnavailable({ onClose }: { onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onClose}>
      <View style={[styles.root, { backgroundColor: hex.background, paddingTop: insets.top }]}>
        <View style={[layout.rowBetween, styles.header, { borderBottomColor: hex.border }]}>
          <Text variant="titleMd">ESPN login unavailable</Text>
          <Pressable onPress={onClose} style={styles.closeBtn}>
            <X size={22} color={hex.foreground} />
          </Pressable>
        </View>
        <View style={[layout.fill, { padding: 24, gap: 16 }]}>
          <Text variant="body" style={{ lineHeight: 22 }}>
            {espnWebViewSupportMessage() ??
              'Update Expo Go from the App Store, then try again.'}
          </Text>
          <Pressable onPress={onClose} style={surfaces.primaryButton}>
            <Text variant="button" style={{ color: hex.primaryForeground }}>
              Go back
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => reject(new Error(message)), ms);
    }),
  ]);
}

function EspnLoginWebViewInner({ onClose, onSuccess, knownLeagueId }: Props) {
  const insets = useSafeAreaInsets();
  const { hex, layout, surfaces } = useThemeTokens();
  const webRef = useRef<WebView>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signedIn, setSignedIn] = useState(false);
  const captureStarted = useRef(false);
  const captureTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedLeagueRef = useRef(false);

  const captureScript = useMemo(() => buildEspnCaptureScript(knownLeagueId), [knownLeagueId]);
  const loginUrl = useMemo(() => buildLoginUrl(knownLeagueId), [knownLeagueId]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && signedIn && !checking) {
        setError(
          'You left this screen. Stay here to connect — don’t open the ESPN app. Tap Find my league when ready.',
        );
      }
    });
    return () => sub.remove();
  }, [signedIn, checking]);

  const clearCaptureTimer = useCallback(() => {
    if (captureTimer.current) {
      clearTimeout(captureTimer.current);
      captureTimer.current = null;
    }
  }, []);

  const injectCapture = useCallback(() => {
    webRef.current?.injectJavaScript(captureScript);
  }, [captureScript]);

  const finishCaptureAttempt = useCallback(
    (message?: string) => {
      captureStarted.current = false;
      clearCaptureTimer();
      setChecking(false);
      if (message) setError(message);
    },
    [clearCaptureTimer],
  );

  const tryCaptureSession = useCallback(() => {
    if (captureStarted.current) return;
    captureStarted.current = true;
    setChecking(true);
    setError(null);
    clearCaptureTimer();
    injectCapture();
    captureTimer.current = setTimeout(() => {
      finishCaptureAttempt(
        knownLeagueId
          ? 'Could not access that league. Open it in ESPN below, then tap Find my league again.'
          : 'No leagues found. Enter your League ID on the previous screen, or open your league in ESPN and tap Find my league.',
      );
    }, 30000);
  }, [clearCaptureTimer, finishCaptureAttempt, injectCapture, knownLeagueId]);

  const resolveLeaguesOnServer = useCallback(
    async (espnS2: string, swid: string, leagues: LeagueSummary[]) => {
      if (leagues.length > 0) return leagues;
      if (!espnS2 || !swid) return leagues;

      if (knownLeagueId) {
        const league = await fetchEspnLeagueById(knownLeagueId, { espnS2, swid });
        return [league];
      }

      return fetchEspnLeagues({ espnS2, swid });
    },
    [knownLeagueId],
  );

  const handleSessionPayload = useCallback(
    async (payload: {
      swid?: string;
      espnS2?: string;
      leagues?: LeagueSummary[];
      pageUrl?: string;
    }) => {
      const swid = payload.swid?.trim() ?? '';
      const espnS2 = payload.espnS2?.trim() ?? '';
      let leagues = payload.leagues ?? [];

      if (leagues.length === 0 && (espnS2 || swid)) {
        try {
          leagues = await withTimeout(
            resolveLeaguesOnServer(espnS2, swid, leagues),
            20000,
            'League lookup timed out. Check that the API is running, then try again.',
          );
        } catch (e) {
          finishCaptureAttempt(e instanceof Error ? e.message : 'Could not load leagues.');
          return;
        }
      }

      if (leagues.length === 0 && knownLeagueId && (espnS2 || swid)) {
        try {
          const league = await withTimeout(
            fetchEspnLeagueById(knownLeagueId, { espnS2, swid }),
            20000,
            'League lookup timed out.',
          );
          leagues = [league];
        } catch {
          // fall through
        }
      }

      if (leagues.length === 0) {
        finishCaptureAttempt(
          knownLeagueId
            ? 'Could not access that league after sign-in. Stay in this screen (don’t open the ESPN app), sign in here, then tap Find my league.'
            : 'Sign in here, then tap Find my league. Do not switch to the ESPN app.',
        );
        return;
      }

      if (!espnS2 || !swid) {
        finishCaptureAttempt(
          'Stay in this screen — don’t open the ESPN app. Sign in below, wait for your league page, then tap Find my league again.',
        );
        return;
      }

      clearCaptureTimer();
      captureStarted.current = false;
      setChecking(false);
      onSuccess({ swid, espnS2, leagues });
    },
    [clearCaptureTimer, finishCaptureAttempt, knownLeagueId, onSuccess, resolveLeaguesOnServer],
  );

  const maybeOpenKnownLeague = useCallback(
    (url: string) => {
      if (!knownLeagueId || openedLeagueRef.current || !isFantasyLoggedIn(url)) return;
      if (leagueIdFromUrl(url) === knownLeagueId.trim()) return;
      openedLeagueRef.current = true;
      webRef.current?.injectJavaScript(
        `window.location.assign('https://fantasy.espn.com/football/league?leagueId=${knownLeagueId.trim()}'); true;`,
      );
    },
    [knownLeagueId],
  );

  const onShouldStartLoadWithRequest = useCallback((event: { url: string; navigationType?: string }) => {
    return isAllowedWebUrl(event.url);
  }, []);

  const onOpenWindow = useCallback((event: { nativeEvent: { targetUrl?: string } }) => {
    const targetUrl = event.nativeEvent.targetUrl;
    if (targetUrl && isAllowedWebUrl(targetUrl)) {
      webRef.current?.injectJavaScript(`window.location.assign(${JSON.stringify(targetUrl)}); true;`);
    }
  }, []);

  const onNavigationStateChange = useCallback(
    (nav: WebViewNavigation) => {
      if (isFantasyLoggedIn(nav.url) && !nav.loading) {
        setSignedIn(true);
        maybeOpenKnownLeague(nav.url);
        const id = leagueIdFromUrl(nav.url);
        if (id && !captureStarted.current) {
          tryCaptureSession();
        }
      }
    },
    [maybeOpenKnownLeague, tryCaptureSession],
  );

  const onMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const payload = JSON.parse(event.nativeEvent.data) as {
          type?: string;
          swid?: string;
          espnS2?: string;
          leagues?: LeagueSummary[];
        };
        if (payload.type === 'espn-session') {
          void handleSessionPayload(payload);
        }
      } catch {
        // ignore
      }
    },
    [handleSessionPayload],
  );

  const onCloseModal = useCallback(() => {
    captureStarted.current = false;
    openedLeagueRef.current = false;
    clearCaptureTimer();
    setChecking(false);
    setError(null);
    onClose();
  }, [clearCaptureTimer, onClose]);

  return (
    <Modal visible animationType="slide" presentationStyle="fullScreen" onRequestClose={onCloseModal}>
      <View style={[styles.root, { backgroundColor: hex.background, paddingTop: insets.top }]}>
        <View style={[layout.rowBetween, styles.header, { borderBottomColor: hex.border }]}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text variant="titleMd">Log in to ESPN</Text>
            <Text variant="bodyMuted" style={{ marginTop: 2, fontSize: 13, lineHeight: 18 }}>
              {knownLeagueId
                ? `Sign in below to connect league ${knownLeagueId}. Stay in this screen — don’t open the ESPN app.`
                : 'Sign in below, then tap Find my league. Stay in this screen — don’t open the ESPN app.'}
            </Text>
          </View>
          <Pressable onPress={onCloseModal} style={styles.closeBtn} accessibilityLabel="Close ESPN login">
            <X size={22} color={hex.foreground} />
          </Pressable>
        </View>

        <View style={[layout.row, styles.actionRow, { borderBottomColor: hex.border }]}>
          <Pressable
            onPress={tryCaptureSession}
            disabled={checking || !signedIn}
            style={[
              surfaces.primaryButton,
              styles.findBtn,
              checking || !signedIn ? { opacity: 0.45 } : null,
            ]}
          >
            {checking ? (
              <ActivityIndicator color={hex.primaryForeground} size="small" />
            ) : (
              <Text variant="button" style={{ color: hex.primaryForeground, fontSize: 15 }}>
                Find my league
              </Text>
            )}
          </Pressable>
          {!signedIn ? (
            <Text variant="caption" muted style={{ flex: 1, lineHeight: 16 }}>
              Sign in on ESPN first
            </Text>
          ) : null}
        </View>

        {error ? (
          <View style={[styles.banner, { backgroundColor: hex.surfaceElevated }]}>
            <Text variant="bodySm" style={{ lineHeight: 18 }}>
              {error}
            </Text>
          </View>
        ) : null}

        <RNView style={layout.fill}>
          <WebView
            ref={webRef}
            source={{ uri: loginUrl }}
            userAgent={WEBVIEW_USER_AGENT}
            applicationNameForUserAgent="Safari"
            originWhitelist={['https://*', 'http://*']}
            sharedCookiesEnabled
            thirdPartyCookiesEnabled
            domStorageEnabled
            javaScriptEnabled
            setSupportMultipleWindows={false}
            allowsInlineMediaPlayback
            mediaPlaybackRequiresUserAction
            onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
            onOpenWindow={onOpenWindow}
            onNavigationStateChange={onNavigationStateChange}
            onMessage={onMessage}
            {...(Platform.OS === 'ios'
              ? { limitsNavigationsToAppBoundDomains: false, allowsBackForwardNavigationGestures: true }
              : {})}
          />
        </RNView>
      </View>
    </Modal>
  );
}

export function EspnLoginWebView(props: Props) {
  if (!isEspnWebViewSupported()) {
    return <EspnLoginUnavailable onClose={props.onClose} />;
  }
  return (
    <WebViewErrorBoundary fallback={<EspnLoginUnavailable onClose={props.onClose} />}>
      <EspnLoginWebViewInner {...props} />
    </WebViewErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  actionRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
  },
  findBtn: {
    height: 40,
    paddingHorizontal: 16,
    minWidth: 140,
  },
  closeBtn: {
    height: 40,
    width: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    marginHorizontal: 16,
    marginTop: 8,
    padding: 12,
    borderRadius: 12,
  },
});
