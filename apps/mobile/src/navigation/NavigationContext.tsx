import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import { createEmptyModalStack, modalStackReducer } from './modalStack';
import type { MainTabId, ModalRouteName, ModalStackParamList } from './routes';
import { INITIAL_MAIN_TAB } from './routes';

export type OpenSettingsOptions = {
  section?: 'account';
};

type NavigationContextValue = {
  activeTab: MainTabId;
  setActiveTab: (tab: MainTabId) => void;
  openSettings: (options?: OpenSettingsOptions) => void;
  modalStack: ReturnType<typeof createEmptyModalStack>;
  push: <RouteName extends ModalRouteName>(
    routeName: RouteName,
    params?: ModalStackParamList[RouteName],
  ) => void;
  pop: () => void;
  popToRoot: () => void;
  canGoBack: boolean;
  captureCompletedNonce: number;
  completeCapture: () => void;
  /** Bumped when moment data changes (reorder, edits) so the timeline reloads. */
  timelineChangedNonce: number;
  notifyTimelineChanged: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [activeTab, setActiveTabState] = useState<MainTabId>(INITIAL_MAIN_TAB);
  const [modalStack, dispatchModal] = useReducer(
    modalStackReducer,
    undefined,
    createEmptyModalStack,
  );
  const [captureCompletedNonce, setCaptureCompletedNonce] = useState(0);
  const [timelineChangedNonce, setTimelineChangedNonce] = useState(0);

  const setActiveTab = useCallback((tab: MainTabId) => {
    setActiveTabState(tab);
  }, []);

  const push = useCallback(
    <RouteName extends ModalRouteName>(
      routeName: RouteName,
      params?: ModalStackParamList[RouteName],
    ) => {
      dispatchModal({ type: 'push', routeName, params });
    },
    [],
  );

  const pop = useCallback(() => {
    dispatchModal({ type: 'pop' });
  }, []);

  const popToRoot = useCallback(() => {
    dispatchModal({ type: 'popAll' });
  }, []);

  const openSettings = useCallback((options?: OpenSettingsOptions) => {
    setActiveTabState('Settings');

    if (options?.section === 'account') {
      dispatchModal({ type: 'push', routeName: 'AccountSettings' });
    }
  }, []);

  const completeCapture = useCallback(() => {
    setCaptureCompletedNonce((value) => value + 1);
    setActiveTabState('Timeline');
    dispatchModal({ type: 'popAll' });
  }, []);

  const notifyTimelineChanged = useCallback(() => {
    setTimelineChangedNonce((value) => value + 1);
  }, []);

  const value = useMemo(
    () => ({
      activeTab,
      setActiveTab,
      openSettings,
      modalStack,
      push,
      pop,
      popToRoot,
      canGoBack: modalStack.length > 0,
      captureCompletedNonce,
      completeCapture,
      timelineChangedNonce,
      notifyTimelineChanged,
    }),
    [
      activeTab,
      captureCompletedNonce,
      completeCapture,
      modalStack,
      notifyTimelineChanged,
      openSettings,
      pop,
      popToRoot,
      push,
      setActiveTab,
      timelineChangedNonce,
    ],
  );

  return (
    <NavigationContext.Provider value={value}>
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);

  if (!context) {
    throw new Error('useNavigation must be used within NavigationProvider');
  }

  return context;
}
