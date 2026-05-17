# TailoPetClassifier

Local Expo module for iOS dog/cat image classification.

The Swift module first looks for a compiled Core ML model named
`TailoPetClassifier.mlmodelc` in the app bundle. If no bundled model is present,
it uses Apple Vision's on-device animal detector (`VNRecognizeAnimalsRequest`)
for cats and dogs. General image classification is not used because it
produces too many false positives.

To use a custom model later, add `TailoPetClassifier.mlmodel` to this module or
the iOS target, then rebuild the Expo dev client so Xcode compiles it into
`.mlmodelc`.

Expected model output:

- Classification labels containing `dog`, `cat`, or another label.
- Labels outside dog/cat are mapped to `other`.

JavaScript API:

```ts
classify(uri: string): Promise<{ label: 'dog' | 'cat' | 'other'; confidence: number }>
```

This module is not available in Expo Go. The JS detector falls back to the
heuristic detector when the native module is unavailable.
