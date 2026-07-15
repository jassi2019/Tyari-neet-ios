import React from 'react';
import { Alert, Linking, Platform, StyleSheet, Text, View } from 'react-native';

type Props = {
  source: { uri: string } | { html: string };
  style?: any;
  debugLabel?: string;
  enableDebugLogs?: boolean;
  protectedContent?: boolean;
};

const shouldBlockNavigation = (url: string, sourceUrl?: string): boolean => {
  const lower = String(url || '').toLowerCase();
  const clean = lower.split('#')[0].split('?')[0];
  if (sourceUrl && lower === String(sourceUrl).toLowerCase()) return false;
  const blockedExts = ['.zip', '.rar', '.7z', '.doc', '.docx', '.ppt', '.pptx', '.xls', '.xlsx'];
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

// Original protection + Canva branding removal + zoom block
const PROTECT_JS = `
(function () {
  try {
    // 1. Copy/Select protection (from original)
    var style = document.createElement('style');
    style.type = 'text/css';
    style.innerHTML = '*{ -webkit-user-select:none !important; user-select:none !important; -webkit-touch-callout:none !important; }';
    document.documentElement.appendChild(style);

    document.addEventListener('contextmenu', function (e) { e.preventDefault(); }, { capture: true });
    document.addEventListener('copy', function (e) { e.preventDefault(); }, { capture: true });
    document.addEventListener('cut', function (e) { e.preventDefault(); }, { capture: true });
    document.addEventListener('paste', function (e) { e.preventDefault(); }, { capture: true });
    document.addEventListener('dragstart', function (e) { e.preventDefault(); }, { capture: true });

    // 2. Zoom block
    document.addEventListener('touchstart', function(e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false, capture: true });
    document.addEventListener('touchmove', function(e) {
      if (e.touches.length > 1) e.preventDefault();
    }, { passive: false, capture: true });
    var lastTap = 0;
    document.addEventListener('touchend', function(e) {
      var now = Date.now();
      if (now - lastTap < 300) e.preventDefault();
      lastTap = now;
    }, { passive: false, capture: true });

    // 3. Hide ALL Canva branding
    var css = document.createElement('style');
    css.innerHTML = [
      // Hide ALL Canva branding elements
      'footer,header{display:none!important;height:0!important;overflow:hidden!important}',
      'a[href*="canva"]{display:none!important;height:0!important}',
      '[class*="branding"],[class*="Branding"],[class*="watermark"],[class*="Watermark"]{display:none!important;height:0!important}',
      '[aria-label*="Canva"],[aria-label*="canva"]{display:none!important;height:0!important}',
      '[class*="overflow-menu"],[class*="OverflowMenu"],[class*="kebab"]{display:none!important}',
      '[aria-label="More options"],[aria-label="More"]{display:none!important}',
      '[class*="toolbar"],[class*="Toolbar"]{display:none!important}',
      '[data-testid*="canva"],[data-testid*="branding"]{display:none!important}',
      'div[class*="___canva"]{display:none!important}',
      '[class*="made-with"],[class*="MadeWith"],[class*="powered-by"],[class*="PoweredBy"]{display:none!important}',
      'div[class*="bottom-bar"],div[class*="bottomBar"],div[class*="BottomBar"]{display:none!important}',
      // Hide bottom fixed bar (Canva sign up / branding bar)
      'div[style*="position: fixed"][style*="bottom"],div[style*="position:fixed"][style*="bottom"]{display:none!important;height:0!important}',
    ].join(' ');
    document.documentElement.appendChild(css);

    function removeCanvaBranding() {
      try {
        // Nuclear approach: find and kill ANY element containing canva/branding text
        var all = document.querySelectorAll('*');
        for (var i = 0; i < all.length; i++) {
          var el = all[i];
          // Only check leaf nodes and small containers
          if (el.childElementCount > 5) continue;
          var t = (el.textContent || '').trim().toLowerCase();
          if (t.length > 200) continue; // skip large text blocks
          if (t.indexOf('canva') !== -1 || t.indexOf('made with') !== -1 || t.indexOf('create with') !== -1 || t.indexOf('created with') !== -1 || t.indexOf('designed with') !== -1 || t.indexOf('powered by') !== -1) {
            // Walk up to find the container and hide it
            var target = el;
            for (var k = 0; k < 4; k++) {
              if (target.parentElement && target.parentElement !== document.body && target.parentElement !== document.documentElement) {
                target = target.parentElement;
              }
            }
            target.style.cssText = 'display:none!important;visibility:hidden!important;height:0!important;overflow:hidden!important;pointer-events:none!important;';
          }
        }
        // Kill all links to canva.com
        document.querySelectorAll('a').forEach(function(a) {
          if ((a.href || '').toLowerCase().indexOf('canva') !== -1) {
            a.style.cssText = 'display:none!important;height:0!important;';
            if (a.parentElement) a.parentElement.style.cssText = 'display:none!important;height:0!important;';
          }
        });
        // Kill fixed positioned bottom bars
        document.querySelectorAll('div,section,aside,nav').forEach(function(el) {
          var s = window.getComputedStyle(el);
          if (s.position === 'fixed' || s.position === 'sticky') {
            var r = el.getBoundingClientRect();
            if (r.bottom >= window.innerHeight - 100 && r.height < 120) {
              el.style.cssText = 'display:none!important;height:0!important;';
            }
          }
        });
      } catch(x) {}
    }

    // Run aggressively
    removeCanvaBranding();
    setInterval(removeCanvaBranding, 500);
    document.addEventListener('DOMContentLoaded', removeCanvaBranding);
    window.addEventListener('load', function() {
      removeCanvaBranding();
      setTimeout(removeCanvaBranding, 500);
      setTimeout(removeCanvaBranding, 1500);
      setTimeout(removeCanvaBranding, 3000);
      setTimeout(removeCanvaBranding, 5000);
    });
  } catch (e) {}
  true;
})();`;

export default function PlatformWebView({
  source,
  style,
  protectedContent,
}: Props) {
  const safeProtected = Boolean(protectedContent);
  const sourceUrl = 'uri' in source ? source.uri : undefined;

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
    const isCanvaUri = 'uri' in source && /canva\.(com|link)/i.test(source.uri);
    const isCanvaEmbed = isCanvaUri && 'uri' in source && /embed/i.test(source.uri);
    const canvaCompatibleUserAgent =
      Platform.OS === 'android'
        ? 'Mozilla/5.0 (Linux; Android 14; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
        : 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';

    const { WebView } = require('react-native-webview');

    // Direct load — no iframe wrapper. Canva handles its own rendering.
    const finalSource = source;

    return (
      <WebView
        source={finalSource as any}
        style={style}
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
        userAgent={isCanvaUri ? canvaCompatibleUserAgent : undefined}
        injectedJavaScriptBeforeContentLoaded={safeProtected ? PROTECT_JS : undefined}
        injectedJavaScript={safeProtected ? PROTECT_JS : undefined}
        setSupportMultipleWindows={false}
        allowsLinkPreview={false}
        textInteractionEnabled={!safeProtected}
        onFileDownload={safeProtected ? () => Alert.alert('Download blocked', 'Downloads are disabled.') : undefined}
        onShouldStartLoadWithRequest={
          safeProtected
            ? (req: any) => {
                const url = String(req?.url || '');
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
