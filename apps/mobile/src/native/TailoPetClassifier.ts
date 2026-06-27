import { requireOptionalNativeModule } from 'expo-modules-core';

export type NativePetClassifierLabel = 'dog' | 'cat' | 'other';

export type NativePetClassifierResult = {
  label: NativePetClassifierLabel;
  confidence: number;
  breed?: string;
};

type TailoPetClassifierModule = {
  classify: (uri: string) => Promise<NativePetClassifierResult>;
};

const nativeModule =
  requireOptionalNativeModule<TailoPetClassifierModule>('TailoPetClassifier');

export function isNativePetClassifierAvailable(): boolean {
  return nativeModule != null;
}

export async function classifyPetImage(
  uri: string,
): Promise<NativePetClassifierResult> {
  if (!nativeModule) {
    throw new Error('TailoPetClassifier native module is not available.');
  }

  return nativeModule.classify(uri);
}
