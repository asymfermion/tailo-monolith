import {
  isPetCandidateForProfile,
  matchesProfilePetType,
} from './matchesProfilePetType';

describe('matchesProfilePetType', () => {
  it('allows any type when profile type is not set', () => {
    expect(matchesProfilePetType('dog', null)).toBe(true);
    expect(matchesProfilePetType(null, undefined)).toBe(true);
  });

  it('requires an exact type match when profile type is set', () => {
    expect(matchesProfilePetType('dog', 'dog')).toBe(true);
    expect(matchesProfilePetType('cat', 'dog')).toBe(false);
    expect(matchesProfilePetType(null, 'cat')).toBe(false);
  });
});

describe('isPetCandidateForProfile', () => {
  it('rejects candidates that do not match the profile pet type', () => {
    expect(isPetCandidateForProfile(true, 'cat', 'dog')).toBe(false);
    expect(isPetCandidateForProfile(true, 'dog', 'dog')).toBe(true);
  });
});
