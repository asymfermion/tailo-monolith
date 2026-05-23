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
    returnKeyType: returnKeyType ?? 'done',
    blurOnSubmit: blurOnSubmit ?? true,
  };
}

export type AppTextInputProps = TextInputProps & {
  /**
   * When true (default), fields use returnKeyType "done" and an iOS Done toolbar.
   * Set false for auth email/password fields that use next/done return keys explicitly.
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
