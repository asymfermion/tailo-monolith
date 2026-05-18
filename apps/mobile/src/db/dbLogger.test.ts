import { formatDbError, isForeignKeyConstraintError } from './dbLogger';

describe('dbLogger', () => {
  it('formats nested Error causes', () => {
    const error = new Error('Call to function finalizeAsync has failed', {
      cause: new Error('FOREIGN KEY constraint failed'),
    });

    expect(formatDbError(error)).toMatchObject({
      message: 'Call to function finalizeAsync has failed',
      cause: {
        message: 'FOREIGN KEY constraint failed',
      },
    });
  });

  it('detects foreign key constraint messages', () => {
    expect(
      isForeignKeyConstraintError(
        new Error('finalizeAsync failed', {
          cause: new Error('Error code 19: FOREIGN KEY constraint failed'),
        }),
      ),
    ).toBe(true);
  });
});
