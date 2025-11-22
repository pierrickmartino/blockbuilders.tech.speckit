#!/usr/bin/env tsx
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

type FetchOptions = Parameters<typeof fetch>[1];

interface StepDefinition {
  step_id: string;
  sequence: number;
  title: string;
  body: string;
  requires_disclosure: boolean;
  requires_template_edit: boolean;
  cta_label: string;
  template_id: string | null;
}

interface SeedConfig {
  supabaseUrl: string;
  serviceKey: string;
  featureFlag: string;
  resetTopic: string;
}

interface LocaleApprovalEntry {
  locale: string;
  reviewer: string;
  role: string;
  decisionDate: string;
  evidenceLink: string;
}

const CHECKLIST_ID = '00000000-0000-0000-0000-000000000004';
const TEMPLATE_ID = '00000000-0000-0000-0000-00000000a11a';

const steps: StepDefinition[] = [
  {
    step_id: 'disclosures',
    sequence: 1,
    title: 'Review disclosures',
    body: 'Acknowledge trading risk disclosures before proceeding.',
    requires_disclosure: true,
    requires_template_edit: false,
    cta_label: 'Acknowledge',
    template_id: null,
  },
  {
    step_id: 'connect_data',
    sequence: 2,
    title: 'Connect data sources',
    body: 'Link broker + market data so the workspace can stream quotes.',
    requires_disclosure: false,
    requires_template_edit: false,
    cta_label: 'Connect',
    template_id: null,
  },
  {
    step_id: 'select_template',
    sequence: 3,
    title: 'Choose a starter template',
    body: 'Pick a curated strategy and edit one parameter before saving.',
    requires_disclosure: false,
    requires_template_edit: true,
    cta_label: 'Use template',
    template_id: TEMPLATE_ID,
  },
  {
    step_id: 'run_backtest',
    sequence: 4,
    title: 'Run your first backtest',
    body: 'Execute the primed strategy and review activation metrics.',
    requires_disclosure: false,
    requires_template_edit: false,
    cta_label: 'Run backtest',
    template_id: null,
  },
];

const disclosures = [
  {
    locale: 'en-US',
    disclosure_copy:
      'Trading strategies carry risk. Continuing confirms acceptance of the Blockbuilders Risk Statement.',
    reviewer: 'Maya Patel',
    reviewed_at: '2025-11-13',
    evidence_link: 'docs/qa/onboarding-checklist.md',
  },
  {
    locale: 'en-GB',
    disclosure_copy:
      'Algorithmic strategies are not regulated financial advice. Overrides are audited.',
    reviewer: "Liam O'Connell",
    reviewed_at: '2025-11-13',
    evidence_link: 'docs/qa/onboarding-checklist.md',
  },
  {
    locale: 'fr-FR',
    disclosure_copy:
      'Les strategies automatiques comportent des risques de perte. Toute dérogation est consignée.',
    reviewer: 'Camille Laurent',
    reviewed_at: '2025-11-14',
    evidence_link: 'docs/qa/onboarding-checklist.md',
  },
];

const argv = parseArgs({
  options: {
    bootstrap: { type: 'boolean', default: false },
    flagsOnly: { type: 'boolean', default: false },
    seedOnly: { type: 'boolean', default: false },
    workspace: { type: 'string' },
  },
});

const mode = argv.values.flagsOnly
  ? 'flags'
  : argv.values.seedOnly
    ? 'seed'
    : 'bootstrap';

const config: SeedConfig = {
  supabaseUrl: requiredEnv('SUPABASE_URL'),
  serviceKey: requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  featureFlag: process.env.ONBOARDING_CHECKLIST_FEATURE_FLAG ?? 'onboarding_checklist_v1',
  resetTopic: process.env.ONBOARDING_RESET_BROADCAST_TOPIC ?? 'onboarding_checklist_reset',
};

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const approvalDocRelative = 'docs/qa/onboarding-checklist.md';
const approvalDocPath = path.resolve(repoRoot, approvalDocRelative);

const templatesSource = path.resolve(repoRoot, 'shared/templates/starter_templates.json');

async function main() {
  const starterTemplates = await loadStarterTemplates();
  const approvals = await loadLocaleApprovals();

  if (mode === 'flags') {
    console.log('> Seeding feature flag toggle only');
    await seedFeatureFlag(argv.values.workspace ?? process.env.ONBOARDING_SEED_WORKSPACE_ID ?? null);
    return;
  }

  if (mode === 'seed') {
    console.log('> Seeding checklist + disclosures only');
    await seedChecklist();
    await seedDisclosures(approvals);
    await seedTemplates(starterTemplates);
    await recordResetEvent();
    return;
  }

  console.log('> Bootstrapping checklist, disclosures, flags, and reset broadcast');
  await seedChecklist();
  await seedDisclosures(approvals);
  await seedTemplates(starterTemplates);
  await seedFeatureFlag(argv.values.workspace ?? process.env.ONBOARDING_SEED_WORKSPACE_ID ?? null);
  await recordResetEvent();
}

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    console.error(`Missing required env var ${name}`);
    process.exitCode = 1;
    throw new Error(`Missing required env var ${name}`);
  }
  return value;
}

async function seedChecklist() {
  const definitionHash = createHash('md5').update(JSON.stringify(steps)).digest('hex');
  await request('/rest/v1/onboarding_checklists', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      checklist_id: CHECKLIST_ID,
      version: 1,
      title: 'Blockbuilders onboarding v1',
      steps,
      is_active: true,
      disclosure_locale: 'en-US',
      definition_hash: definitionHash,
      definition_notes: 'Seeded via scripts/seed-onboarding.ts',
    }),
  });
}

async function seedDisclosures(approvals: Map<string, LocaleApprovalEntry>) {
  for (const disclosure of disclosures) {
    ensureLocaleApproval(disclosure.locale, approvals);
    await request('/rest/v1/onboarding_disclosures', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify(disclosure),
    });
  }
}

async function seedFeatureFlag(workspaceId: string | null) {
  const payload: Record<string, unknown> = {
    flag_key: config.featureFlag,
    description: 'Enable onboarding checklist modal + APIs',
    enabled: true,
  };

  if (workspaceId) {
    payload.workspace_id = workspaceId;
  }

  await request('/rest/v1/feature_flags', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify(payload),
  });
}

async function recordResetEvent() {
  const definitionHash = createHash('md5').update(JSON.stringify(steps)).digest('hex');
  await request('/rest/v1/onboarding_reset_events', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates',
    },
    body: JSON.stringify({
      checklist_id: CHECKLIST_ID,
      version: 1,
      definition_hash: definitionHash,
      broadcast_topic: config.resetTopic,
    }),
  });
}

async function request(path: string, init: FetchOptions) {
  const response = await fetch(`${config.supabaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: config.serviceKey,
      Authorization: `Bearer ${config.serviceKey}`,
      ...(init.headers ?? {}),
    },
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`Supabase request failed: ${response.status} ${response.statusText}\n${details}`);
  }
}

main().catch((error) => {
  console.error('[seed-onboarding] failed:', error);
  process.exitCode = 1;
});

async function loadStarterTemplates() {
  const raw = await readFile(templatesSource, 'utf-8');
  return JSON.parse(raw) as StarterTemplateDefinition[];
}

interface StarterTemplateDefinition {
  template_id: string;
  title: string;
  description: string;
  estimated_run_time_minutes: number;
  default_parameters: Record<string, unknown>;
  react_flow: Record<string, unknown>;
}

async function seedTemplates(definitions: StarterTemplateDefinition[]) {
  console.log(`> Seeding ${definitions.length} starter templates`);
  for (const template of definitions) {
    await request('/rest/v1/starter_templates', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        template_id: template.template_id,
        title: template.title,
        description: template.description,
        estimated_run_time: `${template.estimated_run_time_minutes} minutes`,
        default_parameters: template.default_parameters,
        react_flow_schema: template.react_flow,
        status: 'ACTIVE',
      }),
    });
  }
}

async function loadLocaleApprovals(): Promise<Map<string, LocaleApprovalEntry>> {
  try {
    const raw = await readFile(approvalDocPath, 'utf-8');
    const approvals = new Map<string, LocaleApprovalEntry>();
    const pattern = /^\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|\s*([^|]+)\|/;
    for (const line of raw.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('|')) {
        continue;
      }
      const match = pattern.exec(trimmed);
      if (!match) {
        continue;
      }
      const locale = match[1].trim();
      if (locale.toLowerCase() === 'locale') {
        continue;
      }
      approvals.set(locale, {
        locale,
        reviewer: cleanCell(match[2]),
        role: cleanCell(match[3]),
        decisionDate: cleanCell(match[4]),
        evidenceLink: cleanCell(match[5]) || approvalDocRelative,
      });
    }
    return approvals;
  } catch (error) {
    console.warn(`[seed-onboarding] Unable to parse ${approvalDocRelative}:`, error);
    return new Map<string, LocaleApprovalEntry>();
  }
}

function ensureLocaleApproval(locale: string, approvals: Map<string, LocaleApprovalEntry>) {
  const approval = approvals.get(locale);
  if (!approval || !approval.reviewer || !approval.decisionDate) {
    throw new Error(
      `[seed-onboarding] Locale ${locale} is missing approval metadata. Update ${approvalDocRelative} before seeding.`,
    );
  }
}

function cleanCell(value: string): string {
  const trimmed = value.trim();
  if (trimmed.startsWith('`') && trimmed.endsWith('`')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}
