import { formatMediaDetectionDebug } from './formatMediaDetectionDebug';

describe('formatMediaDetectionDebug', () => {
  it('formats pet type, scores, and candidate flag', () => {
    expect(
      formatMediaDetectionDebug({
        detectedPetType: 'dog',
        petConfidence: 0.876,
        overallScore: 0.91,
        isPetCandidate: true,
        detectionDebugLabel: null,
      }),
    ).toBe('dog · pet 0.88 · moment 0.91 · candidate');
  });

  it('shows none and dashes when detection is missing', () => {
    expect(
      formatMediaDetectionDebug({
        detectedPetType: null,
        petConfidence: null,
        overallScore: 0.5,
        isPetCandidate: false,
        detectionDebugLabel: null,
      }),
    ).toBe('none · pet — · moment 0.50 · not candidate');
  });

  it('appends the classifier debug label when present', () => {
    expect(
      formatMediaDetectionDebug({
        detectedPetType: 'cat',
        petConfidence: 0.62,
        overallScore: 0.7,
        isPetCandidate: true,
        detectionDebugLabel: 'AnimalLabel:cat 0.62',
      }),
    ).toBe('cat · pet 0.62 · moment 0.70 · candidate · AnimalLabel:cat 0.62');
  });
});
