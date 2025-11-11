import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';
import {
  getCssVariableName,
  tokenCatalog,
  type DesignToken,
} from './lib/design-system/tokens';

interface NestedScale {
  [key: string]: string | NestedScale;
}

const setNestedValue = (
  scale: NestedScale,
  segments: string[],
  value: string,
): void => {
  const [head, ...rest] = segments;
  if (!head) return;
  if (rest.length === 0) {
    scale[head] = value;
    return;
  }
  if (!scale[head]) {
    scale[head] = {};
  }
  setNestedValue(scale[head] as NestedScale, rest, value);
};

const toCssVar = (token: DesignToken) => `var(${getCssVariableName(token.id)})`;

const colors = tokenCatalog.color.reduce<NestedScale>((acc, token) => {
  const path = token.id.replace(/^color\./, '').split('.');
  setNestedValue(acc, path, toCssVar(token));
  return acc;
}, {});

const spacing = tokenCatalog.spacing.reduce<Record<string, string>>(
  (acc, token) => {
    const key = token.id.replace(/^spacing\./, '');
    acc[key] = toCssVar(token);
    return acc;
  },
  {},
);

const radii = tokenCatalog.radii.reduce<Record<string, string>>(
  (acc, token) => {
    const key = token.id.replace(/^radii\./, '');
    acc[key] = toCssVar(token);
    return acc;
  },
  {},
);

const shadows = tokenCatalog.shadow.reduce<Record<string, string>>(
  (acc, token) => {
    const key = token.id.replace(/^shadow\./, '').replace(/\./g, '-');
    acc[key] = toCssVar(token);
    return acc;
  },
  {},
);

const typographyUtilities = tokenCatalog.typography.reduce<
  Record<string, Record<string, string>>
>((acc, token) => {
  const className = `.font-${token.id
    .replace(/^typography\./, '')
    .replace(/\./g, '-')}`;
  acc[className] = { font: toCssVar(token) };
  return acc;
}, {});

const config: Config = {
  content: [
    './app/**/*.{ts,tsx,js,jsx,mdx}',
    './components/**/*.{ts,tsx,js,jsx,mdx}',
    './lib/**/*.{ts,tsx,js,jsx}',
  ],
  theme: {
    extend: {
      colors,
      spacing,
      borderRadius: radii,
      boxShadow: shadows,
    },
  },
  plugins: [
    plugin(({ addUtilities }) => {
      addUtilities(typographyUtilities);
    }),
  ],
};

export default config;
