import type { Page } from 'playwright';
import type { TestContext } from '@storybook/test-runner';
import { checkA11y, configureAxe } from 'axe-playwright';
import { getStoryContext } from '@storybook/test-runner';

const TOKEN_STORY_PREFIX = 'design-system-tokens-catalog';

export async function runTokenCatalogA11yAudit(
  page: Page,
  context: TestContext,
): Promise<void> {
  if (!context.id.startsWith(TOKEN_STORY_PREFIX)) {
    return;
  }

  const storyContext = await getStoryContext(page, context);
  if (storyContext.parameters?.a11y?.disable) {
    return;
  }

  await configureAxe(page, {
    rules: storyContext.parameters?.a11y?.config?.rules,
  });

  await checkA11y(page, '#storybook-root', {
    detailedReport: true,
    detailedReportOptions: { html: true },
    axeOptions: storyContext.parameters?.a11y?.options,
  });
}
