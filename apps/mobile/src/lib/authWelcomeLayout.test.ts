import {
  getAuthHeaderMetrics,
  getAuthHeroScrollPaddingTop,
  getOnboardingWelcomeScrollPaddingTop,
  getAuthWordmarkMetrics,
  getForgotPasswordContentInset,
  getForgotPasswordLayoutMetrics,
  getForgotPasswordTitleMetrics,
  getAuthLayoutBucket,
  getLoginLayoutMetrics,
  getWelcomeLayoutMetrics,
  type LoginLayoutMetrics,
} from './authWelcomeLayout';
import { spacing } from '@/constants/theme';

function estimateLoginBelowHeroForTest(metrics: LoginLayoutMetrics): number {
  const titleBlock =
    metrics.bucket === 'short' ? 56 : metrics.bucket === 'tall' ? 70 : 64;
  const fieldBlock = metrics.inputHeight * 2 + 36;
  const primaryBlock =
    metrics.primaryButtonTopGap + metrics.primaryButtonHeight;
  const codeLinkBlock = metrics.codeLinkTopGap + 28;
  const socialBlock = 52 + metrics.socialTopGap;
  const footerBlock =
    28 + metrics.accountTopGap + 34 + metrics.legalTopGap + spacing.lg * 2;

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

describe('authWelcomeLayout', () => {
  it('classifies common phone heights into layout buckets', () => {
    expect(getAuthLayoutBucket(667)).toBe('short');
    expect(getAuthLayoutBucket(844)).toBe('normal');
    expect(getAuthLayoutBucket(932)).toBe('tall');
  });

  it('keeps hero auth scroll padding aligned with onboarding welcome spacing', () => {
    expect(getAuthHeroScrollPaddingTop(0)).toBe(spacing.lg);
    expect(getAuthHeroScrollPaddingTop(59)).toBe(61);
    expect(getOnboardingWelcomeScrollPaddingTop(47)).toBe(49);
  });

  it('shares auth wordmark sizing across hero and utility variants', () => {
    const hero = getAuthWordmarkMetrics('hero');
    const utility = getAuthWordmarkMetrics('utility');
    const heroHeader = getAuthHeaderMetrics(59, 'hero');
    const utilityHeader = getAuthHeaderMetrics(59, 'utility');

    expect(hero.height).toBe(utility.height);
    expect(hero.width).toBeGreaterThan(hero.height);
    expect(heroHeader.paddingTop).toBe(utilityHeader.paddingTop);
    expect(heroHeader.totalHeight).toBeGreaterThanOrEqual(
      utilityHeader.totalHeight,
    );
  });

  it('scales login hero to 85-92% of onboarding by screen bucket', () => {
    const cases = [
      { height: 667, availableHeight: 586, minScale: 0.78, maxScale: 0.86 },
      { height: 844, availableHeight: 763, minScale: 0.82, maxScale: 0.88 },
      { height: 932, availableHeight: 851, minScale: 0.84, maxScale: 0.88 },
    ] as const;

    for (const { height, availableHeight, minScale, maxScale } of cases) {
      const welcome = getWelcomeLayoutMetrics(height, availableHeight);
      const login = getLoginLayoutMetrics(height, availableHeight);
      const ratio = login.heroMaxHeight / welcome.heroMaxHeight;

      expect(login.heroMaxHeight).toBeLessThan(welcome.heroMaxHeight);
      expect(ratio).toBeGreaterThanOrEqual(minScale);
      expect(ratio).toBeLessThanOrEqual(maxScale);
    }
  });

  it('keeps login content within one-screen budget on a normal phone', () => {
    const height = 844;
    const availableHeight = 763;
    const login = getLoginLayoutMetrics(height, availableHeight);
    const belowHeroReserve = estimateLoginBelowHeroForTest(login);

    expect(login.heroMaxHeight + belowHeroReserve).toBeLessThanOrEqual(
      availableHeight,
    );
  });

  it('uses a responsive gap between intro copy and the email form', () => {
    const short = getLoginLayoutMetrics(667, 586);
    const normal = getLoginLayoutMetrics(844, 763);
    const tall = getLoginLayoutMetrics(932, 851);

    expect(short.copyToFormGap).toBe(8);
    expect(normal.copyToFormGap).toBe(10);
    expect(tall.copyToFormGap).toBe(12);
  });

  it('keeps the sign-in button comfortably separated from the password field', () => {
    const short = getLoginLayoutMetrics(667, 586);
    const normal = getLoginLayoutMetrics(844, 763);
    const tall = getLoginLayoutMetrics(932, 851);

    expect(short.inputHeight).toBe(52);
    expect(normal.inputHeight).toBe(52);
    expect(tall.inputHeight).toBe(52);
    expect(short.primaryButtonHeight).toBe(58);
    expect(normal.primaryButtonHeight).toBe(58);
    expect(tall.primaryButtonHeight).toBe(58);
    expect(short.primaryButtonTopGap).toBe(12);
    expect(normal.primaryButtonTopGap).toBe(16);
    expect(tall.primaryButtonTopGap).toBe(16);
  });

  it('sizes forgot-password utility spacing by screen bucket', () => {
    const short = getForgotPasswordLayoutMetrics(667);
    const normal = getForgotPasswordLayoutMetrics(844);
    const tall = getForgotPasswordLayoutMetrics(932);

    expect(short.copyToFormGap).toBe(28);
    expect(normal.copyToFormGap).toBe(32);
    expect(tall.copyToFormGap).toBe(36);
    expect(short.inputHeight).toBe(52);
    expect(normal.inputHeight).toBe(52);
    expect(tall.inputHeight).toBe(52);
    expect(short.primaryButtonHeight).toBe(58);
    expect(normal.primaryButtonHeight).toBe(58);
    expect(tall.primaryButtonHeight).toBe(58);
    expect(normal.titleToCopyGap).toBeGreaterThanOrEqual(8);
    expect(normal.titleToCopyGap).toBeLessThanOrEqual(12);
    expect(normal.headerToContentGap).toBeGreaterThan(short.headerToContentGap);
    expect(tall.headerToContentGap).toBeGreaterThan(normal.headerToContentGap);
  });

  it('offsets forgot-password content slightly above center on tall screens', () => {
    const metrics = getForgotPasswordLayoutMetrics(932);
    const header = getAuthHeaderMetrics(59, 'utility');
    const inset = getForgotPasswordContentInset(
      932,
      59,
      34,
      header.totalHeight,
      metrics,
    );

    expect(inset).toBeGreaterThan(metrics.headerToContentGap);
    expect(inset).toBeLessThanOrEqual(metrics.headerToContentGap + 48);
  });

  it('keeps forgot-password headline sizes refined and responsive', () => {
    const short = getForgotPasswordTitleMetrics(430, 'short');
    const normal = getForgotPasswordTitleMetrics(430, 'normal');
    const tall = getForgotPasswordTitleMetrics(440, 'tall');
    const narrow = getForgotPasswordTitleMetrics(360, 'normal');

    expect(short.fontSize).toBeGreaterThanOrEqual(34);
    expect(short.fontSize).toBeLessThanOrEqual(38);
    expect(normal.fontSize).toBeGreaterThanOrEqual(38);
    expect(normal.fontSize).toBeLessThanOrEqual(42);
    expect(tall.fontSize).toBeGreaterThanOrEqual(40);
    expect(tall.fontSize).toBeLessThanOrEqual(44);
    expect(narrow.fontSize).toBeLessThanOrEqual(38);
  });
});
