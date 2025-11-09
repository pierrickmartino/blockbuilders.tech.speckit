import { chromium, firefox, webkit } from '@playwright/test';

const storyUrl =
  process.env.STORYBOOK_TOKEN_GALLERY_URL ??
  'http://localhost:6100/?path=/story/design-system-tokens-catalog--gallery';

const browserName = process.env.PLAYWRIGHT_BROWSER ?? 'chromium';
const browserType = { chromium, firefox, webkit }[browserName] ?? chromium;

const browser = await browserType.launch({ headless: true });
const page = await browser.newPage();
await page.goto(storyUrl, { waitUntil: 'networkidle' });
const frameHandle = await page.waitForSelector('#storybook-preview-iframe');
const previewFrame = await frameHandle?.contentFrame();
if (!previewFrame) {
  throw new Error('Unable to locate Storybook preview frame');
}
await previewFrame.waitForSelector('[aria-label="Design token catalog"]');

const metrics = await previewFrame.evaluate(() => {
  const [nav] = performance.getEntriesByType('navigation');
  const paints = performance.getEntriesByType('paint');
  const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
  const firstContentfulPaint = paints.find((entry) => entry.name === 'first-contentful-paint');
  const lcp = lcpEntries.length ? lcpEntries[lcpEntries.length - 1] : undefined;
  return {
    domInteractive: nav?.domInteractive ?? 0,
    loadEventEnd: nav?.loadEventEnd ?? 0,
    firstContentfulPaint: firstContentfulPaint?.startTime ?? 0,
    largestContentfulPaint:
      (lcp && (lcp.renderTime || lcp.loadTime || lcp.startTime)) ??
      (nav?.loadEventEnd ?? 0),
  };
});

console.log(JSON.stringify(metrics, null, 2));

await browser.close();
