export type TokenCategory =
  | 'color'
  | 'typography'
  | 'spacing'
  | 'radii'
  | 'shadow';

export type TokenRole =
  | 'background'
  | 'foreground'
  | 'content'
  | 'layout'
  | 'border'
  | 'motion'
  | 'action'
  | 'focus'
  | 'surface';

export type TokenStatus = 'draft' | 'approved' | 'deprecated';

export interface DesignToken {
  id: string;
  category: TokenCategory;
  role: TokenRole;
  value: string;
  darkValue?: string;
  description: string;
  wcagRatio?: number;
  aliases: string[];
  status: TokenStatus;
  version: string;
}

export type TokenRegistry = Record<TokenCategory, DesignToken[]>;

const colorTokens: DesignToken[] = [
  {
    id: 'color.background.canvas',
    category: 'color',
    role: 'background',
    value: '#FFFFFF',
    darkValue: '#0B1220',
    description: 'Primary application background surface.',
    aliases: ['surface.default'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'color.surface.card',
    category: 'color',
    role: 'surface',
    value: '#F8FAFF',
    darkValue: '#111C2E',
    description: 'Elevated cards and token gallery rows.',
    aliases: ['surface.card'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'color.content.primary',
    category: 'color',
    role: 'content',
    value: '#0F172A',
    darkValue: '#F8FAFC',
    description: 'Default body text that pairs with both surfaces.',
    wcagRatio: 12.8,
    aliases: ['text.primary'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'color.content.inverse',
    category: 'color',
    role: 'content',
    value: '#F8FAFC',
    darkValue: '#0F172A',
    description: 'Text on brand or dark backgrounds.',
    wcagRatio: 12.8,
    aliases: ['text.inverse'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'color.action.primary',
    category: 'color',
    role: 'action',
    value: '#1A56DB',
    darkValue: '#7AA5FF',
    description: 'Primary interactive affordances and focus tints.',
    wcagRatio: 4.9,
    aliases: ['button.primary.background'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'color.border.subtle',
    category: 'color',
    role: 'border',
    value: '#CBD5F5',
    darkValue: '#1F2C46',
    description: 'Token cards and component dividers.',
    aliases: ['border.default'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'color.focus.ring',
    category: 'color',
    role: 'focus',
    value: '#4C7CFF',
    darkValue: '#9BB9FF',
    description: 'Accessible focus outline with 3:1 contrast on surfaces.',
    wcagRatio: 3.5,
    aliases: ['focus.visible'],
    status: 'approved',
    version: '1.0.0',
  },
];

const typographyTokens: DesignToken[] = [
  {
    id: 'typography.heading.lg',
    category: 'typography',
    role: 'content',
    value: '600 2rem/1.2 "Inter", system-ui',
    description: 'Large token headings in docs.',
    aliases: ['heading.lg'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'typography.heading.md',
    category: 'typography',
    role: 'content',
    value: '600 1.5rem/1.3 "Inter", system-ui',
    description: 'Section headings and component names.',
    aliases: ['heading.md'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'typography.body',
    category: 'typography',
    role: 'content',
    value: '400 1rem/1.6 "Inter", system-ui',
    description: 'Default body copy.',
    aliases: ['text.body'],
    status: 'approved',
    version: '1.0.0',
  },
];

const spacingTokens: DesignToken[] = [
  {
    id: 'spacing.xs',
    category: 'spacing',
    role: 'layout',
    value: '0.25rem',
    description: 'Tight spacing for icon padding.',
    aliases: ['space.xs'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'spacing.sm',
    category: 'spacing',
    role: 'layout',
    value: '0.5rem',
    description: 'Compact gutter spacing.',
    aliases: ['space.sm'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'spacing.md',
    category: 'spacing',
    role: 'layout',
    value: '1rem',
    description: 'Default stack spacing.',
    aliases: ['space.md'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'spacing.lg',
    category: 'spacing',
    role: 'layout',
    value: '1.5rem',
    description: 'Block spacing for sections.',
    aliases: ['space.lg'],
    status: 'approved',
    version: '1.0.0',
  },
];

const radiiTokens: DesignToken[] = [
  {
    id: 'radii.sm',
    category: 'radii',
    role: 'layout',
    value: '0.375rem',
    description: 'Small controls.',
    aliases: ['radius.sm'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'radii.lg',
    category: 'radii',
    role: 'layout',
    value: '0.75rem',
    description: 'Cards and modals.',
    aliases: ['radius.lg'],
    status: 'approved',
    version: '1.0.0',
  },
];

const shadowTokens: DesignToken[] = [
  {
    id: 'shadow.elevation.low',
    category: 'shadow',
    role: 'motion',
    value: '0 10px 15px -3px rgba(15, 23, 42, 0.08)',
    description: 'Card shadows on light mode.',
    aliases: ['shadow.card'],
    status: 'approved',
    version: '1.0.0',
  },
  {
    id: 'shadow.elevation.high',
    category: 'shadow',
    role: 'motion',
    value: '0 25px 50px -12px rgba(15, 23, 42, 0.32)',
    description: 'Modal shadows with overlay.',
    aliases: ['shadow.overlay'],
    status: 'approved',
    version: '1.0.0',
  },
];

export const tokenCatalog: TokenRegistry = {
  color: colorTokens,
  typography: typographyTokens,
  spacing: spacingTokens,
  radii: radiiTokens,
  shadow: shadowTokens,
};

export const designTokens = Object.freeze(
  Object.values(tokenCatalog).flatMap((group) => group),
);

export const MINIMUM_CONTRAST_RATIO_AA = 4.5;

export const MINIMUM_CONTRAST_RATIO_UI = 3.0;

export function listTokensByCategory(): TokenRegistry {
  return tokenCatalog;
}

export function getCssVariableName(tokenOrId: string | DesignToken): string {
  const id = typeof tokenOrId === 'string' ? tokenOrId : tokenOrId.id;
  return `--${id.replace(/\./g, '-')}`;
}

export function findTokenById(id: string): DesignToken | undefined {
  return designTokens.find((token) => token.id === id);
}
