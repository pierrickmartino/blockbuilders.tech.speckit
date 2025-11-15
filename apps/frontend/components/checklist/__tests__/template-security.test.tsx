import { describe, expect, it } from 'vitest';

import { computeParameterDiff } from '../TemplateStep';

describe('template selection security guards', () => {
  const defaults = {
    riskTolerance: 'low',
    capitalAllocation: 25,
  };

  it('rejects submissions without parameter changes', () => {
    expect(() => computeParameterDiff(defaults, { ...defaults })).toThrow(/parameter/i);
  });

  it('rejects prototype-polluting keys', () => {
    expect(() =>
      computeParameterDiff(defaults, {
        ...defaults,
        __proto__: { hacked: true },
      }),
    ).toThrow(/invalid/i);
  });

  it('normalises numeric strings to numbers for downstream verification', () => {
    const diff = computeParameterDiff(defaults, {
      ...defaults,
      capitalAllocation: '40',
      riskTolerance: 'balanced',
    });

    expect(diff).toEqual({ capitalAllocation: 40, riskTolerance: 'balanced' });
  });
});
