export const PASSWORD_POLICY_MIN_LENGTH = 12;

const UPPERCASE_PATTERN = /[A-Z]/;
const LOWERCASE_PATTERN = /[a-z]/;
const NUMBER_PATTERN = /[0-9]/;
const SYMBOL_PATTERN = /[^A-Za-z0-9]/;

export type PasswordRequirementId =
  | 'minLength'
  | 'uppercase'
  | 'lowercase'
  | 'number'
  | 'symbol';

type RequirementDescriptor = {
  id: PasswordRequirementId;
  label: string;
  summaryLabel: string;
  helpText: string;
  test: (candidate: string) => boolean;
};

export interface PasswordRequirement {
  id: PasswordRequirementId;
  label: string;
  summaryLabel: string;
  helpText: string;
  met: boolean;
}

export type LegacyPasswordStatus =
  | 'compliant'
  | 'grace-period'
  | 'reset-required';

export interface LegacyPasswordGuidance {
  status: LegacyPasswordStatus;
  message: string;
  actionLabel: string;
  gracePeriodEndsAt?: string;
}

export interface PasswordPolicyOptions {
  legacy?: {
    isLegacyUser?: boolean;
    gracePeriodEndsAt?: Date | string | null;
    now?: Date;
  };
}

export interface PasswordPolicyResult {
  isValid: boolean;
  canContinue: boolean;
  requirements: PasswordRequirement[];
  failedRequirements: PasswordRequirement[];
  summary: string;
  guidance: string[];
  legacy?: LegacyPasswordGuidance;
}

const REQUIREMENT_DESCRIPTORS: RequirementDescriptor[] = [
  {
    id: 'minLength',
    label: `Use at least ${PASSWORD_POLICY_MIN_LENGTH} characters`,
    summaryLabel: `at least ${PASSWORD_POLICY_MIN_LENGTH} characters`,
    helpText: `Passwords must include at least ${PASSWORD_POLICY_MIN_LENGTH} characters.`,
    test: (candidate) => candidate.length >= PASSWORD_POLICY_MIN_LENGTH,
  },
  {
    id: 'uppercase',
    label: 'Add an uppercase letter (A-Z)',
    summaryLabel: 'an uppercase letter',
    helpText: 'Include at least one uppercase letter (A-Z).',
    test: (candidate) => UPPERCASE_PATTERN.test(candidate),
  },
  {
    id: 'lowercase',
    label: 'Add a lowercase letter (a-z)',
    summaryLabel: 'a lowercase letter',
    helpText: 'Include at least one lowercase letter (a-z).',
    test: (candidate) => LOWERCASE_PATTERN.test(candidate),
  },
  {
    id: 'number',
    label: 'Add a number (0-9)',
    summaryLabel: 'a number',
    helpText: 'Include at least one number (0-9).',
    test: (candidate) => NUMBER_PATTERN.test(candidate),
  },
  {
    id: 'symbol',
    label: 'Add a symbol (e.g. !, @, #, ?)',
    summaryLabel: 'a symbol',
    helpText: 'Include at least one symbol, such as !, @, #, or ?.',
    test: (candidate) => SYMBOL_PATTERN.test(candidate),
  },
];

export const PASSWORD_POLICY_BULLET_POINTS = REQUIREMENT_DESCRIPTORS.map(
  ({ label }) => label,
);

const formatList = (items: string[]): string => {
  if (items.length === 0) {
    return '';
  }

  if (items.length === 1) {
    return items[0];
  }

  if (items.length === 2) {
    return `${items[0]} and ${items[1]}`;
  }

  const allButLast = items.slice(0, -1).join(', ');
  const lastItem = items[items.length - 1];
  return `${allButLast}, and ${lastItem}`;
};

const formatHumanDate = (date: Date): string => {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date);
};

const normalizePassword = (password: string): string =>
  typeof password === 'string' ? password : '';

const coerceDate = (
  input: Date | string | null | undefined,
): Date | undefined => {
  if (!input) {
    return undefined;
  }

  if (input instanceof Date) {
    return input;
  }

  const timestamp = Date.parse(input);
  if (Number.isNaN(timestamp)) {
    return undefined;
  }

  return new Date(timestamp);
};

const buildLegacyGuidance = (
  isValid: boolean,
  options: PasswordPolicyOptions['legacy'],
): { guidance?: LegacyPasswordGuidance; canContinueOverride?: boolean } => {
  if (!options?.isLegacyUser) {
    return {};
  }

  const now = options.now ?? new Date();
  const gracePeriod = coerceDate(options.gracePeriodEndsAt);
  const inGracePeriod =
    !isValid && gracePeriod !== undefined && gracePeriod.getTime() > now.getTime();

  if (isValid) {
    return {
      guidance: {
        status: 'compliant',
        message:
          'Thanks for updating your password — your account now meets the new security policy.',
        actionLabel: 'Continue',
        gracePeriodEndsAt: gracePeriod?.toISOString(),
      },
    };
  }

  if (inGracePeriod && gracePeriod) {
    return {
      guidance: {
        status: 'grace-period',
        message: `You can keep working with your current password today, but please reset it before ${formatHumanDate(
          gracePeriod,
        )} to stay signed in.`,
        actionLabel: 'Reset password now',
        gracePeriodEndsAt: gracePeriod?.toISOString(),
      },
      canContinueOverride: true,
    };
  }

  return {
    guidance: {
      status: 'reset-required',
      message:
        'For security, please reset your password now to meet the 12-character complexity policy.',
      actionLabel: 'Reset password to continue',
      gracePeriodEndsAt: gracePeriod?.toISOString(),
    },
    canContinueOverride: false,
  };
};

export const evaluatePasswordPolicy = (
  password: string,
  options: PasswordPolicyOptions = {},
): PasswordPolicyResult => {
  const candidate = normalizePassword(password);

  const requirements: PasswordRequirement[] = REQUIREMENT_DESCRIPTORS.map(
    ({ helpText, id, label, summaryLabel, test }) => ({
      id,
      label,
      summaryLabel,
      helpText,
      met: test(candidate),
    }),
  );

  const failedRequirements = requirements.filter((requirement) => !requirement.met);
  const isValid = failedRequirements.length === 0;

  const summary = isValid
    ? 'Password meets the 12-character complexity policy.'
    : `Add ${formatList(
        failedRequirements.map((requirement) => requirement.summaryLabel),
      )} to meet the password policy.`;

  const guidance = failedRequirements.length
    ? failedRequirements.map((requirement) => requirement.helpText)
    : [
        'Keep your password unique to this account and rotate it periodically.',
      ];

  const legacyOutcome = buildLegacyGuidance(isValid, options.legacy);

  const canContinue =
    legacyOutcome.canContinueOverride ?? isValid;

  return {
    isValid,
    canContinue,
    requirements,
    failedRequirements,
    summary,
    guidance,
    legacy: legacyOutcome.guidance,
  };
};
