import { canSavePetProfileDraft } from './PetProfileEditor';

describe('canSavePetProfileDraft', () => {
  it('requires name and type', () => {
    expect(
      canSavePetProfileDraft({ name: 'Mochi', type: 'dog' }),
    ).toBe(true);
    expect(canSavePetProfileDraft({ name: ' ', type: 'dog' })).toBe(false);
    expect(canSavePetProfileDraft({ name: 'Mochi', type: null })).toBe(false);
  });
});
