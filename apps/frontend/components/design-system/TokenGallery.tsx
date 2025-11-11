'use client';

import {
  getCssVariableName,
  listTokensByCategory,
  type DesignToken,
  type TokenCategory,
} from '@/lib/design-system/tokens';

const groupMetadata: Record<
  TokenCategory,
  { title: string; description: string }
> = {
  color: {
    title: 'Color',
    description:
      'Surface, text, and interaction colors with WCAG annotations for both themes.',
  },
  typography: {
    title: 'Typography',
    description: 'Semantic font pairings that components consume via utility classes.',
  },
  spacing: {
    title: 'Spacing',
    description: 'Consistent spacing scale for layout, padding, and gap utilities.',
  },
  radii: {
    title: 'Radii',
    description: 'Corner radii that align cards, buttons, and overlays.',
  },
  shadow: {
    title: 'Shadow',
    description: 'Elevation tokens that ensure consistent depth cues.',
  },
};

const tokens = listTokensByCategory();

function TokenCard({ token, category }: { token: DesignToken; category: TokenCategory }) {
  const cssVarName = getCssVariableName(token.id);
  const isColor = category === 'color';
  const isSpacing = category === 'spacing';
  const isRadii = category === 'radii';
  const isShadow = category === 'shadow';
  const isTypography = category === 'typography';

  return (
    <article className="rounded-xl border border-[color:var(--color-border-subtle)] bg-[color:var(--color-surface-card)] p-4 shadow-[var(--shadow-elevation-low)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="font-mono text-xs text-slate-500 dark:text-slate-400">
            {token.id}
          </p>
          <p className="font-semibold text-slate-900 dark:text-slate-100">
            {token.role}
          </p>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {token.description}
          </p>
        </div>
        {isColor && (
          <span
            aria-label={`${token.id} preview`}
            className="inline-flex h-12 w-12 items-center justify-center rounded-lg border border-[color:var(--color-border-subtle)]"
            style={{ backgroundColor: `var(${cssVarName})` }}
          />
        )}
        {isSpacing && (
          <div className="flex h-12 w-12 items-center justify-center">
            <span
              aria-hidden
              className="block rounded-full bg-[color:var(--color-action-primary)]"
              style={{ height: `var(${cssVarName})`, width: '0.375rem' }}
            />
          </div>
        )}
        {isRadii && (
          <span
            aria-hidden
            className="block h-12 w-12 border border-dashed border-[color:var(--color-action-primary)]"
            style={{ borderRadius: `var(${cssVarName})` }}
          />
        )}
        {isShadow && (
          <span
            aria-hidden
            className="block h-12 w-12 rounded-lg bg-[color:var(--color-surface-card)]"
            style={{ boxShadow: `var(${cssVarName})` }}
          />
        )}
        {isTypography && (
          <span
            className="text-right text-xs text-slate-500 dark:text-slate-400"
            style={{ font: `var(${cssVarName})` }}
          >
            Sample
          </span>
        )}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-3 text-xs font-medium text-slate-600 dark:text-slate-300">
        <div>
          <dt className="uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">
            Light theme
          </dt>
          <dd className="font-mono text-[11px]">{token.value}</dd>
        </div>
        <div>
          <dt className="uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">
            Dark theme
          </dt>
          <dd className="font-mono text-[11px]">{token.darkValue ?? token.value}</dd>
        </div>
        {token.wcagRatio && (
          <div>
            <dt className="uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">
              WCAG ratio
            </dt>
            <dd>{token.wcagRatio.toFixed(1)} : 1</dd>
          </div>
        )}
        {token.aliases.length > 0 && (
          <div>
            <dt className="uppercase tracking-wide text-[10px] text-slate-500 dark:text-slate-400">
              Aliases
            </dt>
            <dd className="font-mono text-[11px]">
              {token.aliases.join(', ')}
            </dd>
          </div>
        )}
      </dl>
    </article>
  );
}

export function TokenGallery() {
  const entries = Object.entries(tokens) as [TokenCategory, DesignToken[]][];
  const headingVar = getCssVariableName('typography.heading.md');
  const bodyVar = getCssVariableName('typography.body');

  return (
    <section aria-label="Design token catalog" className="space-y-12">
      {entries.map(([category, groupTokens]) => (
        <div key={category} className="space-y-4">
          <header>
            <p
              className="text-slate-900 dark:text-slate-100"
              style={{ font: `var(${headingVar})` }}
            >
              {groupMetadata[category].title}
            </p>
            <p
              className="text-slate-600 dark:text-slate-300"
              style={{ font: `var(${bodyVar})` }}
            >
              {groupMetadata[category].description}
            </p>
          </header>
          <div className="grid gap-4 md:grid-cols-2">
            {groupTokens.map((token) => (
              <TokenCard key={token.id} token={token} category={category} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

export default TokenGallery;
