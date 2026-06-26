import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { Ionicons } from '@expo/vector-icons';
import {
  ActionSheetIOS,
  Alert,
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';

import { AppTextInput } from '@/components/AppTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

import {
  AuthButtonIcon,
  type AuthButtonIconKind,
} from '@/components/AuthButtonIcon';
import {
  AuthHeroCollage,
  AuthLegalCopy,
  AuthWordmark,
} from '@/components/AuthBranding';
import { spacing } from '@/constants/theme';
import { getFontFamilyForStyle } from '@/constants/typography';
import {
  useAppearance,
  useThemedStyles,
  type AppearanceContextValue,
} from '@/lib/appearance';
import { ModalBackButton } from '@/navigation/components/ModalBackButton';
import {
  getModalHeaderTopInset,
  getTabScreenTopPadding,
} from '@/navigation/modalHeaderInset';
import { useNavigation } from '@/navigation/NavigationContext';
import {
  formatPetOptionPhotoCount,
  getOnboardingPipelineTitle,
  getPetTypeStepTitle,
  t,
} from '@/i18n';
import { getDatabase } from '@/db';
import {
  getDetectedPetOptions,
  type DetectedPetOption,
} from '@/db/detectedPetOptions';
import {
  getProfilePhotoSuggestions,
  type ProfilePhotoSuggestion,
} from '@/db/profilePhotoSuggestion';
import type {
  OnboardingCompletedFlags,
  OnboardingState,
  OnboardingStep,
} from '@/modules/auth';
import { canContinueOnboardingScan } from '@/modules/auth/canContinueOnboardingScan';
import {
  isRemoteAuthConfigured,
  resetOnboardingForAccountSignInIntent,
  useAuthAccountStatus,
} from '@/modules/auth';
import {
  handleOnboardingSocialSignInResult,
  runSocialSignIn,
  type SocialSignInProvider,
} from '@/modules/auth/socialSignInFlow';
import { useBlockingAuthAction } from '@/modules/auth/useBlockingAuthAction';
import { shouldShowAccountActionsOnWelcome } from '@/modules/auth/onboardingWelcomeActions';
import {
  canScanPhotos,
  runOnboardingPetTypeTopUp,
  shouldEnableHistoricalScan,
  usePhotoAccess,
} from '@/modules/mediaScanner';
import {
  getScanPipelineSteps,
  type ScanPipelineStep,
} from '@/modules/mediaScanner/scanProgress';
import {
  loadLocalPetProfile,
  saveLocalPetProfile,
  saveSelectedPetType,
  type LocalPetType,
} from '@/modules/pets';
import { logTailo } from '@/lib/tailoLogger';
import {
  defaultWelcomeLayoutMetrics,
  getAuthHeroScrollPaddingTop,
  getAuthTitleMetrics,
  getWelcomeLayoutMetrics,
  type WelcomeLayoutMetrics,
} from '@/lib/authWelcomeLayout';

/** Set true to show the privacy consent checkbox on onboarding welcome. */
const SHOW_WELCOME_PRIVACY_CONSENT = false;

const WelcomeLayoutContext = createContext<WelcomeLayoutMetrics>(
  defaultWelcomeLayoutMetrics,
);

function useWelcomeLayoutMetrics() {
  return useContext(WelcomeLayoutContext);
}

type OnboardingScreenProps = {
  anonymousUserId: string;
  onboardingState: OnboardingState;
  onComplete: () => Promise<void>;
  onStepChange: (
    step: OnboardingStep,
    completedFlags?: Partial<OnboardingCompletedFlags>,
  ) => Promise<void>;
};

function createOnboardingStyles({
  colors,
  getFontFamily,
}: AppearanceContextValue) {
  return {
    screen: {
      backgroundColor: colors.surface,
      flex: 1,
    },
    container: {
      flexGrow: 1,
      backgroundColor: colors.surface,
      justifyContent: 'flex-start' as const,
      paddingHorizontal: spacing.lg,
    },
    navigationHeader: {
      backgroundColor: colors.surface,
      paddingHorizontal: spacing.lg,
    },
    stepHeader: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      flexDirection: 'row' as const,
      paddingHorizontal: spacing.lg,
    },
    stepHeaderBack: {
      flexShrink: 0 as const,
      width: 44,
    },
    stepHeaderCenter: {
      alignItems: 'center' as const,
      flex: 1,
    },
    stepHeaderEnd: {
      flexShrink: 0 as const,
      width: 44,
    },
    stepHeaderWordmark: {
      height: 39,
      width: 92,
    },
    panel: {
      paddingTop: 14,
    },
    welcomePanel: {
      alignSelf: 'center' as const,
      maxWidth: 520,
      paddingTop: spacing.sm,
      width: '100%' as const,
    },
    welcomeLogo: {
      alignSelf: 'center' as const,
      height: 38,
      marginBottom: spacing.xs,
      width: 96,
    },
    welcomeHero: {
      alignSelf: 'center' as const,
      height: 240,
      marginHorizontal: -spacing.md,
      width: '108%' as const,
    },
    welcomeHeroCollage: {
      marginBottom: 12,
      marginTop: 0,
    },
    welcomeTitle: {
      color: colors.text,
      fontFamily: getFontFamilyForStyle('elegant', '500'),
      fontSize: 38,
      fontWeight: '500' as const,
      lineHeight: 41,
      marginTop: spacing.xs,
    },
    welcomeText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 16,
      lineHeight: 22,
      marginTop: spacing.xs,
    },
    welcomeActions: {
      gap: 6,
      marginTop: spacing.sm,
    },
    welcomePrimaryButton: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: colors.text,
      borderRadius: 999,
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      minHeight: 56,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      position: 'relative' as const,
    },
    welcomeButtonIconSlot: {
      alignItems: 'center' as const,
      bottom: 0,
      justifyContent: 'center' as const,
      left: spacing.lg,
      position: 'absolute' as const,
      top: 0,
      width: 40,
    },
    welcomeButtonTextSlot: {
      alignItems: 'center' as const,
      justifyContent: 'center' as const,
      paddingHorizontal: 54,
      width: '100%' as const,
    },
    welcomePrimaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    welcomeOutlineButton: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: 'rgba(255, 253, 249, 0.5)',
      borderColor: colors.timelineDivider,
      borderRadius: 999,
      borderWidth: 1,
      flexDirection: 'row' as const,
      justifyContent: 'center' as const,
      minHeight: 50,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.sm,
      position: 'relative' as const,
    },
    welcomeOutlineButtonText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    welcomeSignInButton: {
      alignItems: 'center' as const,
      alignSelf: 'center' as const,
      minHeight: 28,
      justifyContent: 'center' as const,
      paddingHorizontal: spacing.md,
    },
    welcomeSignInText: {
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      textAlign: 'center' as const,
    },
    welcomeSignInLink: {
      fontFamily: getFontFamily('600'),
      fontWeight: '600' as const,
      textDecorationLine: 'underline' as const,
    },
    welcomePrivacyRow: {
      alignItems: 'center' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      justifyContent: 'center' as const,
      marginTop: spacing.sm,
      paddingHorizontal: spacing.md,
    },
    welcomePrivacyText: {
      color: colors.text,
      flex: 1,
      fontFamily: getFontFamily('400'),
      fontSize: 12,
      lineHeight: 17,
      textAlign: 'center' as const,
    },
    welcomePrivacyLink: {
      textDecorationLine: 'underline' as const,
    },
    welcomeLegal: {
      marginTop: spacing.xs,
    },
    eyebrow: {
      color: colors.accent,
      fontFamily: getFontFamily('700'),
      fontSize: 12,
      fontWeight: '700' as const,
      textTransform: 'uppercase' as const,
    },
    title: {
      color: colors.text,
      fontFamily: getFontFamilyForStyle('elegant', '500'),
      fontSize: 34,
      fontWeight: '500' as const,
      lineHeight: 40,
    },
    text: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 16,
      lineHeight: 23,
      marginTop: 12,
    },
    panelBody: {
      marginTop: 24,
    },
    panelBodyNoText: {
      marginTop: 32,
    },
    input: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 18,
      borderWidth: 1,
      color: colors.text,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      height: 52,
      lineHeight: 20,
      paddingHorizontal: spacing.md,
      paddingVertical: 0,
    },
    inputFocused: {
      borderColor: colors.text,
      borderWidth: 2,
    },
    primaryButton: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      backgroundColor: colors.accent,
      borderRadius: 999,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      justifyContent: 'center' as const,
      marginTop: spacing.lg,
      minHeight: 54,
      paddingHorizontal: spacing.lg,
      paddingVertical: 0,
    },
    disabledButton: {
      backgroundColor: '#A69B8F',
    },
    primaryButtonText: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    quietButton: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    quietButtonText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    secondaryAction: {
      alignItems: 'center' as const,
      alignSelf: 'stretch' as const,
      marginTop: spacing.md,
      paddingVertical: spacing.sm,
    },
    secondaryActionText: {
      color: colors.accent,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    consentRow: {
      alignItems: 'flex-start' as const,
      flexDirection: 'row' as const,
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    consentCheckbox: {
      alignItems: 'center' as const,
      borderColor: colors.border,
      borderRadius: 4,
      borderWidth: 1,
      height: 22,
      justifyContent: 'center' as const,
      marginTop: 2,
      width: 22,
    },
    consentCheckboxChecked: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    consentCheckmark: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
    consentTextWrap: {
      flex: 1,
      minWidth: 0,
    },
    consentText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 19,
    },
    consentHint: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginTop: spacing.xs,
    },
    optionRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.sm,
    },
    optionButton: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 8,
      paddingHorizontal: spacing.lg,
      paddingVertical: spacing.md,
    },
    selectedOption: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    optionButtonText: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 15,
      fontWeight: '600' as const,
    },
    selectedOptionText: {
      color: colors.surface,
    },
    mutedText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
    },
    discoveryGrid: {
      gap: spacing.sm,
      marginTop: spacing.sm,
    },
    discoveryCard: {
      alignItems: 'center' as const,
      backgroundColor: 'transparent',
      flexDirection: 'row' as const,
      gap: spacing.md,
      minHeight: 34,
    },
    discoveryIcon: {
      alignItems: 'center' as const,
      borderColor: colors.border,
      borderRadius: 11,
      borderWidth: 1,
      height: 22,
      justifyContent: 'center' as const,
      width: 22,
    },
    discoveryIconActive: {
      borderColor: colors.accent,
    },
    discoveryIconComplete: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    discoveryValue: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
    },
    discoveryLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 13,
      lineHeight: 18,
      marginTop: 2,
    },
    loadingState: {
      alignItems: 'center' as const,
      gap: spacing.sm,
      marginTop: spacing.lg,
      paddingVertical: spacing.md,
    },
    loadingText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 15,
      lineHeight: 22,
    },
    profileNameLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      marginBottom: spacing.sm,
    },
    profilePhotoLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 14,
      fontWeight: '600' as const,
      lineHeight: 20,
      marginTop: 30,
    },
    profilePhotoRow: {
      flexDirection: 'row' as const,
      flexWrap: 'wrap' as const,
      gap: spacing.md,
      marginTop: spacing.md,
    },
    profilePhotoOption: {
      alignItems: 'center' as const,
      backgroundColor: '#EFE7DE',
      borderColor: '#EFE7DE',
      borderRadius: 36,
      borderWidth: 2,
      height: 72,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      position: 'relative' as const,
      width: 72,
    },
    profilePhotoOptionSelected: {
      borderColor: colors.accent,
    },
    profilePhotoOptionImage: {
      height: '100%' as const,
      width: '100%' as const,
    },
    profilePhotoCheckBadge: {
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 10,
      bottom: -1,
      height: 20,
      justifyContent: 'center' as const,
      position: 'absolute' as const,
      right: -1,
      width: 20,
    },
    profilePhotoCheckmark: {
      color: colors.surface,
      fontFamily: getFontFamily('600'),
      fontSize: 13,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    profileAddPhotoItem: {
      alignItems: 'center' as const,
      gap: spacing.xs,
      width: 72,
    },
    profileCameraCircle: {
      alignItems: 'center' as const,
      backgroundColor: colors.surface,
      borderColor: colors.timelineDivider,
      borderRadius: 36,
      borderWidth: 1,
      height: 72,
      justifyContent: 'center' as const,
      width: 72,
    },
    profileAddPhotoLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
      textAlign: 'center' as const,
    },
    scanCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 20,
      borderWidth: 1,
      padding: 20,
    },
    scanCardTitle: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 18,
      fontWeight: '600' as const,
      lineHeight: 24,
    },
    scanCardSubtitle: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
      marginTop: spacing.xs,
    },
    segmentBar: {
      flexDirection: 'row' as const,
      gap: 6,
      marginTop: 18,
    },
    segment: {
      backgroundColor: colors.border,
      borderRadius: 999,
      flex: 1,
      height: 10,
    },
    segmentFilled: {
      backgroundColor: colors.accent,
    },
    scanStepList: {
      marginTop: spacing.sm,
    },
    scanStepRow: {
      alignItems: 'center' as const,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: 'transparent',
      flexDirection: 'row' as const,
      gap: spacing.md,
      minHeight: 36,
      paddingHorizontal: spacing.sm,
      paddingVertical: spacing.xs,
    },
    scanStepRowActive: {
      backgroundColor: '#F1E9E0',
      borderColor: colors.timelineDivider,
    },
    scanStepCircle: {
      alignItems: 'center' as const,
      borderColor: colors.border,
      borderRadius: 11,
      borderWidth: 1,
      height: 22,
      justifyContent: 'center' as const,
      width: 22,
    },
    scanStepCircleActive: {
      borderColor: colors.accent,
    },
    scanStepCircleComplete: {
      backgroundColor: colors.accent,
      borderColor: colors.accent,
    },
    scanStepDot: {
      backgroundColor: colors.accent,
      borderRadius: 3,
      height: 6,
      width: 6,
    },
    scanStepLabel: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      lineHeight: 20,
    },
    scanStepLabelActive: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontWeight: '600' as const,
    },
    petCircleRow: {
      flexDirection: 'row' as const,
      justifyContent: 'space-between' as const,
      paddingHorizontal: 21,
      paddingVertical: spacing.xs,
    },
    petCircleItem: {
      alignItems: 'center' as const,
      gap: 12,
    },
    petCircleOuter: {
      alignItems: 'center' as const,
      backgroundColor: '#EFE7DE',
      borderColor: colors.border,
      borderRadius: 60,
      borderWidth: 1,
      height: 120,
      justifyContent: 'center' as const,
      overflow: 'hidden' as const,
      position: 'relative' as const,
      width: 120,
    },
    petCircleOuterSelected: {
      borderColor: colors.accent,
      borderWidth: 2,
    },
    petCircleInner: {
      alignItems: 'center' as const,
      backgroundColor: '#E8DDD2',
      borderRadius: 34,
      height: 68,
      justifyContent: 'center' as const,
      width: 68,
    },
    petCircleCheckBadge: {
      alignItems: 'center' as const,
      backgroundColor: colors.accent,
      borderRadius: 12,
      bottom: 10,
      height: 24,
      justifyContent: 'center' as const,
      position: 'absolute' as const,
      right: 2,
      width: 24,
    },
    petCirclePlaceholderText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 12,
      fontWeight: '600' as const,
      lineHeight: 16,
    },
    petCircleLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 16,
      fontWeight: '600' as const,
      lineHeight: 20,
      textAlign: 'center' as const,
    },
    petOptionList: {
      gap: spacing.md,
    },
    petOptionCard: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderRadius: 16,
      borderWidth: 1,
      flexDirection: 'row' as const,
      minHeight: 96,
      overflow: 'hidden' as const,
      padding: spacing.sm,
    },
    selectedPetOption: {
      borderColor: colors.accent,
    },
    petOptionImage: {
      borderRadius: 12,
      height: 80,
      width: 80,
    },
    petOptionImagePlaceholder: {
      alignItems: 'center' as const,
      backgroundColor: '#EFE7DE',
      borderRadius: 12,
      height: 80,
      justifyContent: 'center' as const,
      width: 80,
    },
    petOptionImagePlaceholderText: {
      color: colors.textMuted,
      fontFamily: getFontFamily('600'),
      fontSize: 10,
      fontWeight: '600' as const,
      lineHeight: 20,
    },
    petOptionMeta: {
      flex: 1,
      justifyContent: 'center' as const,
      paddingHorizontal: 20,
    },
    petOptionLabel: {
      color: colors.text,
      fontFamily: getFontFamily('600'),
      fontSize: 20,
      fontWeight: '600' as const,
    },
    petOptionCount: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 14,
      marginTop: spacing.xs,
    },
    petRuntimeNote: {
      color: colors.textMuted,
      fontFamily: getFontFamily('400'),
      fontSize: 12,
      lineHeight: 20,
      marginTop: spacing.md,
    },
  };
}

export function OnboardingScreen({
  anonymousUserId,
  onboardingState,
  onComplete,
  onStepChange,
}: OnboardingScreenProps) {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { colors } = useAppearance();
  const styles = useThemedStyles(createOnboardingStyles);
  const { isLinked } = useAuthAccountStatus();
  const photoAccess = usePhotoAccess({
    autoResumeOnMount: false,
    onboardingScanMode: true,
    historicalScanEnabled: shouldEnableHistoricalScan({
      isLinkedAccount: isLinked,
    }),
  });
  const {
    initialScanCompleted,
    permissionStatus,
    startScan,
    bestImageSelectionProgress,
  } = photoAccess;
  const [petName, setPetName] = useState('');
  const [petType, setPetType] = useState<LocalPetType | null>(null);
  const [profilePhotoSuggestions, setProfilePhotoSuggestions] = useState<
    ProfilePhotoSuggestion[]
  >([]);
  const [selectedProfilePhotoId, setSelectedProfilePhotoId] = useState<
    string | null
  >(null);
  const [isLoadingProfilePhotos, setIsLoadingProfilePhotos] = useState(false);
  const [detectedPetOptions, setDetectedPetOptions] = useState<
    DetectedPetOption[]
  >([]);
  const [isLoadingPetOptions, setIsLoadingPetOptions] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [accountErrorMessage, setAccountErrorMessage] = useState<string | null>(
    null,
  );
  const { isBlockingAuthInProgress, runBlockingAuthAction } =
    useBlockingAuthAction();
  const socialSignInInFlightRef = useRef(false);
  const step = getEffectiveStep(
    onboardingState.step,
    petName,
    petType,
    onboardingState.completedFlags.scanStarted,
  );
  const canContinueAfterScan = canContinueOnboardingScan(photoAccess);
  const storedPrivacyAcknowledged =
    onboardingState.completedFlags.privacyAcknowledged;
  const privacyAcknowledged = SHOW_WELCOME_PRIVACY_CONSENT
    ? storedPrivacyAcknowledged
    : true;
  const isPipelineActive =
    photoAccess.isScanning ||
    photoAccess.isDetectingPets ||
    photoAccess.isClusteringEvents ||
    photoAccess.isSelectingImages;
  useEffect(() => {
    let isMounted = true;

    async function hydratePetProfile() {
      const profile = await loadLocalPetProfile();

      if (!isMounted) {
        return;
      }

      if (!profile) {
        return;
      }

      setPetName(profile.name);
      setPetType(profile.type);
    }

    void hydratePetProfile();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (step !== 'pet_profile' || !petType) {
      return;
    }

    let isMounted = true;

    async function loadSuggestions() {
      setIsLoadingProfilePhotos(true);

      try {
        const database = await getDatabase();
        const suggestions = await getProfilePhotoSuggestions(database, petType);

        if (!isMounted) {
          return;
        }

        setProfilePhotoSuggestions(suggestions);
        setSelectedProfilePhotoId((current) => {
          if (
            current &&
            suggestions.some(
              (suggestion) => suggestion.localAssetId === current,
            )
          ) {
            return current;
          }

          return suggestions[0]?.localAssetId ?? null;
        });
      } finally {
        if (isMounted) {
          setIsLoadingProfilePhotos(false);
        }
      }
    }

    void loadSuggestions();

    return () => {
      isMounted = false;
    };
  }, [
    petType,
    step,
    photoAccess.bestImageSelectionProgress.selectedAssetCount,
  ]);

  useEffect(() => {
    if (step !== 'pet_select') {
      return;
    }

    let isMounted = true;

    async function loadPetOptions() {
      setIsLoadingPetOptions(true);

      try {
        const database = await getDatabase();
        const options = await getDetectedPetOptions(database);

        if (isMounted) {
          setDetectedPetOptions(options);
        }
      } finally {
        if (isMounted) {
          setIsLoadingPetOptions(false);
        }
      }
    }

    void loadPetOptions();

    return () => {
      isMounted = false;
    };
  }, [step, bestImageSelectionProgress.selectedAssetCount]);

  useEffect(() => {
    if (step !== 'scan' || isPipelineActive || initialScanCompleted) {
      return;
    }

    if (!canScanPhotos(permissionStatus)) {
      return;
    }

    void startScan();
  }, [
    initialScanCompleted,
    isPipelineActive,
    permissionStatus,
    startScan,
    step,
  ]);

  const selectedProfilePhoto = useMemo(
    () =>
      profilePhotoSuggestions.find(
        (suggestion) => suggestion.localAssetId === selectedProfilePhotoId,
      ) ?? null,
    [profilePhotoSuggestions, selectedProfilePhotoId],
  );

  const completeProfile = useCallback(async () => {
    if (!petName.trim() || !petType) {
      return;
    }

    setIsSaving(true);
    try {
      await saveLocalPetProfile({
        name: petName,
        type: petType,
        profilePhotoLocalAssetId: selectedProfilePhoto?.localAssetId ?? null,
        profilePhotoUri: selectedProfilePhoto?.uri ?? null,
      });
      await onComplete();
    } finally {
      setIsSaving(false);
    }
  }, [onComplete, petName, petType, selectedProfilePhoto]);

  const continueAfterPetTypeSelection = useCallback(
    async (nextPetType: LocalPetType) => {
      setIsSaving(true);
      try {
        await saveSelectedPetType(nextPetType);
        await onStepChange('pet_profile', {
          petSelected: true,
          petTypeSet: true,
        });

        // Top-up runs quietly in background while profile step stays interactive.
        void runOnboardingPetTypeTopUp({ petType: nextPetType }).catch(
          (error) => {
            logTailo(
              'Scan',
              'Quiet onboarding top-up failed after pet selection',
              {
                petType: nextPetType,
                message:
                  error instanceof Error ? error.message : 'Unknown error.',
              },
            );
          },
        );
      } finally {
        setIsSaving(false);
      }
    },
    [onStepChange],
  );

  const previousStep = useMemo(
    () => getPreviousStep(step, onboardingState.completedFlags.scanStarted),
    [onboardingState.completedFlags.scanStarted, step],
  );

  const goToPreviousStep = useCallback(() => {
    if (!previousStep) {
      return;
    }

    void onStepChange(previousStep).catch((error) => {
      logTailo('Auth', 'Failed to move to previous onboarding step', {
        message: error instanceof Error ? error.message : 'Unknown error.',
        previousStep,
      });
    });
  }, [onStepChange, previousStep]);

  const openAccountSignIn = useCallback(async () => {
    setAccountErrorMessage(null);
    await resetOnboardingForAccountSignInIntent();
    await onStepChange('welcome', {
      photoPermissionHandled: false,
      scanStarted: false,
      timelinePreviewSeen: false,
      petNameSet: false,
      petSelected: false,
      petTypeSet: false,
      petGenderSet: false,
      profilePhotoSuggested: false,
    });
    navigation.push('Login', { variant: 'welcome' });
  }, [navigation, onStepChange]);

  const startOnThisDevice = useCallback(async () => {
    if (!privacyAcknowledged) {
      return;
    }

    setAccountErrorMessage(null);
    await onStepChange('scan', {
      photoPermissionHandled: true,
      scanStarted: true,
    });

    if (canScanPhotos(photoAccess.permissionStatus)) {
      await photoAccess.startScan();
      return;
    }

    await photoAccess.requestAccess();
  }, [onStepChange, photoAccess, privacyAcknowledged]);

  const continueWithSocialSignIn = useCallback(
    async (provider: SocialSignInProvider) => {
      if (!privacyAcknowledged || socialSignInInFlightRef.current) {
        return;
      }

      socialSignInInFlightRef.current = true;
      setAccountErrorMessage(null);

      try {
        const source =
          provider === 'google' ? 'onboarding_google' : 'onboarding_apple';
        const result = await runBlockingAuthAction(() =>
          runSocialSignIn({ provider, source }),
        );

        await handleOnboardingSocialSignInResult(result, {
          startOnThisDevice,
          setErrorMessage: setAccountErrorMessage,
        });
      } finally {
        socialSignInInFlightRef.current = false;
      }
    },
    [privacyAcknowledged, runBlockingAuthAction, startOnThisDevice],
  );

  const showAccountActionsOnWelcome = shouldShowAccountActionsOnWelcome({
    isRemoteAuthConfigured: isRemoteAuthConfigured(),
    isLinkedAccount: isLinked,
  });

  const showAddPhotoSourceSheet = useCallback(() => {
    const title = t('onboarding.addPhotoTitle');
    const message = t('onboarding.addPhotoSourcePrompt');
    const takePhoto = t('onboarding.takePhoto');
    const chooseFromLibrary = t('onboarding.chooseFromLibrary');
    const cancel = t('common.cancel');

    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          cancelButtonIndex: 2,
          message,
          options: [takePhoto, chooseFromLibrary, cancel],
          title,
        },
        () => undefined,
      );
      return;
    }

    Alert.alert(title, message, [
      { text: takePhoto },
      { text: chooseFromLibrary },
      { text: cancel, style: 'cancel' },
    ]);
  }, []);

  const body = useMemo(() => {
    switch (step) {
      case 'welcome':
      case 'photo_permission':
        return (
          <WelcomePanel>
            {isBlockingAuthInProgress ? (
              <View style={styles.loadingState}>
                <ActivityIndicator color={colors.accent} />
                <Text style={styles.loadingText}>{t('signIn.signingIn')}</Text>
              </View>
            ) : (
              <>
                <WelcomePrimaryButton
                  disabled={!privacyAcknowledged}
                  label={t('onboarding.startWithMyPhotos')}
                  onPress={() => void startOnThisDevice()}
                />
                {showAccountActionsOnWelcome ? (
                  <>
                    <WelcomeOutlineButton
                      disabled={!privacyAcknowledged}
                      iconKind="apple"
                      label={t('onboarding.continueWithApple')}
                      onPress={() => void continueWithSocialSignIn('apple')}
                    />
                    <WelcomeOutlineButton
                      disabled={!privacyAcknowledged}
                      iconKind="google"
                      label={t('onboarding.continueWithGoogle')}
                      onPress={() => void continueWithSocialSignIn('google')}
                    />
                    <WelcomeOutlineButton
                      disabled={!privacyAcknowledged}
                      iconKind="email"
                      label={t('onboarding.registerWithEmail')}
                      onPress={() =>
                        navigation.push('AccountSettings', { mode: 'create' })
                      }
                    />
                    <WelcomeSignInLink
                      disabled={!privacyAcknowledged}
                      onPress={() => void openAccountSignIn()}
                    />
                  </>
                ) : null}
                <WelcomeLegalCopy />
              </>
            )}
            {SHOW_WELCOME_PRIVACY_CONSENT ? (
              <>
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: storedPrivacyAcknowledged }}
                  style={styles.consentRow}
                  onPress={() =>
                    onStepChange('welcome', {
                      privacyAcknowledged: !storedPrivacyAcknowledged,
                    })
                  }
                >
                  <View
                    style={[
                      styles.consentCheckbox,
                      storedPrivacyAcknowledged
                        ? styles.consentCheckboxChecked
                        : null,
                    ]}
                  >
                    {storedPrivacyAcknowledged ? (
                      <Text style={styles.consentCheckmark}>✓</Text>
                    ) : null}
                  </View>
                  <View style={styles.consentTextWrap}>
                    <Text style={styles.consentText}>
                      {t('onboarding.privacyConsentText')}
                    </Text>
                  </View>
                </Pressable>
                {!storedPrivacyAcknowledged ? (
                  <Text style={styles.consentHint}>
                    {t('onboarding.privacyConsentRequired')}
                  </Text>
                ) : null}
              </>
            ) : null}
            {accountErrorMessage ? (
              <Text style={styles.mutedText}>{accountErrorMessage}</Text>
            ) : null}
          </WelcomePanel>
        );
      case 'scan':
        return (
          <View style={styles.panel}>
            <Text style={styles.title}>
              {getOnboardingPipelineTitle(photoAccess)}
            </Text>
            <Text style={styles.text}>
              {initialScanCompleted
                ? t('onboarding.scanIdleText')
                : t('onboarding.scanActiveText')}
            </Text>
            <View style={styles.panelBody}>
              <ScanCard photoAccess={photoAccess} />
              {photoAccess.errorMessage ? (
                <Text style={styles.mutedText}>{photoAccess.errorMessage}</Text>
              ) : null}
              <PrimaryButton
                disabled={!canContinueAfterScan}
                label={t('common.continue')}
                onPress={() => onStepChange('pet_select')}
              />
            </View>
          </View>
        );
      case 'pet_select':
        return (
          <Panel
            title={t('onboarding.petSelectTitle')}
            text={
              detectedPetOptions.length > 0
                ? t('onboarding.petSelectText')
                : t('onboarding.petSelectFallbackText')
            }
          >
            {isLoadingPetOptions ? (
              <Text style={styles.mutedText}>
                {t('onboarding.lookingForPetMoments')}
              </Text>
            ) : detectedPetOptions.length > 0 ? (
              <View style={styles.petOptionList}>
                {detectedPetOptions.map((option) => (
                  <PetOptionCard
                    isSelected={petType === option.type}
                    key={option.type}
                    label={t(`petType.${option.type}`)}
                    momentCount={option.momentCount}
                    previewUri={option.previewUri}
                    onPress={() => setPetType(option.type)}
                  />
                ))}
              </View>
            ) : (
              <View style={styles.petCircleRow}>
                <PetCircleButton
                  isSelected={petType === 'dog'}
                  label={t('petType.dog')}
                  onPress={() => setPetType('dog')}
                />
                <PetCircleButton
                  isSelected={petType === 'cat'}
                  label={t('petType.cat')}
                  onPress={() => setPetType('cat')}
                />
              </View>
            )}
            <PrimaryButton
              disabled={!petType || isSaving}
              label={t('common.continue')}
              onPress={async () => {
                if (!petType) {
                  return;
                }
                await continueAfterPetTypeSelection(petType);
              }}
            />
            {detectedPetOptions.length > 0 ? (
              <Text style={styles.petRuntimeNote}>
                {t('onboarding.petRuntimeNote')}
              </Text>
            ) : null}
          </Panel>
        );
      case 'pet_type':
        return (
          <Panel
            title={getPetTypeStepTitle(petName)}
            text={t('onboarding.petTypeText')}
          >
            <OptionRow>
              <OptionButton
                isSelected={petType === 'dog'}
                label={t('petType.dog')}
                onPress={() => setPetType('dog')}
              />
              <OptionButton
                isSelected={petType === 'cat'}
                label={t('petType.cat')}
                onPress={() => setPetType('cat')}
              />
            </OptionRow>
            <PrimaryButton
              disabled={!petType || isSaving}
              label={t('common.continue')}
              onPress={async () => {
                if (!petType) {
                  return;
                }
                await continueAfterPetTypeSelection(petType);
              }}
            />
          </Panel>
        );
      case 'pet_profile':
      case 'pet_name':
      case 'profile_photo':
        return (
          <Panel title={t('onboarding.profileTitle')}>
            <Text style={styles.profileNameLabel}>
              {t('onboarding.petNameLabel')}
            </Text>
            <AppTextInput
              autoCapitalize="words"
              onChangeText={setPetName}
              placeholder={t('onboarding.namePlaceholder')}
              placeholderTextColor={colors.textMuted}
              style={[
                styles.input,
                focusedField === 'petName' && styles.inputFocused,
              ]}
              value={petName}
              onBlur={() => setFocusedField(null)}
              onFocus={() => setFocusedField('petName')}
            />
            {petType ? (
              <>
                <Text style={styles.profilePhotoLabel}>
                  {t('onboarding.profilePhotoLabel')}
                </Text>
                {isLoadingProfilePhotos ? (
                  <Text style={styles.mutedText}>
                    {t('onboarding.loadingPhotoOptions')}
                  </Text>
                ) : (
                  <View style={styles.profilePhotoRow}>
                    {profilePhotoSuggestions.map((suggestion) => (
                      <ProfilePhotoOption
                        isSelected={
                          selectedProfilePhotoId === suggestion.localAssetId
                        }
                        key={suggestion.localAssetId}
                        suggestion={suggestion}
                        onPress={() =>
                          setSelectedProfilePhotoId(suggestion.localAssetId)
                        }
                      />
                    ))}
                    <Pressable
                      accessibilityRole="button"
                      onPress={showAddPhotoSourceSheet}
                      style={styles.profileAddPhotoItem}
                    >
                      <View style={styles.profileCameraCircle}>
                        <Ionicons
                          color={colors.text}
                          name="camera-outline"
                          size={25}
                        />
                      </View>
                      <Text style={styles.profileAddPhotoLabel}>
                        {t('onboarding.addPhotoLabel')}
                      </Text>
                    </Pressable>
                  </View>
                )}
              </>
            ) : null}
            <PrimaryButton
              disabled={isSaving || !petName.trim() || !petType}
              label={t('onboarding.finishSetup')}
              onPress={completeProfile}
            />
          </Panel>
        );
      default:
        return null;
    }
  }, [
    canContinueAfterScan,
    completeProfile,
    colors.text,
    colors.textMuted,
    continueAfterPetTypeSelection,
    detectedPetOptions,
    initialScanCompleted,
    isLoadingPetOptions,
    isSaving,
    navigation,
    onStepChange,
    openAccountSignIn,
    accountErrorMessage,
    petName,
    petType,
    photoAccess,
    showAccountActionsOnWelcome,
    showAddPhotoSourceSheet,
    colors.accent,
    continueWithSocialSignIn,
    focusedField,
    isBlockingAuthInProgress,
    startOnThisDevice,
    isLoadingProfilePhotos,
    profilePhotoSuggestions,
    selectedProfilePhotoId,
    styles.input,
    styles.inputFocused,
    styles.consentCheckmark,
    styles.consentCheckbox,
    styles.consentCheckboxChecked,
    styles.consentHint,
    styles.consentRow,
    styles.consentText,
    styles.consentTextWrap,
    styles.loadingState,
    styles.loadingText,
    styles.mutedText,
    styles.petOptionList,
    styles.petCircleRow,
    styles.petRuntimeNote,
    styles.profileAddPhotoItem,
    styles.profileAddPhotoLabel,
    styles.profileNameLabel,
    styles.profilePhotoLabel,
    styles.profilePhotoRow,
    styles.profileCameraCircle,
    styles.panel,
    styles.panelBody,
    styles.text,
    styles.title,
    step,
    privacyAcknowledged,
    storedPrivacyAcknowledged,
  ]);

  return (
    <View style={styles.screen}>
      {previousStep ? (
        <View
          style={[
            styles.stepHeader,
            { paddingTop: getModalHeaderTopInset(insets.top) },
          ]}
        >
          <View style={styles.stepHeaderBack}>
            <ModalBackButton align="leading" onPress={goToPreviousStep} />
          </View>
          <View style={styles.stepHeaderCenter}>
            <AuthWordmark style={styles.stepHeaderWordmark} />
          </View>
          <View style={styles.stepHeaderEnd} />
        </View>
      ) : null}
      <ScrollView
        automaticallyAdjustKeyboardInsets
        contentContainerStyle={[
          styles.container,
          {
            justifyContent: 'flex-start',
            paddingTop: previousStep
              ? spacing.sm
              : step === 'welcome' || step === 'photo_permission'
                ? getAuthHeroScrollPaddingTop(insets.top)
                : getTabScreenTopPadding(insets.top),
            paddingBottom: insets.bottom + spacing.lg,
          },
        ]}
        contentInsetAdjustmentBehavior="never"
        keyboardDismissMode="interactive"
        keyboardShouldPersistTaps="handled"
        style={styles.screen}
      >
        {body}
      </ScrollView>
    </View>
  );
}

type PanelProps = {
  children: ReactNode;
  eyebrow?: string;
  title: string;
  text?: string;
};

function Panel({ children, eyebrow, title, text }: PanelProps) {
  const styles = useThemedStyles(createOnboardingStyles);

  return (
    <View style={styles.panel}>
      {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
      <Text style={styles.title}>{title}</Text>
      {text ? <Text style={styles.text}>{text}</Text> : null}
      <View style={text ? styles.panelBody : styles.panelBodyNoText}>
        {children}
      </View>
    </View>
  );
}

function WelcomePanel({ children }: { children: ReactNode }) {
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const styles = useThemedStyles(createOnboardingStyles);
  const availableHeight = Math.max(height - insets.top - insets.bottom, 0);
  const layoutMetrics = getWelcomeLayoutMetrics(height, availableHeight);
  const titleMetrics = getAuthTitleMetrics(width, layoutMetrics.bucket);

  return (
    <WelcomeLayoutContext.Provider value={layoutMetrics}>
      <View style={styles.welcomePanel}>
        <AuthHeroCollage
          maxHeight={layoutMetrics.heroMaxHeight}
          variant="onboarding"
          style={[
            styles.welcomeHeroCollage,
            { marginBottom: layoutMetrics.heroToContentGap },
          ]}
        />
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.88}
          numberOfLines={1}
          style={[
            styles.welcomeTitle,
            {
              fontSize: titleMetrics.fontSize,
              lineHeight: titleMetrics.lineHeight,
              marginTop: 0,
            },
          ]}
        >
          {t('onboarding.welcomeTitle')}
        </Text>
        <Text
          style={[
            styles.welcomeText,
            { marginTop: layoutMetrics.titleToCopyGap },
          ]}
        >
          {t('onboarding.welcomeTextLineOne')}
        </Text>
        <View
          style={[
            styles.welcomeActions,
            {
              gap: layoutMetrics.buttonGap,
              marginTop: layoutMetrics.copyToButtonsGap,
            },
          ]}
        >
          {children}
        </View>
      </View>
    </WelcomeLayoutContext.Provider>
  );
}

function WelcomeLegalCopy() {
  const styles = useThemedStyles(createOnboardingStyles);
  const layoutMetrics = useWelcomeLayoutMetrics();

  return (
    <AuthLegalCopy
      style={[styles.welcomeLegal, { marginTop: layoutMetrics.legalTopGap }]}
    />
  );
}

function ScanCard({
  photoAccess,
}: {
  photoAccess: ReturnType<typeof usePhotoAccess>;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createOnboardingStyles);
  const steps = getScanPipelineSteps(photoAccess);
  const isComplete = photoAccess.initialScanCompleted;

  return (
    <View style={styles.scanCard}>
      <Text style={styles.scanCardTitle}>
        {isComplete
          ? t('scanPipeline.detailReady')
          : t('onboarding.scanCardActiveTitle')}
      </Text>
      <Text style={styles.scanCardSubtitle}>
        {isComplete
          ? t('onboarding.scanCardCompleteSubtitle')
          : t('onboarding.scanCardActiveSubtitle')}
      </Text>
      <View style={styles.segmentBar}>
        {steps.map((step) => (
          <View
            key={step.id}
            style={[
              styles.segment,
              step.status !== 'pending' ? styles.segmentFilled : null,
            ]}
          />
        ))}
      </View>
      <View style={styles.scanStepList}>
        {steps.map((step) => (
          <ScanStepRow key={step.id} step={step} colors={colors} />
        ))}
      </View>
    </View>
  );
}

function ScanStepRow({
  step,
  colors,
}: {
  step: ScanPipelineStep;
  colors: ReturnType<typeof useAppearance>['colors'];
}) {
  const styles = useThemedStyles(createOnboardingStyles);
  const isActive = step.status === 'active';
  const isComplete = step.status === 'complete';

  return (
    <View
      style={[styles.scanStepRow, isActive ? styles.scanStepRowActive : null]}
    >
      <View
        style={[
          styles.scanStepCircle,
          isActive ? styles.scanStepCircleActive : null,
          isComplete ? styles.scanStepCircleComplete : null,
        ]}
      >
        {isComplete ? (
          <Ionicons color={colors.surface} name="checkmark" size={13} />
        ) : isActive ? (
          <View style={styles.scanStepDot} />
        ) : null}
      </View>
      <Text
        style={[
          styles.scanStepLabel,
          isActive ? styles.scanStepLabelActive : null,
        ]}
      >
        {step.label}
      </Text>
    </View>
  );
}

function PetCircleButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createOnboardingStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={styles.petCircleItem}
      onPress={onPress}
    >
      <View
        style={[
          styles.petCircleOuter,
          isSelected ? styles.petCircleOuterSelected : null,
        ]}
      >
        <View style={styles.petCircleInner}>
          <Text style={styles.petCirclePlaceholderText}>
            {label.toUpperCase()}
          </Text>
        </View>
        {isSelected ? (
          <View style={styles.petCircleCheckBadge}>
            <Ionicons color={colors.surface} name="checkmark" size={13} />
          </View>
        ) : null}
      </View>
      <Text style={styles.petCircleLabel}>{label}</Text>
    </Pressable>
  );
}

function ProfilePhotoOption({
  isSelected,
  suggestion,
  onPress,
}: {
  isSelected: boolean;
  suggestion: ProfilePhotoSuggestion;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createOnboardingStyles);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      onPress={onPress}
      style={[
        styles.profilePhotoOption,
        isSelected ? styles.profilePhotoOptionSelected : null,
      ]}
    >
      <Image
        contentFit="cover"
        source={{ uri: suggestion.uri }}
        style={styles.profilePhotoOptionImage}
      />
      {isSelected ? (
        <View style={styles.profilePhotoCheckBadge}>
          <Text style={styles.profilePhotoCheckmark}>✓</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

function PrimaryButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createOnboardingStyles);

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      style={[styles.primaryButton, disabled ? styles.disabledButton : null]}
      onPress={onPress}
    >
      {icon ? <Ionicons color={colors.surface} name={icon} size={18} /> : null}
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function WelcomePrimaryButton({
  disabled,
  label,
  onPress,
}: {
  disabled?: boolean;
  label: string;
  onPress: () => void;
}) {
  const { colors } = useAppearance();
  const styles = useThemedStyles(createOnboardingStyles);
  const layoutMetrics = useWelcomeLayoutMetrics();

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      style={[
        styles.welcomePrimaryButton,
        { minHeight: layoutMetrics.primaryButtonHeight },
        disabled ? styles.disabledButton : null,
      ]}
      onPress={onPress}
    >
      <View style={styles.welcomeButtonIconSlot}>
        <AuthButtonIcon color={colors.surface} kind="photos" size={23} />
      </View>
      <View style={styles.welcomeButtonTextSlot}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.88}
          numberOfLines={1}
          style={styles.welcomePrimaryButtonText}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function WelcomeOutlineButton({
  disabled,
  iconKind,
  label,
  onPress,
}: {
  disabled?: boolean;
  iconKind: AuthButtonIconKind;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createOnboardingStyles);
  const layoutMetrics = useWelcomeLayoutMetrics();

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      style={[
        styles.welcomeOutlineButton,
        { minHeight: layoutMetrics.outlineButtonHeight },
        disabled ? styles.disabledButton : null,
      ]}
      onPress={onPress}
    >
      <View style={styles.welcomeButtonIconSlot}>
        <AuthButtonIcon kind={iconKind} size={iconKind === 'apple' ? 23 : 22} />
      </View>
      <View style={styles.welcomeButtonTextSlot}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.88}
          numberOfLines={1}
          style={styles.welcomeOutlineButtonText}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

function WelcomeSignInLink({
  disabled,
  onPress,
}: {
  disabled?: boolean;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createOnboardingStyles);
  const layoutMetrics = useWelcomeLayoutMetrics();

  return (
    <Pressable
      accessibilityLabel={t('common.alreadyHaveAccountSignIn')}
      accessibilityRole="link"
      disabled={disabled}
      style={[
        styles.welcomeSignInButton,
        { marginTop: layoutMetrics.signInTopGap },
        disabled ? styles.disabledButton : null,
      ]}
      onPress={onPress}
    >
      <Text style={styles.welcomeSignInText}>
        {t('onboarding.alreadyHaveAccountPrefix')}{' '}
        <Text style={styles.welcomeSignInLink}>
          {t('onboarding.signInLink')}
        </Text>
      </Text>
    </Pressable>
  );
}

function OptionRow({ children }: { children: ReactNode }) {
  const styles = useThemedStyles(createOnboardingStyles);

  return <View style={styles.optionRow}>{children}</View>;
}

function OptionButton({
  isSelected,
  label,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createOnboardingStyles);

  return (
    <Pressable
      style={[styles.optionButton, isSelected ? styles.selectedOption : null]}
      onPress={onPress}
    >
      <Text
        style={[
          styles.optionButtonText,
          isSelected ? styles.selectedOptionText : null,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function PetOptionCard({
  isSelected,
  label,
  momentCount,
  previewUri,
  onPress,
}: {
  isSelected: boolean;
  label: string;
  momentCount: number;
  previewUri: string | null;
  onPress: () => void;
}) {
  const styles = useThemedStyles(createOnboardingStyles);

  return (
    <Pressable
      style={[
        styles.petOptionCard,
        isSelected ? styles.selectedPetOption : null,
      ]}
      onPress={onPress}
    >
      {previewUri ? (
        <Image
          contentFit="cover"
          source={{ uri: previewUri }}
          style={styles.petOptionImage}
        />
      ) : (
        <View style={styles.petOptionImagePlaceholder}>
          <Text style={styles.petOptionImagePlaceholderText}>PHOTO</Text>
        </View>
      )}
      <View style={styles.petOptionMeta}>
        <Text style={styles.petOptionLabel}>{label}</Text>
        <Text style={styles.petOptionCount}>
          {formatPetOptionPhotoCount(momentCount)}
        </Text>
      </View>
    </Pressable>
  );
}

function getEffectiveStep(
  storedStep: OnboardingStep,
  _petName: string,
  petType: LocalPetType | null,
  scanStarted: boolean,
): OnboardingStep {
  if (storedStep === 'photo_permission') {
    return 'welcome';
  }

  if (
    storedStep === 'timeline_preview' ||
    storedStep === 'pet_gender' ||
    storedStep === 'pet_name' ||
    storedStep === 'profile_photo'
  ) {
    return 'pet_profile';
  }

  if (storedStep === 'pet_profile' && !petType) {
    return scanStarted ? 'pet_select' : 'pet_type';
  }

  return storedStep;
}

function getPreviousStep(
  step: OnboardingStep,
  scanStarted: boolean,
): OnboardingStep | null {
  switch (step) {
    case 'scan':
      return 'welcome';
    case 'pet_select':
      return 'scan';
    case 'pet_type':
      return 'welcome';
    case 'pet_profile':
      return scanStarted ? 'pet_select' : 'pet_type';
    default:
      return null;
  }
}
