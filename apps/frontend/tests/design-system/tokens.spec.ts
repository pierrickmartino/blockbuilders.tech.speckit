import { describe, expect, it } from 'vitest';
import {
  tokenCatalog,
  getCssVariableName,
  listTokensByCategory,
} from '@/lib/design-system/tokens';

const MIN_CONTRAST_AA = 4.5;

describe('design-system tokens', () => {
  it('annotates foreground tokens with WCAG AA ratios', () => {
    const foregroundTokens = tokenCatalog.color.filter((token) =>
      ['foreground', 'content', 'action'].includes(token.role),
    );

    expect(foregroundTokens.length).toBeGreaterThan(0);
    foregroundTokens.forEach((token) => {
      expect(token.wcagRatio, `${token.id} missing wcag ratio`).toBeDefined();
      expect(token.wcagRatio ?? 0).toBeGreaterThanOrEqual(MIN_CONTRAST_AA);
    });
  });

  it('provides dark-mode fallbacks for every color token', () => {
    tokenCatalog.color.forEach((token) => {
      expect(token.darkValue ?? token.value).toBeTruthy();
    });
  });

  it('exposes CSS variable handles for each token', () => {
    const [colorToken] = tokenCatalog.color;
    expect(getCssVariableName(colorToken.id)).toMatch(/^--color-/);
  });

  it('surfaces multiple token categories for gallery rendering', () => {
    const groups = listTokensByCategory();
    expect(groups.color.length).toBeGreaterThan(0);
    expect(groups.typography.length).toBeGreaterThan(0);
    expect(groups.spacing.length).toBeGreaterThan(0);
  });
});
