import type { ModalRoute, ModalRouteName, ModalStackParamList } from './routes';

export type ModalStack = ModalRoute[];

export type ModalStackAction =
  | {
      type: 'push';
      routeName: ModalRouteName;
      params?: ModalStackParamList[ModalRouteName];
    }
  | {
      type: 'replace';
      routeName: ModalRouteName;
      params?: ModalStackParamList[ModalRouteName];
    }
  | { type: 'pop' }
  | { type: 'popAll' };

export function createEmptyModalStack(): ModalStack {
  return [];
}

export function modalStackReducer(
  stack: ModalStack,
  action: ModalStackAction,
): ModalStack {
  switch (action.type) {
    case 'push':
      return [
        ...stack,
        createModalRoute(action.routeName, action.params),
      ] as ModalStack;
    case 'replace':
      return stack.length === 0
        ? [createModalRoute(action.routeName, action.params)]
        : ([
            ...stack.slice(0, -1),
            createModalRoute(action.routeName, action.params),
          ] as ModalStack);
    case 'pop':
      return stack.length > 0 ? stack.slice(0, -1) : stack;
    case 'popAll':
      return [];
  }
}

function createModalRoute<RouteName extends ModalRouteName>(
  name: RouteName,
  params?: ModalStackParamList[RouteName],
): ModalRoute {
  return {
    key: `${name}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    params,
  } as ModalRoute;
}
