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
});
