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

  attemptSelfHeal = async () => {
    if (selfHealAttempted || __DEV__) return;
    selfHealAttempted = true;
    try {
      const check = await Updates.checkForUpdateAsync();
      if (check.isAvailable) {
        await Updates.fetchUpdateAsync();
        await Updates.reloadAsync();
      }
    } catch (e) {
      // Offline or updates unavailable — user still has the TRY AGAIN button.
    }
  };

  resetError = () => {
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
