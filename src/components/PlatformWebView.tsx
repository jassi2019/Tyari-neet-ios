import Constants from 'expo-constants';
import React, { useEffect, useRef } from 'react';
import { Alert, Animated, Easing, Image, Linking, Platform, StyleSheet, Text, View } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';

type Props = {
  source: { uri: string } | { html: string };
  style?: any;
  debugLabel?: string;
  enableDebugLogs?: boolean;
  /**
   * Best-effort content protection for sensitive pages:
   * - Disables screenshots/screen recording at the screen level (see `useContentProtection`).
   * - Disables basic copy/select/context menu inside the WebView via injected JS.
   * - Blocks obvious download/navigation attempts.
   */
  protectedContent?: boolean;
};

const shouldBlockNavigation = (url: string, sourceUrl?: string): boolean => {
  const lower = String(url || '').toLowerCase();
  const clean = lower.split('#')[0].split('?')[0];

  // Allow the initial source URL (even if it's a PDF)
  if (sourceUrl && lower === String(sourceUrl).toLowerCase()) return false;

  // Block common file downloads (except the source itself).
  const blockedExts = [
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

  // Heuristic for explicit download intent.
  if (lower.includes('download=')) return true;

  return false;
};

const isTopFrameRequest = (req: any): boolean => {
  // iOS provides `isTopFrame` and `mainDocumentURL`. Android provides `isTopFrame`.
  if (typeof req?.isTopFrame === 'boolean') return req.isTopFrame;

  const url = String(req?.url || '');
  const mainDocumentURL = String(req?.mainDocumentURL || '');
  if (mainDocumentURL) return mainDocumentURL === url;

  // If we can't tell, assume top-frame to keep protection behavior.
  return true;
};

const DISABLE_ZOOM_JS = `
(function () {
  try {
    var meta = document.createElement('meta');
    meta.name = 'viewport';
    meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    document.getElementsByTagName('head')[0].appendChild(meta);
    // Also remove any existing viewport meta that allows zoom
    var existing = document.querySelectorAll('meta[name="viewport"]');
    for (var i = 0; i < existing.length; i++) {
      if (existing[i] !== meta) existing[i].parentNode.removeChild(existing[i]);
    }
    // Block pinch zoom via touch events
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length > 1) { e.preventDefault(); }
    }, { passive: false, capture: true });
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) { e.preventDefault(); }
    }, { passive: false, capture: true });
    // Block ctrl+scroll zoom
    document.addEventListener('wheel', function(e) {
      if (e.ctrlKey) { e.preventDefault(); }
    }, { passive: false, capture: true });
    // Block double-tap zoom
    var lastTap = 0;
    document.addEventListener('touchend', function(e) {
      var now = Date.now();
      if (now - lastTap < 300) { e.preventDefault(); }
      lastTap = now;
    }, { passive: false, capture: true });
  } catch (e) {}
  true;
})();`;

const PROTECT_JS = `
(function () {
  try {
    // ===== 1. DISABLE ALL COPY FUNCTIONALITY =====

    // CSS: disable all text selection
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = '* { user-select: none !important; -webkit-user-select: none !important; -moz-user-select: none !important; -ms-user-select: none !important; -webkit-touch-callout: none !important; -webkit-tap-highlight-color: transparent !important; } img { pointer-events: none !important; -webkit-user-drag: none !important; } @media print { body { display: none !important; } html { display: none !important; } } ::selection { background: transparent !important; color: inherit !important; } ::-moz-selection { background: transparent !important; color: inherit !important; }';
    document.documentElement.appendChild(style);

    // JS: block copy, cut, right-click context menu events
    document.addEventListener('copy', function(e) { e.preventDefault(); }, { capture: true });
    document.addEventListener('cut', function(e) { e.preventDefault(); }, { capture: true });
    document.addEventListener('contextmenu', function(e) { e.preventDefault(); }, { capture: true });

    // JS: block paste, drag, select, print events
    var extraEvents = ['paste','dragstart','selectstart','beforeprint','beforecopy','beforecut'];
    extraEvents.forEach(function(evt) {
      document.addEventListener(evt, function(e) { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); return false; }, { capture: true });
    });

    // JS: disable keyboard shortcuts Ctrl+C, Ctrl+A, Ctrl+X, Ctrl+U
    document.addEventListener('keydown', function(e) {
      if ((e.ctrlKey || e.metaKey) && ['c','a','x','u'].includes(e.key.toLowerCase())) {
        e.preventDefault();
      }
      // Also block F12, Ctrl+Shift+I/J/C (dev tools)
      if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key))) {
        e.preventDefault(); e.stopImmediatePropagation();
      }
    }, { capture: true });

    // Override clipboard API
    if (navigator.clipboard) {
      Object.defineProperty(navigator, 'clipboard', { get: function() { return { writeText: function() { return Promise.reject(); }, readText: function() { return Promise.reject(); }, write: function() { return Promise.reject(); }, read: function() { return Promise.reject(); } }; } });
    }

    // Override document.execCommand
    document.execCommand = function() { return false; };

    // Block long press on all elements
    document.addEventListener('touchstart', function(e) {
      if (e.target) { e.target.style.webkitUserSelect = 'none'; e.target.style.userSelect = 'none'; e.target.style.webkitTouchCallout = 'none'; }
      if (e.target && e.target.tagName === 'IMG') { e.target.style.pointerEvents = 'none'; }
    }, { capture: true, passive: false });

    // Aggressively clear any text selection
    document.addEventListener('selectionchange', function() {
      try { window.getSelection().removeAllRanges(); } catch(x) {}
    });
    setInterval(function() {
      try { window.getSelection().removeAllRanges(); } catch(x) {}
    }, 100);

    // ===== 2. REMOVE CANVA WATERMARK / LOGO / BRANDING =====

    // CSS: hide all Canva-related elements
    var canvaCSS = document.createElement('style');
    canvaCSS.type = 'text/css';
    canvaCSS.innerHTML = '[class*="canva"] { display: none !important; } [id*="canva"] { display: none !important; } [data-testid*="canva"] { display: none !important; } .__canva-embed-watermark { display: none !important; } .canva-watermark { display: none !important; } a[href*="canva.com"] { display: none !important; } div[class*="watermark"] { display: none !important; } div[class*="logo"][class*="canva"] { display: none !important; } [class*="branding"] { display: none !important; } [class*="Branding"] { display: none !important; } [data-testid*="branding"] { display: none !important; } [aria-label*="Canva"] { display: none !important; } [class*="overflow-menu"] { display: none !important; } [class*="OverflowMenu"] { display: none !important; } [class*="more-options"] { display: none !important; } [class*="MoreOptions"] { display: none !important; } [class*="kebab"] { display: none !important; } [aria-label="More options"] { display: none !important; } [aria-label="More"] { display: none !important; } [class*="toolbar"] { display: none !important; } [class*="Toolbar"] { display: none !important; } header { display: none !important; } footer { display: none !important; } [aria-label*="fullscreen"] { display: none !important; } [aria-label*="Fullscreen"] { display: none !important; } button[class*="fullscreen"] { display: none !important; } button[class*="Fullscreen"] { display: none !important; }';
    document.documentElement.appendChild(canvaCSS);

    // JS: repeatedly scan and remove Canva branding + "Create with Canva" text
    setInterval(function() {
      try {
        // Remove elements containing "Create with Canva" or "Created with Canva" text
        document.querySelectorAll('*').forEach(function(el) {
          if (el.childElementCount === 0 && el.innerText && (el.innerText.includes('Create with Canva') || el.innerText.includes('Created with Canva') || el.innerText.includes('Made with Canva'))) {
            el.style.display = 'none';
          }
        });

        // Remove Canva elements by selectors
        var selectors = [
          '[class*="canva"]','[id*="canva"]','[data-testid*="canva"]',
          '.__canva-embed-watermark','.canva-watermark',
          'a[href*="canva.com"]','div[class*="watermark"]',
          '[class*="branding"]','[class*="Branding"]',
          '[aria-label*="Canva"]',
          '[class*="overflow-menu"]','[class*="OverflowMenu"]',
          '[class*="more-options"]','[class*="MoreOptions"]',
          '[class*="kebab"]',
          '[aria-label="More options"]','[aria-label="More"]',
          'header','footer',
          '[class*="toolbar"]','[class*="Toolbar"]',
          '[aria-label*="fullscreen"]','[aria-label*="Fullscreen"]',
        ];
        var els = document.querySelectorAll(selectors.join(','));
        els.forEach(function(el){ el.style.display='none'; el.style.visibility='hidden'; el.style.height='0'; el.style.overflow='hidden'; });
      }catch(x){}
    }, 500);
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

const buildInjectedJavaScript = (useProtection: boolean, useDebug: boolean, disableZoom: boolean = true): string | undefined => {
  const scripts: string[] = [];
  if (disableZoom) scripts.push(DISABLE_ZOOM_JS);
  if (useProtection) scripts.push(PROTECT_JS);
  if (useDebug) scripts.push(DEBUG_WEBVIEW_JS);
  if (scripts.length === 0) return undefined;
  return scripts.join('\n');
};

const appIcon = require('../../assets/icon.png');

function PulseLoader() {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scale, { toValue: 1.25, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scale, { toValue: 0.85, duration: 700, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [scale]);

  return (
    <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#FFF8E8', alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View style={{ transform: [{ scale }] }}>
        <Image source={appIcon} style={{ width: 64, height: 64, borderRadius: 16 }} resizeMode="contain" />
      </Animated.View>
      <Text style={{ marginTop: 14, fontSize: 13, color: '#92400E', fontWeight: '700' }}>Loading content...</Text>
    </View>
  );
}

export default function PlatformWebView({
  source,
  style,
  protectedContent,
  debugLabel,
  enableDebugLogs,
}: Props) {
  const debugEnabled = Boolean(enableDebugLogs);
  const safeProtected = Boolean(protectedContent);
  const injectedJS = buildInjectedJavaScript(safeProtected, debugEnabled);
  const debugPrefix = debugLabel ? `[PlatformWebView:${debugLabel}]` : '[PlatformWebView]';
  const sourceUrl = 'uri' in source ? source.uri : undefined;

  if (Platform.OS === 'web') {
    // For web, render an iframe for uri sources, or simple HTML wrapper for html
    if ('uri' in source) {
      return (
        <iframe
          src={source.uri}
          style={{ width: '100%', height: '100%', border: 'none', ...(style || {}) }}
          title="webview"
        />
      );
    }

    // html fallback
    return (
      <View style={[styles.webFallback, style]}>
        <Text>HTML content not supported in web fallback.</Text>
      </View>
    );
  }

  try {
    const isCanvaUri = 'uri' in source && /canva\.com/i.test(source.uri);
    const canvaCompatibleUserAgent =
      Platform.OS === 'android'
        ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    // Lazy require so web doesn't import native module
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { WebView } = require('react-native-webview');

    return (
      <WebView
        source={source as any}
        style={style}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        allowsFullscreenVideo={false}
        startInLoadingState={true}
        renderLoading={() => <PulseLoader />}
        originWhitelist={['*']}
        mixedContentMode="always"
        allowFileAccess={true}
        allowUniversalAccessFromFileURLs={true}
        thirdPartyCookiesEnabled={true}
        sharedCookiesEnabled={true}
        cacheEnabled={true}
        cacheMode="LOAD_CACHE_ELSE_NETWORK"
        userAgent={isCanvaUri ? canvaCompatibleUserAgent : undefined}
        scalesPageToFit={false}
        injectedJavaScriptBeforeContentLoaded={injectedJS}
        injectedJavaScript={injectedJS}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        textZoom={100}
        decelerationRate={0.99}
        overScrollMode="never"
        bounces={false}
        textInteractionEnabled={!safeProtected}
        nestedScrollEnabled={false}
        showsHorizontalScrollIndicator={false}
        onLoadStart={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadStart]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
          });
        }}
        onLoadEnd={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadEnd]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
          });
        }}
        onError={(event: any) => {
          if (!debugEnabled || !__DEV__) return;
          console.log(`${debugPrefix}[LoadError]`, {
            platform: Platform.OS,
            url: event?.nativeEvent?.url || '',
            description: event?.nativeEvent?.description || 'unknown',
          });
        }}
        onHttpError={(event: any) => {
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
        onFileDownload={safeProtected ? () => Alert.alert('Download blocked', 'Downloads are disabled.') : undefined}
        onShouldStartLoadWithRequest={
          safeProtected
            ? (req: any) => {
                const url = String(req?.url || '');
                if (debugEnabled && __DEV__) {
                  console.log(`${debugPrefix}[Request]`, {
                    url,
                    isTopFrame: isTopFrameRequest(req),
                  });
                }
                // Important: Allow subresource loads (images/scripts) so embedded lesson
                // pages (e.g. Canva) don't show broken placeholders. Only gate top-frame
                // navigations / downloads.
                if (!isTopFrameRequest(req)) return true;
                if (shouldBlockNavigation(url, sourceUrl)) {
                  Alert.alert('Blocked', 'Downloads are disabled.');
                  return false;
                }
                return true;
              }
            : undefined
        }
      />
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
});
