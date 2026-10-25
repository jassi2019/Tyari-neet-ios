// Shared handle to the root navigator so non-screen code (the OTA update hook)
// can see which screen is on top. App.tsx creates the real ref and registers it
// here; this file deliberately imports nothing from @react-navigation so it
// stays free of that package's module-resolution type errors.

type RootNavigationLike = {
  isReady(): boolean;
  getCurrentRoute(): { name?: string } | undefined;
  addListener(event: 'state', callback: () => void): () => void;
  navigate?: (name: string, params?: object) => void;
};

let ref: RootNavigationLike | null = null;

export function registerNavigationRef(navigation: RootNavigationLike): void {
  ref = navigation;
}

export function currentRouteName(): string | undefined {
  if (!ref || !ref.isReady()) return undefined;
  return ref.getCurrentRoute()?.name;
}

// Navigate from non-screen code (e.g. the lesson viewer's footer). No-op until the
// navigator is ready.
export function navigateTo(name: string, params?: object): void {
  if (!ref || !ref.isReady() || !ref.navigate) return;
  try { ref.navigate(name, params); } catch {}
}

export function onNavigationStateChange(callback: () => void): () => void {
  if (!ref) return () => {};
  return ref.addListener('state', callback);
}
