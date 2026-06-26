import { forwardRef, useRef } from 'react';
import { Platform, TextInput, type TextInputProps } from 'react-native';

import { KeyboardDismissInputAccessoryView } from '@/components/KeyboardDismissAccessory';

let keyboardAccessoryCounter = 0;

export function createKeyboardAccessoryNativeId(): string {
  keyboardAccessoryCounter += 1;

  return `tailo-keyboard-${keyboardAccessoryCounter}`;
}

export function getAppTextInputKeyboardProps({
  keyboardDismissAccessory = true,
  returnKeyType,
  blurOnSubmit,
  multiline,
}: {
  keyboardDismissAccessory?: boolean;
  returnKeyType?: TextInputProps['returnKeyType'];
  blurOnSubmit?: boolean;
  multiline?: boolean;
}): Pick<TextInputProps, 'returnKeyType' | 'blurOnSubmit'> {
  if (!keyboardDismissAccessory) {
    return {
      ...(returnKeyType !== undefined ? { returnKeyType } : {}),
      ...(blurOnSubmit !== undefined ? { blurOnSubmit } : {}),
    };
  }

  return {
    ...(returnKeyType !== undefined || !multiline
      ? { returnKeyType: returnKeyType ?? 'done' }
      : {}),
    blurOnSubmit: blurOnSubmit ?? !multiline,
  };
}

export type AppTextInputProps = TextInputProps & {
  /**
   * When true (default), fields use an iOS Done toolbar and Android fallback bar.
   * Single-line fields default to a Done return key; multiline fields keep Return
   * for new lines and use the toolbar/bar for dismissal.
   */
  keyboardDismissAccessory?: boolean;
};

export const AppTextInput = forwardRef<TextInput, AppTextInputProps>(
  function AppTextInput(
    {
      inputAccessoryViewID,
      keyboardDismissAccessory = true,
      returnKeyType,
      blurOnSubmit,
      multiline,
      ...rest
    },
    ref,
  ) {
    const generatedAccessoryIdRef = useRef<string | null>(null);

    if (
      keyboardDismissAccessory &&
      Platform.OS === 'ios' &&
      !inputAccessoryViewID &&
      generatedAccessoryIdRef.current === null
    ) {
      generatedAccessoryIdRef.current = createKeyboardAccessoryNativeId();
    }

    const resolvedAccessoryViewId =
      inputAccessoryViewID ??
      (keyboardDismissAccessory && Platform.OS === 'ios'
        ? (generatedAccessoryIdRef.current ?? undefined)
        : undefined);

    const keyboardProps = getAppTextInputKeyboardProps({
      keyboardDismissAccessory,
      returnKeyType,
      blurOnSubmit,
      multiline,
    });

    return (
      <>
        {resolvedAccessoryViewId &&
        keyboardDismissAccessory &&
        !inputAccessoryViewID ? (
          <KeyboardDismissInputAccessoryView
            nativeID={resolvedAccessoryViewId}
          />
        ) : null}
        <TextInput
          ref={ref}
          multiline={multiline}
          {...rest}
          {...keyboardProps}
          inputAccessoryViewID={resolvedAccessoryViewId}
        />
      </>
    );
  },
);
