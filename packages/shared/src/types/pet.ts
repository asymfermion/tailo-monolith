export type PetType = 'dog' | 'cat';

export type PetGender = 'male' | 'female' | 'unknown';

export interface Pet {
  id: string;
  name: string;
  type: PetType;
  gender?: PetGender;
  profilePhotoMediaId?: string;
}
