create or replace function public.reset_onboarding_progress(
    p_user_id uuid,
    p_workspace_id uuid
) returns setof checklist_step_progress
language plpgsql
as $$
declare
    active_record onboarding_checklists%rowtype;
    step jsonb;
    upserted checklist_step_progress%rowtype;
begin
    select * into active_record
    from onboarding_checklists
    where is_active
    order by version desc
    limit 1;

    if not found then
        raise exception 'no_active_checklist';
    end if;

    delete from checklist_step_progress
    where checklist_id = active_record.checklist_id
      and user_id = p_user_id
      and workspace_id = p_workspace_id
      and version < active_record.version;

    for step in select jsonb_array_elements(active_record.steps)
    loop
        insert into checklist_step_progress (
            checklist_id,
            version,
            user_id,
            workspace_id,
            step_id,
            status,
            ack_token,
            template_diff,
            completed_at,
            completed_by,
            override_reason,
            override_actor_role,
            override_pending,
            updated_at
        ) values (
            active_record.checklist_id,
            active_record.version,
            p_user_id,
            p_workspace_id,
            step->>'step_id',
            'NOT_STARTED',
            null,
            null,
            null,
            null,
            null,
            null,
            false,
            now()
        )
        on conflict (user_id, workspace_id, version, step_id)
        do update set
            status = 'NOT_STARTED',
            ack_token = null,
            template_diff = null,
            completed_at = null,
            completed_by = null,
            override_reason = null,
            override_actor_role = null,
            override_pending = false,
            updated_at = now()
        returning * into upserted;

        return next upserted;
    end loop;

    return;
end;
$$;

