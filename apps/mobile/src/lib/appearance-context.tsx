import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import { ThemeProvider } from '@tourism/mobile-ui';
import {
  readAppearance,
  resolveScheme,
  saveAppearance,
  type AppearancePref,
} from './appearance';

interface AppearanceContextValue {
  /** What the user chose (`system` until they choose otherwise). */
  pref: AppearancePref;
  /** Applies immediately and persists; storage failures don't surface. */
  setPref(pref: AppearancePref): void;
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null);

/**
 * Owns the appearance preference AND mounts the themed tree with it — the two
 * belong together, since `ThemeProvider`'s `scheme` is the only thing the
 * preference controls. Renders nothing until the stored choice is read, so a
 * "light" user never sees a dark first frame (the native splash is still up).
 */
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const osScheme = useColorScheme();
  const [pref, setPrefState] = useState<AppearancePref | null>(null);

  useEffect(() => {
    readAppearance().then(setPrefState);
  }, []);

  const setPref = useCallback((next: AppearancePref) => {
    setPrefState(next);
    void saveAppearance(next);
  }, []);

  const value = useMemo(
    () => ({ pref: pref ?? 'system', setPref }),
    [pref, setPref],
  );

  if (pref === null) return null;

  return (
    <AppearanceContext.Provider value={value}>
      <ThemeProvider scheme={resolveScheme(pref, osScheme)}>
        {children}
      </ThemeProvider>
    </AppearanceContext.Provider>
  );
}

export function useAppearance(): AppearanceContextValue {
  const value = useContext(AppearanceContext);
  if (!value)
    throw new Error('useAppearance must be used inside <AppearanceProvider>');
  return value;
}
