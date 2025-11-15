create or replace function public.get_active_onboarding_checklist(
    p_user_id uuid,
    p_workspace_id uuid
) returns jsonb
language plpgsql
stable
as $$
declare
    active_record onboarding_checklists%rowtype;
    checklist_payload jsonb := '{}'::jsonb;
    aggregated_steps jsonb := '[]'::jsonb;
    user_version integer := null;
begin
    select * into active_record
    from onboarding_checklists
    where is_active
    order by version desc
    limit 1;

    if not found then
        return null;
    end if;

    select max(version) into user_version
    from checklist_step_progress
    where user_id = p_user_id
      and workspace_id = p_workspace_id
      and checklist_id = active_record.checklist_id;

    with step_defs as (
        select jsonb_array_elements(active_record.steps) as step
    ),
    progress as (
        select *
        from checklist_step_progress
        where checklist_id = active_record.checklist_id
          and version = active_record.version
          and user_id = p_user_id
          and workspace_id = p_workspace_id
    )
    select coalesce(jsonb_agg(
        jsonb_build_object(
            'stepId', step->>'step_id',
            'sequence', (step->>'sequence')::int,
            'title', step->>'title',
            'body', step->>'body',
            'requiresDisclosure', (step->>'requires_disclosure')::boolean,
            'requiresTemplateEdit', (step->>'requires_template_edit')::boolean,
            'ctaLabel', step->>'cta_label',
            'templateId', step->>'template_id',
            'status', coalesce(progress.status, 'NOT_STARTED'),
            'ackToken', progress.ack_token,
            'templateDiff', progress.template_diff,
            'completedAt', progress.completed_at,
            'overridePending', coalesce(progress.override_pending, false)
        )
        order by (step->>'sequence')::int
    ), '[]'::jsonb)
    into aggregated_steps
    from step_defs
    left join progress on progress.step_id = step->>'step_id';

    checklist_payload := jsonb_build_object(
        'checklistId', active_record.checklist_id,
        'version', active_record.version,
        'title', active_record.title,
        'definitionChanged', coalesce(user_version <> active_record.version, false),
        'disclosureLocale', active_record.disclosure_locale,
        'steps', aggregated_steps
    );

    return checklist_payload;
end;
$$;

