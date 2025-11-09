import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Button } from '@/components/design-system/Button';

const getAttr = (markup: string, attr: string) => {
  const regex = new RegExp(`${attr}="([^"]+)"`);
  return regex.exec(markup)?.[1] ?? null;
};

describe('Design System Button tokens', () => {
  it('exposes token mappings for the primary variant', () => {
    const markup = renderToStaticMarkup(<Button>Submit request</Button>);

    expect(getAttr(markup, 'data-slot-background')).toBe('color.action.primary');
    expect(getAttr(markup, 'data-slot-foreground')).toBe('color.content.inverse');
    expect(getAttr(markup, 'data-slot-focus')).toBe('color.focus.ring');
  });

  it('switches tokens per variant', () => {
    const markup = renderToStaticMarkup(
      <Button variant="secondary">Open invite</Button>,
    );

    expect(getAttr(markup, 'data-slot-background')).toBe('color.action.secondary');
    expect(getAttr(markup, 'data-slot-border')).toBe('color.border.emphasis');
    expect(getAttr(markup, 'data-slot-foreground')).toBe('color.content.primary');
  });

  it('annotates loading state for accessibility tooling', () => {
    const markup = renderToStaticMarkup(
      <Button loading disabled>
        Saving changes
      </Button>,
    );

    expect(getAttr(markup, 'aria-disabled')).toBe('true');
    expect(getAttr(markup, 'data-state')).toBe('loading');
    expect(getAttr(markup, 'data-slot-progress')).toBe('color.action.primary');
  });
});
