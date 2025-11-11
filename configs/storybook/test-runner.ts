import type { TestRunnerConfig } from '@storybook/test-runner';
import { injectAxe } from 'axe-playwright';
import { runTokenCatalogA11yAudit } from './tests/tokens.a11y.spec';

const config: TestRunnerConfig = {
  async preVisit(page) {
    await injectAxe(page);
  },
  async postVisit(page, context) {
    await runTokenCatalogA11yAudit(page, context);
  },
};

export default config;
