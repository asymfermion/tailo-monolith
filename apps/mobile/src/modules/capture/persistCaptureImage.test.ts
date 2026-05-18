import { persistCaptureImage } from './persistCaptureImage';

describe('persistCaptureImage', () => {
  it('copies the temp capture into app document storage', async () => {
    const copyAsync = jest.fn().mockResolvedValue(undefined);
    const makeDirectoryAsync = jest.fn().mockResolvedValue(undefined);

    await expect(
      persistCaptureImage('file:///tmp/photo.jpg', {
        documentRoot: 'file:///documents/',
        generateId: () => 'in_app_test',
        copyFile: copyAsync,
        makeDirectory: makeDirectoryAsync,
      }),
    ).resolves.toEqual({
      localAssetId: 'in_app_test',
      uri: 'file:///documents/captures/in_app_test.jpg',
    });

    expect(makeDirectoryAsync).toHaveBeenCalledWith(
      'file:///documents/captures',
      { intermediates: true },
    );
    expect(copyAsync).toHaveBeenCalledWith({
      from: 'file:///tmp/photo.jpg',
      to: 'file:///documents/captures/in_app_test.jpg',
    });
  });
});
