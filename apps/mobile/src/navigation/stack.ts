import type {
  INITIAL_ROUTE_NAME,
  RootRoute,
  RootRouteName,
  RootStackParamList,
} from './routes';

export type NavigationStack = RootRoute[];

export type NavigationAction =
  | {
      type: 'push';
      routeName: RootRouteName;
      params?: RootStackParamList[RootRouteName];
    }
  | {
      type: 'replace';
      routeName: RootRouteName;
      params?: RootStackParamList[RootRouteName];
    }
  | { type: 'pop' }
  | { type: 'popToRoot' };

export function createInitialStack(
  routeName: typeof INITIAL_ROUTE_NAME,
): NavigationStack {
  return [createRoute(routeName)];
}

export function navigationReducer(
  stack: NavigationStack,
  action: NavigationAction,
): NavigationStack {
  switch (action.type) {
    case 'push':
      return [
        ...stack,
        createRoute(action.routeName, action.params),
      ] as NavigationStack;
    case 'replace':
      return [
        ...stack.slice(0, -1),
        createRoute(action.routeName, action.params),
      ] as NavigationStack;
    case 'pop':
      return stack.length > 1 ? stack.slice(0, -1) : stack;
    case 'popToRoot':
      return stack.length > 0 ? [stack[0]!] : stack;
  }
}

function createRoute<RouteName extends RootRouteName>(
  name: RouteName,
  params?: RootStackParamList[RouteName],
): RootRoute {
  return {
    key: `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    params,
  } as RootRoute;
}
