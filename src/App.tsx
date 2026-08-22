import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StatusBar } from 'expo-status-bar';
import * as NavigationBar from 'expo-navigation-bar';
import React, { useEffect } from 'react';
import { Platform } from 'react-native';
import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { enableScreens } from 'react-native-screens';

import { BottomNavProvider } from './components/BottomNavBar/BottomNavBar';
import ErrorBoundary from './components/ErrorBoundary';
import ErrorFallback from './components/ErrorFallback';
import { AuthProvider } from './contexts/AuthContext';
import { FeatureProvider } from './contexts/FeatureContext';
import RootNavigator from './navigation/RootNavigator';

enableScreens();

const queryClient = new QueryClient();

function AppShell() {

  useEffect(() => {
    if (Platform.OS === 'android') {
      // Auto-hide navigation bar, show on swipe
      NavigationBar.setBehaviorAsync('overlay-swipe').catch(() => {});
      NavigationBar.setVisibilityAsync('hidden').catch(() => {});
    }
  }, []);

  return <RootNavigator />;
}

export default function App() {
  return (
    <ErrorBoundary FallbackComponent={ErrorFallback}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <FeatureProvider>
            <BottomNavProvider>
              <SafeAreaProvider>
                <NavigationContainer>
                  <AppShell />
                  <StatusBar style="auto" />
                </NavigationContainer>
              </SafeAreaProvider>
            </BottomNavProvider>
          </FeatureProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
