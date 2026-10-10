import { useAuth } from '@/contexts/AuthContext';
import { useVerifyPayUPayment, type PayUOrderResponse } from '@/hooks/api/payu';
import { useGetProfile } from '@/hooks/api/user';
import { useSendLogReport } from '@/hooks/api/log';
import { useQueryClient } from '@tanstack/react-query';
import { TPlan } from '@/types/Plan';
import { ChevronLeft } from 'lucide-react-native';
import React, { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView, type WebViewNavigation } from 'react-native-webview';

type PayUCheckoutProps = {
  navigation: any;
  route: {
    params: {
      payuParams: PayUOrderResponse;
      plan: TPlan;
    };
  };
};

const buildPayUFormHtml = (params: PayUOrderResponse): string => {
  const fields = [
    'key',
    'txnid',
    'amount',
    'productinfo',
    'firstname',
    'email',
    'phone',
    'hash',
    'surl',
    'furl',
    'udf1',
    'udf2',
  ] as const;

  const hiddenInputs = fields
    .map((field) => {
      const value = (params[field] || '').replace(/"/g, '&quot;');
      return `<input type="hidden" name="${field}" value="${value}" />`;
    })
    .join('\n  ');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100vh;
      margin: 0;
      font-family: sans-serif;
      background-color: #f9fafb;
    }
    .loading {
      color: #6b7280;
      font-size: 16px;
    }
  </style>
</head>
<body onload="document.forms[0].submit()">
  <p class="loading">Redirecting to payment gateway...</p>
  <form method="POST" action="${params.paymentUrl}">
    ${hiddenInputs}
  </form>
</body>
</html>`.trim();
};

const PayUCheckout = ({ navigation, route }: PayUCheckoutProps) => {
  const { payuParams, plan } = route.params;
  const { setUser, signOut } = useAuth();
  const { refetch: fetchProfile } = useGetProfile({ enabled: false });
  const { mutateAsync: verifyPayment, isPending: isVerifying } = useVerifyPayUPayment();
  const sendLogReport = useSendLogReport();

  const queryClient = useQueryClient();
  const webViewRef = useRef<WebView>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasHandledResult, setHasHandledResult] = useState(false);
  const lastUrlRef = useRef<string>('');

  const formHtml = React.useMemo(() => buildPayUFormHtml(payuParams), [payuParams]);

  const refreshAuthUser = async () => {
    try {
      // Invalidate cache so fresh data is fetched from server
      await queryClient.invalidateQueries({ queryKey: ['useGetProfile'] });
      const profileResult = await fetchProfile();
      if (profileResult.data?.data) {
        setUser(profileResult.data.data);
      }
    } catch {
      // Non-blocking
    }
  };

  const handlePaymentSuccess = async (txnid: string) => {
    if (hasHandledResult) return;
    setHasHandledResult(true);

    try {
      await verifyPayment(txnid);
      await refreshAuthUser();

      navigation.navigate('SubscriptionMessage', {
        success: true,
        plan,
      });
    } catch (error: any) {
      console.error('PayU verification error:', error);

      try {
        await sendLogReport.mutateAsync({
          error: String(error?.message || error || 'PayU verification failed'),
        });
      } catch {
        // noop
      }

      const statusCode = error?.response?.status || error?.status;
      if (statusCode === 401) {
        await signOut();
        Alert.alert('Session Expired', 'Please log in again to continue.', [{ text: 'OK' }]);
        return;
      }

      Alert.alert(
        'Verification Error',
        'Payment was received but verification failed. Please contact support if your subscription is not activated.',
        [
          {
            text: 'OK',
            onPress: () =>
              navigation.navigate('SubscriptionMessage', {
                success: false,
                plan,
              }),
          },
        ]
      );
    }
  };

  const handlePaymentFailure = (message?: string) => {
    if (hasHandledResult) return;
    setHasHandledResult(true);

    const errorMessage = message || 'Payment was not completed.';

    try {
      sendLogReport.mutateAsync({
        error: `PayU payment failed: ${errorMessage}`,
      });
    } catch {
      // noop
    }

    Alert.alert('Payment Failed', errorMessage, [
      {
        text: 'OK',
        onPress: () =>
          navigation.navigate('SubscriptionMessage', {
            success: false,
            plan,
          }),
      },
      {
        text: 'Back',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  const injectedJS = `
    (function() {
      function checkResult() {
        var el = document.getElementById('payu-result');
        if (el) {
          var status = el.getAttribute('data-status');
          var txnid = el.getAttribute('data-txnid');
          if (status) {
            window.ReactNativeWebView.postMessage(JSON.stringify({ status: status, txnid: txnid }));
          }
        }
      }
      // Check immediately and also after DOM changes
      checkResult();
      var observer = new MutationObserver(checkResult);
      observer.observe(document.body, { childList: true, subtree: true });
      setTimeout(checkResult, 1000);
      setTimeout(checkResult, 3000);
    })();
    true;
  `;

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.status === 'success') {
        handlePaymentSuccess(data.txnid || payuParams.txnid);
      } else if (data.status === 'failure') {
        handlePaymentFailure();
      }
    } catch {}
  };

  const handleNavigationChange = (navState: WebViewNavigation) => {
    const { url } = navState;
    if (!url) return;

    // Check if navigated to success URL
    if (url.includes('/payu/callback') || url.startsWith(payuParams.surl)) {
      // Let injected JS handle it via payu-result div
      return;
    }

    // Check if navigated to failure URL
    if (url.startsWith(payuParams.furl)) {
      handlePaymentFailure();
      return;
    }
  };

  const handleBackPress = () => {
    if (hasHandledResult) return;

    Alert.alert('Cancel Payment?', 'Are you sure you want to cancel this payment?', [
      { text: 'No, Continue', style: 'cancel' },
      {
        text: 'Yes, Cancel',
        style: 'destructive',
        onPress: () => navigation.goBack(),
      },
    ]);
  };

  // Handle Android hardware back button
  React.useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      handleBackPress();
      return true; // Prevent default back behavior
    });

    return () => backHandler.remove();
  }, [hasHandledResult]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
          <ChevronLeft size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment</Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.webViewContainer}>
        {(isLoading || isVerifying) && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#F1BB3E" />
            <Text style={styles.loadingText}>
              {isVerifying ? 'Verifying payment...' : 'Loading payment page...'}
            </Text>
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ html: formHtml }}
          style={styles.webView}
          onMessage={handleWebViewMessage}
          injectedJavaScript={injectedJS}
          onLoadStart={() => setIsLoading(true)}
          onLoadEnd={() => setIsLoading(false)}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={false}
          scalesPageToFit={true}
          mixedContentMode="compatibility"
          originWhitelist={['http://*', 'https://*', 'upi://*', 'phonepe://*', 'gpay://*', 'paytmmp://*', 'tez://*', 'intent://*']}
          setSupportMultipleWindows={false}
          onNavigationStateChange={(navState) => {
            const { url } = navState;
            if (url) lastUrlRef.current = url;
            handleNavigationChange(navState);
          }}
          onShouldStartLoadWithRequest={(request) => {
            const { url } = request;
            const isExternalScheme =
              url.startsWith('upi://') ||
              url.startsWith('phonepe://') ||
              url.startsWith('gpay://') ||
              url.startsWith('paytmmp://') ||
              url.startsWith('tez://') ||
              url.startsWith('intent://');
            if (isExternalScheme) {
              Linking.canOpenURL(url).then((supported) => {
                if (supported) {
                  Linking.openURL(url);
                } else if (url.startsWith('intent://')) {
                  // Try extracting fallback URL from intent
                  const fallbackMatch = url.match(/S\.browser_fallback_url=([^;]+)/);
                  if (fallbackMatch) {
                    Linking.openURL(decodeURIComponent(fallbackMatch[1])).catch(() => {});
                  }
                }
              }).catch(() => {});
              return false;
            }
            return true;
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            // Ignore UPI scheme errors — the app was opened externally
            if (nativeEvent.description?.includes('ERR_UNKNOWN_URL_SCHEME')) {
              // Go back to the PayU page
              if (webViewRef.current) {
                webViewRef.current.goBack();
              }
              return;
            }
          }}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  headerSpacer: {
    width: 32,
  },
  webViewContainer: {
    flex: 1,
  },
  webView: {
    flex: 1,
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#6B7280',
  },
});

export default PayUCheckout;
