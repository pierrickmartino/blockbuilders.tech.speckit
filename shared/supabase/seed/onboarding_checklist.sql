-- Default onboarding checklist seed (minimum four steps + disclosures).

with upserted_checklist as (
    insert into onboarding_checklists (
        checklist_id,
        version,
        title,
        steps,
        is_active,
        disclosure_locale,
        definition_hash,
        definition_notes
    ) values (
        '00000000-0000-0000-0000-000000000004',
        1,
        'Blockbuilders onboarding v1',
        '[
            {
                "step_id": "disclosures",
                "sequence": 1,
                "title": "Review disclosures",
                "body": "Acknowledge trading risk disclosures before proceeding.",
                "requires_disclosure": true,
                "requires_template_edit": false,
                "cta_label": "Acknowledge",
                "template_id": null
            },
            {
                "step_id": "connect_data",
                "sequence": 2,
                "title": "Connect data sources",
                "body": "Link broker + market data so the workspace can stream quotes.",
                "requires_disclosure": false,
                "requires_template_edit": false,
                "cta_label": "Connect",
                "template_id": null
            },
            {
                "step_id": "select_template",
                "sequence": 3,
                "title": "Choose a starter template",
                "body": "Pick a curated strategy and edit one parameter before saving.",
                "requires_disclosure": false,
                "requires_template_edit": true,
                "cta_label": "Use template",
                "template_id": '00000000-0000-0000-0000-00000000a11a'
            },
            {
                "step_id": "run_backtest",
                "sequence": 4,
                "title": "Run your first backtest",
                "body": "Execute the primed strategy and review activation metrics.",
                "requires_disclosure": false,
                "requires_template_edit": false,
                "cta_label": "Run backtest",
                "template_id": null
            }
        ]'::jsonb,
        true,
        'en-US',
        md5('blockbuilders-onboarding-v1'),
        'Seeded during Phase 2 – reset required when version increments.'
    )
    on conflict (checklist_id, version)
    do update set
        title = excluded.title,
        steps = excluded.steps,
        is_active = excluded.is_active,
        disclosure_locale = excluded.disclosure_locale,
        definition_notes = excluded.definition_notes
    returning checklist_id, version
)
insert into onboarding_disclosures (locale, disclosure_copy, reviewer, reviewed_at, evidence_link)
values
    ('en-US', 'Trading strategies carry risk. Continuing confirms acceptance of the Blockbuilders Risk Statement.', 'Maya Patel', '2025-11-13', 'docs/qa/onboarding-checklist.md'),
    ('en-GB', 'Algorithmic strategies are not regulated financial advice. Overrides are audited.', 'Liam O''Connell', '2025-11-13', 'docs/qa/onboarding-checklist.md'),
    ('fr-FR', 'Les strategies automatiques comportent des risques de perte. Toute dérogation est consignée.', 'Camille Laurent', '2025-11-14', 'docs/qa/onboarding-checklist.md')
on conflict (locale) do update set
    disclosure_copy = excluded.disclosure_copy,
    reviewer = excluded.reviewer,
    reviewed_at = excluded.reviewed_at,
    evidence_link = excluded.evidence_link;

insert into feature_flags (flag_key, description, enabled)
values
    ('onboarding_checklist_v1', 'Enable the onboarding checklist modal + APIs', true)
on conflict (flag_key) do update set
    description = excluded.description,
    enabled = excluded.enabled;

insert into onboarding_reset_events (checklist_id, version, definition_hash, broadcast_topic)
select
    checklist_id,
    version,
    md5('blockbuilders-onboarding-v1'),
    'onboarding_checklist_reset'
from upserted_checklist
on conflict do nothing;
