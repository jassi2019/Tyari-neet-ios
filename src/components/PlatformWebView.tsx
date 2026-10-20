import React from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';

import BrandLoader from './BrandLoader';
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

// Canva's embed app still renders its own controls after `?embed` removes the logo:
// a floating fullscreen toggle (button[aria-label="Enter full screen"]), a "More"
// button, and a black dialog whose round Share / Report buttons carry NO aria-label
// (the text is in a sibling <label>), plus an "Enlarge" image button. None of these
// are reachable by the logo selectors, so hide them by label, by role and by position,
// and keep hiding anything React mounts later. Slide navigation is left alone.
const CANVA_GUARD_JS = String.raw`
(function () {
  try {
    if (window.__lessonGuard) return;
    window.__lessonGuard = true;

    // ---- 1. CSS (declarative; survives React re-renders) -------------------
    var CSS = [
      'button[aria-label="Enter full screen"]', 'button[aria-label="Exit full screen"]',
      'button[aria-label="Toggle fullscreen"]',
      'button[aria-haspopup="dialog"][aria-expanded]',          // "More" (...) button, language independent
      'button[aria-label="More"]', 'button[aria-label="Enlarge"]',
      'button[aria-label="Zoom in and out"]', 'button[aria-label="Show controls"]',
    ];
    var css = CSS.join(',') + '{display:none!important;visibility:hidden!important;pointer-events:none!important}' +
      '[role="dialog"][aria-modal="true"],[role="tooltip"]{display:none!important;pointer-events:none!important}';
    var st = document.createElement('style');
    st.setAttribute('data-lesson-guard', '1');
    st.appendChild(document.createTextNode(css));
    (document.head || document.documentElement).appendChild(st);

    // ---- 2. JS fallback ----------------------------------------------------
    var BAD = /^(share|report|copy link|hide controls|show controls|more( options)?|enlarge|zoom in and out|(enter |exit |toggle )?full ?screen|present|create with canva|open in canva|made with canva|pinterest|facebook|linkedin|wechat|qq)$/i;
    var KEEP = /^(next|previous|go to page|slide)/i;   // slide navigation: never touch
    var count = 0;

    function inNav(el) {
      for (var n = el; n && n.nodeType === 1; n = n.parentNode) {
        var r = n.getAttribute('role');
        if (r === 'navigation') return true;
      }
      return false;
    }
    function textOf(el) {
      var t = el.getAttribute('aria-label');
      if (!t) {
        var ids = el.getAttribute('aria-labelledby');
        if (ids) {
          var parts = ids.split(/\s+/), s = [];
          for (var i = 0; i < parts.length; i++) {
            var r = document.getElementById(parts[i]);
            if (r) s.push(r.textContent || '');
          }
          t = s.join(' ');
        }
      }
      if (!t) t = el.getAttribute('title');
      if (!t && el.textContent && el.textContent.length <= 40) t = el.textContent;
      return (t || '').replace(/^\s+|\s+$/g, '');
    }
    function kill(el) {
      if (!el || el.__lgKilled) return;
      el.__lgKilled = true;
      try {
        el.style.setProperty('display', 'none', 'important');
        el.style.setProperty('pointer-events', 'none', 'important');
        el.setAttribute('aria-hidden', 'true');
        el.setAttribute('tabindex', '-1');
      } catch (e) {}
      count++;
    }
    // hide the dialog and the full-screen backdrop wrapped around it
    function killDialog(d) {
      kill(d);
      var vw = window.innerWidth, vh = window.innerHeight, n = d.parentNode, hops = 0;
      while (n && n.nodeType === 1 && n !== document.body && n !== document.documentElement &&
             n.id !== 'root' && hops < 6) {
        var rc = n.getBoundingClientRect();
        var cs = window.getComputedStyle(n);
        var covers = rc.width >= vw * 0.9 && rc.height >= vh * 0.9;
        if (covers && (cs.position === 'fixed' || cs.position === 'absolute')) { kill(n); }
        n = n.parentNode; hops++;
      }
    }
    function sweep() {
      var i, el, list;
      list = document.querySelectorAll('[role="dialog"][aria-modal="true"]');
      for (i = 0; i < list.length; i++) killDialog(list[i]);

      list = document.querySelectorAll('button,[role="button"]');
      var vw = window.innerWidth, vh = window.innerHeight;
      for (i = 0; i < list.length; i++) {
        el = list[i];
        if (el.__lgKilled) continue;
        var t = textOf(el);
        if (t && KEEP.test(t)) continue;
        if (inNav(el)) continue;
        if (t && BAD.test(t)) { kill(el); continue; }
        // language-independent heuristic: small control pinned to bottom-right corner
        var r = el.getBoundingClientRect();
        if (r.width > 0 && r.width <= 64 && r.height <= 64 &&
            r.right >= vw - 40 && r.bottom >= vh - 40) {
          var p = el.parentNode, fixed = false, h = 0;
          while (p && p.nodeType === 1 && p !== document.body && h < 6) {
            var pos = window.getComputedStyle(p).position;
            if (pos === 'fixed' || pos === 'absolute') { fixed = true; break; }
            p = p.parentNode; h++;
          }
          if (fixed) kill(el);
        }
      }
      // label-only controls: <label for=btn>Share</label> -> hide label + its button
      list = document.querySelectorAll('label[for]');
      for (i = 0; i < list.length; i++) {
        el = list[i];
        var lt = (el.textContent || '').replace(/^\s+|\s+$/g, '');
        if (lt && BAD.test(lt)) {
          var b = document.getElementById(el.getAttribute('for'));
          if (b) kill(b.closest ? (b.closest('div') || b) : b);
          kill(el);
        }
      }
    }

    var pending = false;
    function schedule() {
      if (pending) return;
      pending = true;
      setTimeout(function () { pending = false; try { sweep(); } catch (e) {} }, 60);
    }
    var root = document.documentElement;
    if (window.MutationObserver) {
      new MutationObserver(schedule).observe(root, { childList: true, subtree: true });
    }
    var ticks = 0;
    var iv = setInterval(function () {
      try { sweep(); } catch (e) {}
      if (++ticks >= 75) clearInterval(iv);          // 75 x 400ms = 30s, then observer only
    }, 400);
    window.addEventListener('resize', schedule);
    sweep();
  } catch (e) {}
  true;
})();
`;

// Runs before Canva's scripts when the platform honours it (best effort): with
// fullscreen reported as unsupported, Canva never creates the fullscreen button.
const CANVA_BEFORE_JS = String.raw`
(function () {
  try {
    ['fullscreenEnabled', 'webkitFullscreenEnabled', 'mozFullScreenEnabled', 'msFullscreenEnabled'].forEach(function (k) {
      try { Object.defineProperty(document, k, { get: function () { return false; }, configurable: true }); } catch (e) {}
    });
  } catch (e) {}
  true;
})();
`;

// Top-frame navigations a Canva page must never make from inside the lesson:
// report page, sharing sites, and Canva's home page (the logo link).
const isBlockedCanvaNavigation = (url: string): boolean => {
  const u = String(url || '').toLowerCase();
  if (!/^https?:/.test(u)) return /^(mailto|tel|intent|market|whatsapp|fb|twitter):/.test(u);
  const m = u.match(/^https?:\/\/([^\/?#]+)(\/[^?#]*)?/);
  if (!m) return false;
  const host = m[1];
  const path = m[2] || '/';
  if (/(^|\.)(facebook|pinterest|linkedin|twitter|x|whatsapp|wechat|qq|instagram|t)\.(com|co|me|net)$/.test(host)) return true;
  if (/(^|\.)canva\.com$/.test(host)) {
    if (path.indexOf('/report-content') === 0) return true;
    if (path === '/' || path === '') return true;
    if (path.indexOf('/login') === 0 || path.indexOf('/signup') === 0) return true;
  }
  return false;
};

const buildInjectedJavaScript = (useProtection: boolean, useDebug: boolean, useCanvaBoost: boolean): string | undefined => {
  const scripts: string[] = [];
  if (useCanvaBoost) scripts.push(CANVA_FONT_BOOST_JS);
  if (useCanvaBoost) scripts.push(CANVA_GUARD_JS);
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
        injectedJavaScriptBeforeContentLoaded={isCanvaSource ? CANVA_BEFORE_JS : undefined}
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
                if (isCanvaSource && isBlockedCanvaNavigation(url)) return false;
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
          <BrandLoader />
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
