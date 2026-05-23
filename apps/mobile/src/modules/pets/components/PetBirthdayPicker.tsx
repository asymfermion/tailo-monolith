import { useEffect, useMemo, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { composePetBirthdayIso, splitPetBirthdayIso } from '@tailo/shared';

import { t, useAppLocale } from '@/i18n';
import {
  birthdayIsoToDate,
  formatPetBirthdayLabel,
  getPetBirthdayDayOptions,
  getPetBirthdayMonthOptions,
  getPetBirthdayYearOptions,
} from '@/lib/formatPetBirthday';
import { useAppearance, useThemedStyles } from '@/lib/appearance';

import { createPetProfileEditorStyles } from './petProfileEditorStyles';

type PetBirthdayPickerProps = {
  value: string | null;
  onChange: (birthday: string | null) => void;
};

type BirthdayParts = {
  year: number;
  month: number;
  day: number;
};

function partsFromIso(iso: string | null): BirthdayParts | null {
  return splitPetBirthdayIso(iso);
}

function defaultDraftParts(): BirthdayParts {
  const fallback = birthdayIsoToDate(null);

  return {
    year: fallback.getUTCFullYear(),
    month: fallback.getUTCMonth() + 1,
    day: fallback.getUTCDate(),
  };
}

export function PetBirthdayPicker({ value, onChange }: PetBirthdayPickerProps) {
  const locale = useAppLocale();
  const insets = useSafeAreaInsets();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createPetProfileEditorStyles);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [draft, setDraft] = useState<BirthdayParts>(() => {
    return partsFromIso(value) ?? defaultDraftParts();
  });

  const selectedLabel = formatPetBirthdayLabel(value, locale);

  const monthOptions = useMemo(
    () => getPetBirthdayMonthOptions(locale),
    [locale],
  );
  const yearOptions = useMemo(() => getPetBirthdayYearOptions(), []);
  const dayOptions = useMemo(
    () => getPetBirthdayDayOptions(draft.year, draft.month),
    [draft.month, draft.year],
  );

  useEffect(() => {
    if (!isModalOpen) {
      return;
    }

    setDraft(partsFromIso(value) ?? defaultDraftParts());
  }, [isModalOpen, value]);

  useEffect(() => {
    const maxDay = dayOptions[dayOptions.length - 1]?.value ?? 31;

    if (draft.day > maxDay) {
      setDraft((current) => ({ ...current, day: maxDay }));
    }
  }, [dayOptions, draft.day]);

  function openPicker() {
    setDraft(partsFromIso(value) ?? defaultDraftParts());
    setIsModalOpen(true);
  }

  function applySelection() {
    onChange(
      composePetBirthdayIso({
        year: draft.year,
        month: draft.month,
        day: draft.day,
      }),
    );
    setIsModalOpen(false);
  }

  return (
    <>
      <View style={styles.pickerCard}>
        <Pressable
          accessibilityLabel={t('petProfile.birthdayLabel')}
          accessibilityRole="button"
          accessibilityState={{ expanded: isModalOpen }}
          style={({ pressed }) => [
            styles.pickerRow,
            pressed && styles.pickerRowPressed,
          ]}
          onPress={openPicker}
        >
          <Text style={styles.pickerRowLabel}>{selectedLabel}</Text>
          <Ionicons color={colors.textMuted} name="chevron-down" size={20} />
        </Pressable>
      </View>

      <Modal
        animationType="slide"
        transparent
        visible={isModalOpen}
        onRequestClose={() => setIsModalOpen(false)}
      >
        <View style={styles.modalContainer}>
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setIsModalOpen(false)}
          />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <View style={styles.modalActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  onChange(null);
                  setIsModalOpen(false);
                }}
              >
                <Text style={styles.modalActionMuted}>
                  {t('petProfile.birthdayClear')}
                </Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => setIsModalOpen(false)}
              >
                <Text style={styles.modalActionMuted}>
                  {t('common.cancel')}
                </Text>
              </Pressable>
              <Pressable accessibilityRole="button" onPress={applySelection}>
                <Text style={styles.modalActionPrimary}>
                  {t('common.dismissKeyboard')}
                </Text>
              </Pressable>
            </View>

            <View style={styles.datePickerContainer}>
              <BirthdayWheelColumn
                label={t('petProfile.birthdayMonthLabel')}
                options={monthOptions}
                selectedValue={draft.month}
                styles={styles}
                onSelect={(month) =>
                  setDraft((current) => ({ ...current, month }))
                }
              />
              <BirthdayWheelColumn
                label={t('petProfile.birthdayDayLabel')}
                options={dayOptions}
                selectedValue={draft.day}
                styles={styles}
                onSelect={(day) => setDraft((current) => ({ ...current, day }))}
              />
              <BirthdayWheelColumn
                label={t('petProfile.birthdayYearLabel')}
                options={yearOptions}
                selectedValue={draft.year}
                styles={styles}
                onSelect={(year) =>
                  setDraft((current) => ({ ...current, year }))
                }
              />
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

function BirthdayWheelColumn<T extends number>({
  label,
  options,
  selectedValue,
  styles,
  onSelect,
}: {
  label: string;
  options: { value: T; label: string }[];
  selectedValue: T;
  styles: ReturnType<typeof createPetProfileEditorStyles>;
  onSelect: (value: T) => void;
}) {
  return (
    <View style={styles.wheelColumn}>
      <Text style={styles.wheelColumnLabel}>{label}</Text>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        style={styles.wheelScroll}
      >
        {options.map((option) => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected: isSelected }}
              style={[
                styles.wheelOption,
                isSelected && styles.wheelOptionSelected,
              ]}
              onPress={() => onSelect(option.value)}
            >
              <Text
                style={[
                  styles.wheelOptionText,
                  isSelected && styles.wheelOptionTextSelected,
                ]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
