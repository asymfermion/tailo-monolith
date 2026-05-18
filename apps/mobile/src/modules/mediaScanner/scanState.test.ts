import {
  getLastScanTimestamp,
  LAST_SCAN_TIMESTAMP_KEY,
  setLastScanTimestamp,
} from './scanState';

describe('scanState', () => {
  it('stores and loads the last scan timestamp', async () => {
    const storage = {
      values: new Map<string, string>(),
      getItemAsync(key: string) {
        return Promise.resolve(this.values.get(key) ?? null);
      },
      setItemAsync(key: string, value: string) {
        this.values.set(key, value);
        return Promise.resolve();
      },
      deleteItemAsync(key: string) {
        this.values.delete(key);
        return Promise.resolve();
      },
    };

    await setLastScanTimestamp('2026-05-17T10:00:00.000Z', storage);

    expect(storage.values.get(LAST_SCAN_TIMESTAMP_KEY)).toBe(
      '2026-05-17T10:00:00.000Z',
    );
    await expect(getLastScanTimestamp(storage)).resolves.toBe(
      '2026-05-17T10:00:00.000Z',
    );
  });
});
