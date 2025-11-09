export type ClassInput =
  | string
  | number
  | null
  | undefined
  | ClassInput[]
  | Record<string, boolean | undefined | null>;

const toClassList = (input: ClassInput): string[] => {
  if (!input) {
    return [];
  }
  if (typeof input === 'string' || typeof input === 'number') {
    return [`${input}`];
  }
  if (Array.isArray(input)) {
    return input.flatMap(toClassList);
  }
  return Object.entries(input)
    .filter(([, value]) => Boolean(value))
    .map(([key]) => key);
};

export const cn = (...inputs: ClassInput[]): string =>
  inputs.flatMap(toClassList).filter(Boolean).join(' ');
