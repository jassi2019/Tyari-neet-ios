import React, { Component, ReactNode } from 'react';
import * as Updates from 'expo-updates';

interface Props {
  children: ReactNode;
  FallbackComponent: React.ComponentType<{ error: Error; resetError: () => void }>;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

// Once per app session: if the running bundle crashes and a NEWER OTA exists,
// pull it and reload so users self-heal onto the fixed version. Reload only
// happens when a newer update is available, so a crashing bundle can never
// reload-loop onto itself.
let selfHealAttempted = false;

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.attemptSelfHeal();
  }

  attemptSelfHeal = async (force = false) => {
    if (__DEV__ || !Updates.isEnabled) return;
    if (selfHealAttempted && !force) return;
    selfHealAttempted = true;
    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (e) {
      // Offline or updates unavailable — fall through to a plain reset.
    }
  };

  // Try again: first look for a newer update (a crash that repeats every time is
  // usually a bug that has already been fixed in a newer bundle), and only if
  // there is none, re-render. The wait is capped so the button never hangs.
  resetError = async () => {
    await Promise.race([
      this.attemptSelfHeal(true),
      new Promise((resolve) => setTimeout(resolve, 8000)),
    ]);
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      const { FallbackComponent } = this.props;
      return <FallbackComponent error={this.state.error} resetError={this.resetError} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
