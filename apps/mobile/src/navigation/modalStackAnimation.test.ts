import {
  pruneSeenModalKeys,
  shouldAnimateModalEntry,
} from './modalStackAnimation';
import type { ModalRoute } from './routes';

function route(name: ModalRoute['name'], key: string): ModalRoute {
  return { key, name, params: undefined } as ModalRoute;
}

describe('modalStackAnimation', () => {
  it('animates the first time a modal key becomes visible', () => {
    expect(shouldAnimateModalEntry('account-1', new Set())).toBe(true);
  });

  it('does not animate when returning to a modal that stayed in the stack', () => {
    expect(shouldAnimateModalEntry('account-1', new Set(['account-1']))).toBe(
      false,
    );
  });

  it('drops seen keys for modals removed from the stack', () => {
    const stack = [route('AccountSettings', 'account-1')];
    const nextSeenKeys = pruneSeenModalKeys(
      stack,
      new Set(['account-1', 'login-1']),
    );

    expect(nextSeenKeys).toEqual(new Set(['account-1']));
  });
});
