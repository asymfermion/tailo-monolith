import { getAppTextInputKeyboardProps } from './AppTextInput';

describe('getAppTextInputKeyboardProps', () => {
  it('defaults to done return key and blur-on-submit when dismiss is enabled', () => {
    expect(getAppTextInputKeyboardProps({})).toEqual({
      returnKeyType: 'done',
      blurOnSubmit: true,
    });
  });

  it('keeps return available for multiline fields while the accessory handles dismissal', () => {
    expect(getAppTextInputKeyboardProps({ multiline: true })).toEqual({
      blurOnSubmit: false,
    });
  });

  it('does not override explicit return key or blur settings', () => {
    expect(
      getAppTextInputKeyboardProps({
        returnKeyType: 'next',
        blurOnSubmit: false,
      }),
    ).toEqual({
      returnKeyType: 'next',
      blurOnSubmit: false,
    });
  });

  it('leaves props unset when keyboard dismiss is disabled', () => {
    expect(
      getAppTextInputKeyboardProps({ keyboardDismissAccessory: false }),
    ).toEqual({});
  });
});
