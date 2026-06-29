import { evaluateNativeClassification } from './evaluateNativeResult';

describe('evaluateNativeClassification', () => {
  it('accepts dog and cat labels above the confidence floor', () => {
    expect(evaluateNativeClassification('dog', 0.82)).toEqual({
      isPetCandidate: true,
      detectedPetType: 'dog',
      confidence: 0.82,
      detectionSource: 'native',
      detectionDebugLabel: 'dog',
      detectedBreed: null,
    });
  });

  it('accepts breed when provided', () => {
    expect(
      evaluateNativeClassification('dog', 0.82, 'golden_retriever'),
    ).toEqual({
      isPetCandidate: true,
      detectedPetType: 'dog',
      confidence: 0.82,
      detectionSource: 'native',
      detectionDebugLabel: 'dog',
      detectedBreed: 'golden_retriever',
    });
  });

  it('rejects low-confidence animal labels', () => {
    expect(evaluateNativeClassification('cat', 0.0005)).toEqual({
      isPetCandidate: false,
      detectedPetType: null,
      confidence: 0.0005,
      detectionSource: 'native',
      detectionDebugLabel: 'cat_low_confidence_0.001',
      detectedBreed: null,
    });
  });

  it('rejects other labels regardless of confidence', () => {
    expect(evaluateNativeClassification('other', 0.99)).toEqual({
      isPetCandidate: false,
      detectedPetType: null,
      confidence: 0.99,
      detectionSource: 'native',
      detectionDebugLabel: 'other',
      detectedBreed: null,
    });
  });
});
