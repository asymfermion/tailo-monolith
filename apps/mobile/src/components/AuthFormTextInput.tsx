import { forwardRef, memo, useCallback, useRef, type RefObject } from 'react';
import type {
  StyleProp,
  TextInput,
  TextInputProps,
  TextStyle,
} from 'react-native';

import { AppTextInput } from '@/components/AppTextInput';

import {
  authFormFieldUsesKeyboardAccessory,
  getAuthFormFieldProps,
  type AuthFormFieldKind,
} from './authFormFieldProps';

export type AuthFormTextInputProps = Omit<
  TextInputProps,
  'defaultValue' | 'onChangeText' | 'value'
> & {
  kind: AuthFormFieldKind;
  placeholderTextColor: string;
  style: StyleProp<TextStyle>;
  valueRef: RefObject<string>;
  /** Notifies parent when the field changes so submit buttons can enable/disable. */
  onValueChange?: (value: string) => void;
  /** @default true — set false only when a screen needs native return-key-only behavior. */
  keyboardDismissAccessory?: boolean;
};

function authFormTextInputPropsAreEqual(
  prev: AuthFormTextInputProps,
  next: AuthFormTextInputProps,
): boolean {
  return (
    prev.kind === next.kind &&
    prev.placeholder === next.placeholder &&
    prev.placeholderTextColor === next.placeholderTextColor &&
    prev.style === next.style &&
    prev.valueRef === next.valueRef &&
    prev.onValueChange === next.onValueChange
  );
}

export const AuthFormTextInput = memo(
  forwardRef<TextInput, AuthFormTextInputProps>(function AuthFormTextInput(
    {
      kind,
      keyboardDismissAccessory,
      placeholderTextColor,
      style,
      valueRef,
      onValueChange,
      ...rest
    },
    ref,
  ) {
    const initialDefaultValueRef = useRef(valueRef.current);
    const onChangeText = useCallback(
      (text: string) => {
        valueRef.current = text;
        onValueChange?.(text);
      },
      [onValueChange, valueRef],
    );

    const fieldProps = getAuthFormFieldProps(kind);

    return (
      <AppTextInput
        ref={ref}
        {...fieldProps}
        {...rest}
        defaultValue={initialDefaultValueRef.current}
        keyboardDismissAccessory={
          keyboardDismissAccessory ?? authFormFieldUsesKeyboardAccessory(kind)
        }
        placeholderTextColor={placeholderTextColor}
        style={style}
        onChangeText={onChangeText}
      />
    );
  }),
  authFormTextInputPropsAreEqual,
);
