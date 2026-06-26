import { spacing } from '@/constants/theme';
import { getModalHeaderTopInset } from '@/navigation/modalHeaderInset';

export type AuthLayoutBucket = 'short' | 'normal' | 'tall';

export type AuthHeaderVariant = 'hero' | 'utility';

export type AuthWordmarkMetrics = {
  readonly height: number;
  readonly width: number;
  /** Gap below the wordmark before hero imagery or page content. */
  readonly stageGap: number;
};

export type AuthHeaderMetrics = {
  readonly paddingTop: number;
  readonly bottomSpacing: number;
  readonly totalHeight: number;
};

const AUTH_WORDMARK_ASPECT_RATIO = 1024 / 437;

/** Shared Tailo wordmark sizing for auth screens. */
export function getAuthWordmarkMetrics(
  variant: AuthHeaderVariant,
): AuthWordmarkMetrics {
  const height = 36;

  return {
    height,
    width: Math.round(height * AUTH_WORDMARK_ASPECT_RATIO),
    stageGap: variant === 'utility' ? 0 : 8,
  };
}

/** Shared top band metrics for auth headers and hero collages. */
export function getAuthHeaderMetrics(
  safeAreaTop: number,
  variant: AuthHeaderVariant,
): AuthHeaderMetrics {
  const paddingTop = getModalHeaderTopInset(safeAreaTop);
  const bottomSpacing = variant === 'utility' ? 0 : spacing.xs;
  const wordmark = getAuthWordmarkMetrics(variant);
  const totalHeight = paddingTop + wordmark.height + bottomSpacing;

  return {
    paddingTop,
    bottomSpacing,
    totalHeight,
  };
}

/** Scroll top padding for onboarding welcome and sign-in hero screens. */
export function getOnboardingWelcomeScrollPaddingTop(
  safeAreaTop: number,
): number {
  return Math.max(safeAreaTop + 2, spacing.lg);
}

/** Scroll/content top padding for hero auth screens (sign-in, onboarding welcome). */
export function getAuthHeroScrollPaddingTop(safeAreaTop: number): number {
  return getOnboardingWelcomeScrollPaddingTop(safeAreaTop);
}

export type WelcomeLayoutMetrics = {
  readonly bucket: AuthLayoutBucket;
  readonly heroMaxHeight: number;
  readonly heroToContentGap: number;
  readonly titleToCopyGap: number;
  readonly copyToButtonsGap: number;
  readonly buttonGap: number;
  readonly signInTopGap: number;
  readonly legalTopGap: number;
  readonly primaryButtonHeight: number;
  readonly outlineButtonHeight: number;
};

export type LoginLayoutMetrics = WelcomeLayoutMetrics & {
  readonly copyToFormGap: number;
  readonly formFieldGap: number;
  readonly codeLinkTopGap: number;
  readonly socialTopGap: number;
  readonly inputHeight: number;
  readonly accountTopGap: number;
  readonly primaryButtonTopGap: number;
};

export const defaultWelcomeLayoutMetrics: WelcomeLayoutMetrics = {
  bucket: 'normal',
  heroMaxHeight: 280,
  heroToContentGap: spacing.md,
  titleToCopyGap: spacing.xs,
  copyToButtonsGap: spacing.md,
  buttonGap: 6,
  signInTopGap: 2,
  legalTopGap: 2,
  primaryButtonHeight: 56,
  outlineButtonHeight: 50,
};

export function getAuthLayoutBucket(height: number): AuthLayoutBucket {
  if (height < 740) {
    return 'short';
  }

  if (height <= 880) {
    return 'normal';
  }

  return 'tall';
}

export function getWelcomeLayoutMetrics(
  height: number,
  availableHeight: number,
): WelcomeLayoutMetrics {
  const bucket = getAuthLayoutBucket(height);

  if (bucket === 'short') {
    return {
      bucket,
      heroMaxHeight: Math.round(
        Math.min(255, Math.max(240, availableHeight * 0.34)),
      ),
      heroToContentGap: spacing.sm,
      titleToCopyGap: spacing.xs,
      copyToButtonsGap: spacing.sm,
      buttonGap: 5,
      signInTopGap: 0,
      legalTopGap: 0,
      primaryButtonHeight: 52,
      outlineButtonHeight: 48,
    };
  }

  if (bucket === 'tall') {
    return {
      bucket,
      heroMaxHeight: Math.round(
        Math.min(325, Math.max(300, availableHeight * 0.38)),
      ),
      heroToContentGap: spacing.lg,
      titleToCopyGap: spacing.sm,
      copyToButtonsGap: spacing.lg,
      buttonGap: 8,
      signInTopGap: spacing.xs,
      legalTopGap: spacing.xs,
      primaryButtonHeight: 58,
      outlineButtonHeight: 52,
    };
  }

  return {
    bucket,
    heroMaxHeight: Math.round(
      Math.min(285, Math.max(265, availableHeight * 0.35)),
    ),
    heroToContentGap: spacing.md,
    titleToCopyGap: spacing.xs,
    copyToButtonsGap: spacing.md,
    buttonGap: 6,
    signInTopGap: 2,
    legalTopGap: 2,
    primaryButtonHeight: 56,
    outlineButtonHeight: 50,
  };
}

function estimateLoginBelowHeroHeight(
  metrics: Pick<
    LoginLayoutMetrics,
    | 'bucket'
    | 'heroToContentGap'
    | 'copyToFormGap'
    | 'primaryButtonHeight'
    | 'codeLinkTopGap'
    | 'socialTopGap'
    | 'primaryButtonTopGap'
    | 'accountTopGap'
    | 'legalTopGap'
  >,
  inputHeight: number,
): number {
  const titleBlock =
    metrics.bucket === 'short' ? 56 : metrics.bucket === 'tall' ? 70 : 64;
  const fieldBlock = inputHeight * 2 + 36;
  const primaryBlock =
    metrics.primaryButtonTopGap + metrics.primaryButtonHeight;
  const codeLinkBlock = metrics.codeLinkTopGap + 28;
  const socialBlock = 52 + metrics.socialTopGap;
  const footerBlock = 28 + metrics.accountTopGap + 34 + metrics.legalTopGap;

  return (
    metrics.heroToContentGap +
    titleBlock +
    metrics.copyToFormGap +
    fieldBlock +
    primaryBlock +
    codeLinkBlock +
    socialBlock +
    footerBlock
  );
}

/** Additional trim for login hero vertical balance (~6%). */
const LOGIN_HERO_BALANCE_SCALE = 0.94;

function getLoginHeroHeightScale(bucket: AuthLayoutBucket): number {
  const bucketScale =
    bucket === 'short' ? 0.86 : bucket === 'tall' ? 0.92 : 0.9;

  return bucketScale * LOGIN_HERO_BALANCE_SCALE;
}

function getLoginHeroMinHeight(bucket: AuthLayoutBucket): number {
  const baseMin = bucket === 'short' ? 202 : bucket === 'tall' ? 228 : 210;

  return Math.round(baseMin * LOGIN_HERO_BALANCE_SCALE);
}

/** Login uses the welcome hero language, with tighter form rhythm to fit one screen. */
export function getLoginLayoutMetrics(
  height: number,
  availableHeight: number,
): LoginLayoutMetrics {
  const welcome = getWelcomeLayoutMetrics(height, availableHeight);
  const inputHeight = 52;
  const copyToFormGap =
    welcome.bucket === 'short'
      ? spacing.sm
      : welcome.bucket === 'tall'
        ? spacing.sm + spacing.xs
        : spacing.sm + 2;
  const formFieldGap = spacing.xs;
  const codeLinkTopGap = welcome.bucket === 'short' ? 2 : spacing.xs;
  const socialTopGap = spacing.sm;
  const accountTopGap = spacing.sm;
  const primaryButtonTopGap =
    welcome.bucket === 'short' ? spacing.sm + spacing.xs : spacing.md;

  const loginRhythm: LoginLayoutMetrics = {
    ...welcome,
    copyToFormGap,
    formFieldGap,
    codeLinkTopGap,
    socialTopGap,
    inputHeight,
    accountTopGap,
    primaryButtonTopGap,
    heroToContentGap: welcome.bucket === 'tall' ? spacing.md : spacing.sm,
    titleToCopyGap: spacing.xs,
    buttonGap: 6,
    legalTopGap: spacing.xs,
    primaryButtonHeight: 58,
    outlineButtonHeight:
      welcome.bucket === 'short'
        ? 44
        : Math.max(welcome.outlineButtonHeight - 2, 46),
  };

  const verticalPad = spacing.lg * 2 + spacing.xs;
  const belowHeroReserve = estimateLoginBelowHeroHeight(
    loginRhythm,
    inputHeight,
  );
  const fitHeroMax = availableHeight - belowHeroReserve - verticalPad;
  const loginHeroScale = getLoginHeroHeightScale(welcome.bucket);
  const scaledWelcomeHero = Math.round(welcome.heroMaxHeight * loginHeroScale);
  const minHero = getLoginHeroMinHeight(welcome.bucket);
  const heroMaxHeight = Math.min(
    scaledWelcomeHero,
    Math.max(fitHeroMax, minHero),
  );

  return {
    ...loginRhythm,
    heroMaxHeight,
  };
}

export function getAuthTitleMetrics(
  width: number,
  bucket: AuthLayoutBucket,
): { fontSize: number; lineHeight: number } {
  const widthLimitedTitleSize = width < 380 ? 33 : width < 430 ? 35 : 38;
  const heightLimitedTitleSize =
    bucket === 'short' ? 35 : bucket === 'normal' ? 40 : 44;
  const fontSize = Math.min(heightLimitedTitleSize, widthLimitedTitleSize);

  return {
    fontSize,
    lineHeight: Math.round(fontSize * 1.08),
  };
}

export type ForgotPasswordLayoutMetrics = {
  readonly bucket: AuthLayoutBucket;
  readonly headerToContentGap: number;
  readonly titleToCopyGap: number;
  readonly copyToFormGap: number;
  readonly formFieldGap: number;
  readonly inputToButtonGap: number;
  readonly inputHeight: number;
  readonly primaryButtonHeight: number;
};

/** Utility auth page spacing — focused, no decorative imagery. */
export function getForgotPasswordLayoutMetrics(
  height: number,
): ForgotPasswordLayoutMetrics {
  const bucket = getAuthLayoutBucket(height);

  if (bucket === 'short') {
    return {
      bucket,
      headerToContentGap: 20,
      titleToCopyGap: spacing.sm,
      copyToFormGap: 28,
      formFieldGap: spacing.xs,
      inputToButtonGap: 28,
      inputHeight: 52,
      primaryButtonHeight: 58,
    };
  }

  if (bucket === 'tall') {
    return {
      bucket,
      headerToContentGap: 32,
      titleToCopyGap: spacing.sm,
      copyToFormGap: 36,
      formFieldGap: spacing.sm,
      inputToButtonGap: 36,
      inputHeight: 52,
      primaryButtonHeight: 58,
    };
  }

  return {
    bucket,
    headerToContentGap: 26,
    titleToCopyGap: 10,
    copyToFormGap: 32,
    formFieldGap: spacing.xs,
    inputToButtonGap: 32,
    inputHeight: 52,
    primaryButtonHeight: 58,
  };
}

/** Offset below the shared auth header so utility content sits slightly above center. */
export function getForgotPasswordContentInset(
  screenHeight: number,
  safeTop: number,
  safeBottom: number,
  headerTotalHeight: number,
  metrics: ForgotPasswordLayoutMetrics,
): number {
  const usableHeight = screenHeight - safeTop - safeBottom;
  const estimatedStackHeight =
    metrics.bucket === 'short' ? 220 : metrics.bucket === 'tall' ? 250 : 234;
  const floatRoom = Math.max(
    0,
    usableHeight - headerTotalHeight - estimatedStackHeight,
  );
  const floatFraction =
    metrics.bucket === 'short' ? 0.1 : metrics.bucket === 'tall' ? 0.2 : 0.14;
  const floatInset = Math.round(floatRoom * floatFraction);
  const maxFloatInset =
    metrics.bucket === 'short' ? 16 : metrics.bucket === 'tall' ? 48 : 28;

  return metrics.headerToContentGap + Math.min(maxFloatInset, floatInset);
}

export function getForgotPasswordTitleMetrics(
  width: number,
  bucket: AuthLayoutBucket,
): { fontSize: number; lineHeight: number } {
  const widthLimitedTitleSize =
    width < 360 ? 34 : width < 390 ? 36 : width < 430 ? 38 : 42;
  const heightLimitedTitleSize =
    bucket === 'short' ? 36 : bucket === 'normal' ? 40 : 44;
  const fontSize = Math.min(heightLimitedTitleSize, widthLimitedTitleSize);

  return {
    fontSize,
    lineHeight: Math.round(fontSize * 1.08),
  };
}
