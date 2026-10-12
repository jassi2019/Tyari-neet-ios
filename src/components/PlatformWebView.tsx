import React from 'react';
import { ActivityIndicator, Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';

type Props = {
  source: { uri: string } | { html: string };
  style?: any;
  debugLabel?: string;
  enableDebugLogs?: boolean;
  protectedContent?: boolean;
};

const shouldBlockNavigation = (url: string): boolean => {
  const lower = String(url || '').toLowerCase();
  const clean = lower.split('#')[0].split('?')[0];

  const blockedExts = [
    '.pdf',
    '.zip',
    '.rar',
    '.7z',
    '.doc',
    '.docx',
    '.ppt',
    '.pptx',
    '.xls',
    '.xlsx',
  ];
  if (blockedExts.some((ext) => clean.endsWith(ext))) return true;

  if (lower.includes('download=')) return true;

  return false;
};

const isTopFrameRequest = (req: any): boolean => {
  if (typeof req?.isTopFrame === 'boolean') return req.isTopFrame;

  const url = String(req?.url || '');
  const mainDocumentURL = String(req?.mainDocumentURL || '');
  if (mainDocumentURL) return mainDocumentURL === url;

  return true;
};

const PROTECT_JS = `
(function () {
  try {
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = '*{ -webkit-user-select:none !important; user-select:none !important; } body{ -webkit-touch-callout:none !important; }'
      // Canva's viewer is a client-side app, so these are the REAL elements it
      // renders (taken from its bundles): the "Create with Canva" logo button
      // and the Share / Copy link buttons. aria-label is used because Canva's
      // hashed class names change on every deploy. CSS (not one-time removal)
      // so nodes Canva re-adds later stay hidden. <footer> is deliberately NOT
      // hidden: in Canva's embed app it is the per-slide caption, not branding.
      // Canva translates aria-labels (Hindi: "Canva के साथ बनाएँ"), so an English
      // text match alone fails on non-English phones. The logo is a real <a> that
      // opens canva.com in a new tab, so match on href/target too (any language).
      + ' a.NHn7fw, a[href="/"][target="_blank"], a[href^="/?utm_"][target="_blank"],'
      + ' a[href^="https://www.canva.com"][target="_blank"], a[href^="https://canva.com"][target="_blank"],'
      + ' [aria-label="Create with Canva"], [aria-label="Canva के साथ बनाएँ"],'
      + ' [aria-label="Share"], [aria-label="शेयर करें"], [aria-label="Copy link"] { display:none !important; }';
    (document.head || document.documentElement).appendChild(style);

    document.addEventListener('copy', function (e) { e.preventDefault(); });
    document.addEventListener('cut', function (e) { e.preventDefault(); });
    document.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    // Block only pinch (2-finger) zoom; single taps untouched
    document.addEventListener('touchstart', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
    document.addEventListener('touchmove', function (e) { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  } catch (e) {}
  true;
})();`;

const DEBUG_WEBVIEW_JS = `
(function () {
  try {
    function post(type, payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: type,
          payload: payload || {},
          href: String(window.location && window.location.href || '')
        }));
      }
    }

    window.addEventListener('error', function (event) {
      try {
        var target = event && event.target ? event.target : null;
        if (target && target.tagName === 'IMG') {
          post('img_error', {
            src: String(target.currentSrc || target.src || ''),
            alt: String(target.alt || '')
          });
        }
      } catch (_) {}
    }, true);
  } catch (_) {}
  true;
})();`;

// Canva fits the design to screen width, which makes text tiny on phones.
// Narrowing the layout viewport makes the browser upscale everything 1.5x
// (a fixed render zoom — user pinch zoom stays disabled).
const CANVA_FONT_BOOST_JS = `
(function () {
  try {
    if (window.__canvaBoosted) return;
    window.__canvaBoosted = true;
    var w = window.innerWidth || 360;
    var target = Math.round(w / 1.5);
    var vp = document.querySelector('meta[name="viewport"]');
    if (!vp) {
      vp = document.createElement('meta');
      vp.setAttribute('name', 'viewport');
      (document.head || document.documentElement).appendChild(vp);
    }
    vp.setAttribute('content', 'width=' + target + ', user-scalable=no');
    setTimeout(function () { try { window.dispatchEvent(new Event('resize')); } catch (e) {} }, 300);
  } catch (e) {}
  true;
})();`;

const buildInjectedJavaScript = (useProtection: boolean, useDebug: boolean, useCanvaBoost: boolean): string | undefined => {
  const scripts: string[] = [];
  if (useCanvaBoost) scripts.push(CANVA_FONT_BOOST_JS);
  if (useProtection) scripts.push(PROTECT_JS);
  if (useDebug) scripts.push(DEBUG_WEBVIEW_JS);
  if (scripts.length === 0) return undefined;
  return scripts.join('\n');
};

// Canva's `?embed` response serves its dedicated embed app instead of the
// full design viewer, so the branding chrome is never part of the page.
// Same viewport meta, so the font boost is unaffected.
const withCanvaEmbed = (uri: string): string => {
  if (/[?&]embed(=|&|$)/i.test(uri)) return uri;
  const hash = uri.indexOf('#');
  const base = hash === -1 ? uri : uri.slice(0, hash);
  const frag = hash === -1 ? '' : uri.slice(hash);
  return base + (base.includes('?') ? '&' : '?') + 'embed' + frag;
};

export default function PlatformWebView({
  source,
  style,
  protectedContent,
  debugLabel,
  enableDebugLogs,
}: Props) {
  const debugEnabled = Boolean(enableDebugLogs);
  const isCanvaSource = 'uri' in source && /canva\.com/i.test(source.uri);
  const injectedJS = buildInjectedJavaScript(Boolean(protectedContent), debugEnabled, isCanvaSource);
  const debugPrefix = debugLabel ? `[PlatformWebView:${debugLabel}]` : '[PlatformWebView]';

  // Keep Canva pages invisible until PROTECT_JS has run, so branding can never
  // be seen even for a frame.
  const [revealed, setRevealed] = React.useState(!isCanvaSource);
  const revealTimer = React.useRef<any>(null);

  React.useEffect(() => () => {
    if (revealTimer.current) clearTimeout(revealTimer.current);
  }, []);

  // Safety net: a stalled load fires neither onLoadEnd nor onError, so never
  // leave the user stuck on the spinner.
  React.useEffect(() => {
    if (!isCanvaSource) return;
    const t = setTimeout(() => setRevealed(true), 8000);
    return () => clearTimeout(t);
  }, [isCanvaSource]);

  // Canva picks its UI language from Accept-Language; ask for English so the
  // label-based selectors match on every phone (href selectors cover the rest).
  const effectiveSource =
    isCanvaSource && 'uri' in source
      ? {
          ...source,
          uri: withCanvaEmbed(source.uri),
          headers: { ...((source as any).headers || {}), 'Accept-Language': 'en-US,en;q=0.9' },
        }
      : source;

  if (Platform.OS === 'web') {
    if ('uri' in source) {
      return (
        <iframe
          src={source.uri}
          style={{ width: '100%', height: '100%', border: 'none', ...(style || {}) }}
          title="webview"
        />
      );
    }

    return (
      <View style={[styles.webFallback, style]}>
        <Text>HTML content not supported in web fallback.</Text>
      </View>
    );
  }

  try {
    const canvaCompatibleUserAgent =
      Platform.OS === 'android'
        ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WebView } = require('react-native-webview');

    return (
      <View style={[{ flex: 1, backgroundColor: '#FFFFFF' }, style]}>
      <WebView
        source={effectiveSource as any}
        style={[{ flex: 1 }, revealed ? null : styles.hidden]}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={true}
        startInLoadingState={true}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        cacheEnabled={true}
        setBuiltInZoomControls={false}
        setDisplayZoomControls={false}
        userAgent={isCanvaSource ? canvaCompatibleUserAgent : undefined}
        injectedJavaScript={injectedJS}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        onLoadStart={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadStart]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
          });
        }}
        onLoadEnd={(event: any) => {
          if (isCanvaSource && !revealed) {
            if (revealTimer.current) clearTimeout(revealTimer.current);
            // Let injectedJavaScript (branding CSS + font boost) paint first.
            revealTimer.current = setTimeout(() => setRevealed(true), 450);
          }
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadEnd]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
          });
        }}
        onError={(event: any) => {
          if (!revealed) setRevealed(true);
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadError]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
            description: event?.nativeEvent?.description || 'unknown',
          });
        }}
        onHttpError={(event: any) => {
          if (!revealed) setRevealed(true);
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[HttpError]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
            statusCode: event?.nativeEvent?.statusCode,
            description: event?.nativeEvent?.description || 'unknown',
          });
        }}
        onMessage={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          const raw = event?.nativeEvent?.data;
          if (!raw) return;
          try {
            const parsed = JSON.parse(raw);
            console.log(`${debugPrefix}[Message]`, parsed);
          } catch {
            console.log(`${debugPrefix}[Message]`, raw);
          }
        }}
        onFileDownload={protectedContent ? () => Alert.alert('Download blocked', 'Downloads are disabled.') : undefined}
        onShouldStartLoadWithRequest={
          protectedContent
            ? (req: any) => {
                const url = String(req?.url || '');
                if (debugEnabled && __DEV__) {
                  console.log(`${debugPrefix}[Request]`, {
                    url,
                    isTopFrame: isTopFrameRequest(req),
                  });
                }
                if (!isTopFrameRequest(req)) return true;
                if (shouldBlockNavigation(url)) {
                  Alert.alert('Blocked', 'Downloads are disabled.');
                  return false;
                }
                return true;
              }
            : undefined
        }
      />
      {!revealed && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <ActivityIndicator size="large" color="#F5A623" />
        </View>
      )}
      </View>
    );
  } catch (e) {
    return (
      <View style={[styles.webFallback, style]}>
        <Text>WebView native module is not installed or available.</Text>
        {'uri' in source && (
          <Text style={styles.link} onPress={() => Linking.openURL(source.uri)}>
            Open in browser
          </Text>
        )}
      </View>
    );
  }
}

const styles = StyleSheet.create({
  webFallback: { padding: 16, alignItems: 'center', justifyContent: 'center' },
  link: { marginTop: 8, color: '#0066cc' },
  hidden: { opacity: 0 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
