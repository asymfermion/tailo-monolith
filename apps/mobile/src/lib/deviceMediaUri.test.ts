import { isDeviceMediaUri, isRemoteMediaUri } from './deviceMediaUri';

describe('deviceMediaUri', () => {
  it('detects on-device photo library URIs', () => {
    expect(isDeviceMediaUri('ph://asset-1')).toBe(true);
    expect(isDeviceMediaUri('file:///var/mobile/photo.jpg')).toBe(true);
    expect(isDeviceMediaUri('assets-library://asset-1')).toBe(true);
  });

  it('detects remote media URIs', () => {
    expect(isRemoteMediaUri('https://cdn.example.com/thumb.jpg')).toBe(true);
    expect(isRemoteMediaUri('http://cdn.example.com/thumb.jpg')).toBe(true);
  });

  it('does not treat remote URLs as device URIs', () => {
    expect(isDeviceMediaUri('https://cdn.example.com/thumb.jpg')).toBe(false);
  });
});
