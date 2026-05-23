import {
  getPetBirthdayDayOptions,
  getPetBirthdayMonthOptions,
  getPetBirthdayYearOptions,
} from './formatPetBirthday';

describe('formatPetBirthday options', () => {
  it('lists 41 years ending at the current UTC year', () => {
    const currentYear = new Date().getUTCFullYear();
    const years = getPetBirthdayYearOptions();

    expect(years).toHaveLength(41);
    expect(years[0]?.value).toBe(currentYear);
    expect(years[years.length - 1]?.value).toBe(currentYear - 40);
  });

  it('lists 12 localized month labels', () => {
    const months = getPetBirthdayMonthOptions('en');

    expect(months).toHaveLength(12);
    expect(months[0]?.value).toBe(1);
    expect(months[11]?.value).toBe(12);
    expect(months[0]?.label.length).toBeGreaterThan(0);
  });

  it('limits day options to the month length', () => {
    expect(getPetBirthdayDayOptions(2024, 2)).toHaveLength(29);
    expect(getPetBirthdayDayOptions(2023, 2)).toHaveLength(28);
    expect(getPetBirthdayDayOptions(2024, 4)).toHaveLength(30);
    expect(getPetBirthdayDayOptions(2024, 1)).toHaveLength(31);
  });
});
