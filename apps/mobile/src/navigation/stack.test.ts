import { INITIAL_ROUTE_NAME } from './routes';
import { createInitialStack, navigationReducer } from './stack';

describe('navigationReducer', () => {
  it('starts on the configured initial route', () => {
    const stack = createInitialStack(INITIAL_ROUTE_NAME);

    expect(stack).toHaveLength(1);
    expect(stack[0]?.name).toBe('Home');
  });

  it('keeps the root route when popping the final screen', () => {
    const stack = createInitialStack(INITIAL_ROUTE_NAME);

    const nextStack = navigationReducer(stack, { type: 'pop' });

    expect(nextStack).toBe(stack);
  });

  it('replaces the active route without changing stack depth', () => {
    const stack = createInitialStack(INITIAL_ROUTE_NAME);

    const nextStack = navigationReducer(stack, {
      type: 'replace',
      routeName: 'Home',
    });

    expect(nextStack).toHaveLength(1);
    expect(nextStack[0]?.name).toBe('Home');
    expect(nextStack[0]?.key).not.toBe(stack[0]?.key);
  });

  it('returns to the root route', () => {
    let stack = createInitialStack(INITIAL_ROUTE_NAME);
    stack = navigationReducer(stack, {
      type: 'push',
      routeName: 'Capture',
    });
    stack = navigationReducer(stack, {
      type: 'push',
      routeName: 'CapturePreview',
      params: { tempUri: 'file:///tmp.jpg', width: 1, height: 1 },
    });

    const nextStack = navigationReducer(stack, { type: 'popToRoot' });

    expect(nextStack).toHaveLength(1);
    expect(nextStack[0]?.name).toBe('Home');
  });

  it('pushes event detail onto the stack', () => {
    const stack = createInitialStack(INITIAL_ROUTE_NAME);

    const nextStack = navigationReducer(stack, {
      type: 'push',
      routeName: 'EventDetail',
      params: { localEventId: 'event-1' },
    });

    expect(nextStack).toHaveLength(2);
    expect(nextStack[1]?.name).toBe('EventDetail');
    expect(nextStack[1]?.params).toEqual({ localEventId: 'event-1' });
  });
});
