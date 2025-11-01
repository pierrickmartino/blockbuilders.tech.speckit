import { z } from 'zod';

const EnvSchema = z.object({
  NEXT_PUBLIC_APP_ENV: z
    .string()
    .trim()
    .toLowerCase()
    .transform((value) => value as EnvName)
    .pipe(
      z.enum(['local', 'ci', 'staging', 'production'], {
        errorMap: () => ({
          message:
            'NEXT_PUBLIC_APP_ENV must be one of local, ci, staging, or production.',
        }),
      }),
    )
    .default('local'),
});

export type EnvName = 'local' | 'ci' | 'staging' | 'production';

export type ValidatedEnv = z.infer<typeof EnvSchema>;

let cachedEnv: ValidatedEnv | undefined;

export const loadEnv = (): ValidatedEnv => {
  if (cachedEnv) {
    return cachedEnv;
  }

  const env = EnvSchema.parse(process.env);
  cachedEnv = env;
  return env;
};

export const envNameToLabel = (name: EnvName): string => {
  switch (name) {
    case 'local':
      return 'Local';
    case 'ci':
      return 'Continuous Integration';
    case 'staging':
      return 'Staging';
    case 'production':
      return 'Production';
    default:
      return 'Unknown';
  }
};
