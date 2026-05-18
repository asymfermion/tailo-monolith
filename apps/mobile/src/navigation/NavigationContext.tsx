import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  useState,
  type ReactNode,
} from 'react';

import { INITIAL_ROUTE_NAME } from './routes';
import type { RootRouteName, RootStackParamList } from './routes';
import {
  createInitialStack,
  navigationReducer,
  type NavigationStack,
} from './stack';

type NavigationContextValue = {
  stack: NavigationStack;
  push: <RouteName extends RootRouteName>(
    routeName: RouteName,
    params?: RootStackParamList[RouteName],
  ) => void;
  pop: () => void;
  popToRoot: () => void;
  canGoBack: boolean;
  captureCompletedNonce: number;
  completeCapture: () => void;
};

const NavigationContext = createContext<NavigationContextValue | null>(null);

export function NavigationProvider({ children }: { children: ReactNode }) {
  const [stack, dispatch] = useReducer(
    navigationReducer,
    INITIAL_ROUTE_NAME,
    createInitialStack,
  );
  const [captureCompletedNonce, setCaptureCompletedNonce] = useState(0);

  const push = useCallback(
    <RouteName extends RootRouteName>(
      routeName: RouteName,
      params?: RootStackParamList[RouteName],
    ) => {
      dispatch({ type: 'push', routeName, params });
    },
    [],
  );

  const pop = useCallback(() => {
    dispatch({ type: 'pop' });
  }, []);

  const popToRoot = useCallback(() => {
    dispatch({ type: 'popToRoot' });
  }, []);

  const completeCapture = useCallback(() => {
    setCaptureCompletedNonce((value) => value + 1);
    dispatch({ type: 'popToRoot' });
  }, []);

  const value = useMemo(
    () => ({
      stack,
      push,
      pop,
      popToRoot,
      canGoBack: stack.length > 1,
      captureCompletedNonce,
      completeCapture,
    }),
    [captureCompletedNonce, completeCapture, pop, popToRoot, push, stack],
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
