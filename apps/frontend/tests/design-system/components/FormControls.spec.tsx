import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Input } from '@/components/design-system/Input';
import { Select } from '@/components/design-system/Select';

const extractAttr = (markup: string, attr: string) => {
  const regex = new RegExp(`${attr}="([^"]+)"`);
  return regex.exec(markup)?.[1] ?? null;
};

describe('Design System form controls', () => {
  it('annotates input error and focus tokens', () => {
    const markup = renderToStaticMarkup(
      <Input
        id="email"
        label="Email address"
        placeholder="you@example.com"
        helperText="We will never spam you."
        error="Email already exists"
      />,
    );

    expect(extractAttr(markup, 'aria-invalid')).toBe('true');
    expect(extractAttr(markup, 'aria-describedby')).toContain('email-helper');
    expect(extractAttr(markup, 'aria-describedby')).toContain('email-error');
    expect(extractAttr(markup, 'data-slot-border')).toBe('color.border.emphasis');
    expect(extractAttr(markup, 'data-slot-focus')).toBe('color.focus.ring');
    expect(extractAttr(markup, 'data-slot-error')).toBe('color.state.error.border');
  });

  it('exposes select tokens for filled state', () => {
    const markup = renderToStaticMarkup(
      <Select
        id="favorite-language"
        label="Language"
        placeholder="Choose an option"
        options={[
          { label: 'TypeScript', value: 'ts' },
          { label: 'Python', value: 'py' },
        ]}
        value="ts"
        onValueChange={() => undefined}
      />,
    );

    expect(extractAttr(markup, 'data-slot-background')).toBe('color.surface.card');
    expect(extractAttr(markup, 'data-slot-border')).toBe('color.border.emphasis');
    expect(extractAttr(markup, 'data-slot-focus')).toBe('color.focus.ring');
  });
});
