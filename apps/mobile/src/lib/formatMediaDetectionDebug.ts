import type { TimelineEventMedia } from '@/types';

type MediaDetectionFields = Pick<
  TimelineEventMedia,
  | 'detectedPetType'
  | 'petConfidence'
  | 'overallScore'
  | 'isPetCandidate'
  | 'detectionDebugLabel'
>;

/** One-line dev label for classifier output on a timeline photo. */
export function formatMediaDetectionDebug(media: MediaDetectionFields): string {
  const petType = media.detectedPetType ?? 'none';
  const petScore =
    media.petConfidence == null ? '—' : media.petConfidence.toFixed(2);
  const momentScore = media.overallScore.toFixed(2);
  const candidate = media.isPetCandidate ? 'candidate' : 'not candidate';
  const base = `${petType} · pet ${petScore} · moment ${momentScore} · ${candidate}`;

  if (!media.detectionDebugLabel) {
    return base;
  }

  return `${base} · ${media.detectionDebugLabel}`;
}
