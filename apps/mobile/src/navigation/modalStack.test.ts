import { createEmptyModalStack, modalStackReducer } from './modalStack';

describe('modalStackReducer', () => {
  it('starts with an empty modal stack', () => {
    expect(createEmptyModalStack()).toEqual([]);
  });

  it('pushes modal routes onto the stack', () => {
    const stack = createEmptyModalStack();

    const nextStack = modalStackReducer(stack, {
      type: 'push',
      routeName: 'EventDetail',
      params: { localEventId: 'event-1' },
    });

    expect(nextStack).toHaveLength(1);
    expect(nextStack[0]?.name).toBe('EventDetail');
    expect(nextStack[0]?.params).toEqual({ localEventId: 'event-1' });
  });

  it('clears all modals on popAll', () => {
    let stack = createEmptyModalStack();
    stack = modalStackReducer(stack, { type: 'push', routeName: 'Capture' });
    stack = modalStackReducer(stack, {
      type: 'push',
      routeName: 'CapturePreview',
      params: { tempUri: 'file:///tmp.jpg', width: 1, height: 1 },
    });

    expect(modalStackReducer(stack, { type: 'popAll' })).toEqual([]);
  });
});
