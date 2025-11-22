-- Seed curated starter templates referenced by the onboarding checklist.

insert into starter_templates (
    template_id,
    title,
    description,
    estimated_run_time,
    default_parameters,
    react_flow_schema,
    status
) values
    (
        '00000000-0000-0000-0000-00000000a11a',
        'Momentum Starter',
        'Follows short-term momentum with built-in circuit breakers to avoid runaway losses.',
        '5 minutes',
        '{"riskTolerance":"low","capitalAllocation":25,"lookbackHours":12}'::jsonb,
        '{"nodes":[{"id":"n-source","type":"input","position":{"x":0,"y":0},"data":{"label":"Data source"}},{"id":"n-momentum","position":{"x":220,"y":40},"data":{"label":"Momentum filter"}},{"id":"n-risk","position":{"x":420,"y":0},"data":{"label":"Risk controls"}},{"id":"n-backtest","type":"output","position":{"x":640,"y":20},"data":{"label":"Backtest"}}],"edges":[{"id":"e-source-momentum","source":"n-source","target":"n-momentum"},{"id":"e-momentum-risk","source":"n-momentum","target":"n-risk"},{"id":"e-risk-backtest","source":"n-risk","target":"n-backtest"}]}'::jsonb,
        'ACTIVE'
    ),
    (
        '00000000-0000-0000-0000-00000000b00b',
        'Mean Reversion Guard',
        'Buys oversold assets with trailing stops and capital guards.',
        '7 minutes',
        '{"lookbackWindow":20,"entryZScore":-1.5,"stopLossPct":4}'::jsonb,
        '{"nodes":[{"id":"n-source","type":"input","position":{"x":0,"y":40},"data":{"label":"Prices"}},{"id":"n-zscore","position":{"x":200,"y":0},"data":{"label":"Z-score"}},{"id":"n-position","position":{"x":420,"y":30},"data":{"label":"Position sizing"}},{"id":"n-stop","type":"output","position":{"x":640,"y":40},"data":{"label":"Execution"}}],"edges":[{"id":"e-source-z","source":"n-source","target":"n-zscore"},{"id":"e-z-position","source":"n-zscore","target":"n-position"},{"id":"e-position-stop","source":"n-position","target":"n-stop"}]}'::jsonb,
        'ACTIVE'
    ),
    (
        '00000000-0000-0000-0000-00000000c0de',
        'Breakout Scout',
        'Detects volatility breakouts and routes trades to the pre-configured paper broker.',
        '6 minutes',
        '{"volatilityLookback":14,"entryThreshold":1.2,"capitalAllocation":40}'::jsonb,
        '{"nodes":[{"id":"n-source","type":"input","position":{"x":0,"y":0},"data":{"label":"Quotes"}},{"id":"n-vol","position":{"x":200,"y":-20},"data":{"label":"Volatility"}},{"id":"n-breakout","position":{"x":400,"y":20},"data":{"label":"Breakout detector"}},{"id":"n-exec","type":"output","position":{"x":620,"y":0},"data":{"label":"Execution"}}],"edges":[{"id":"e-source-vol","source":"n-source","target":"n-vol"},{"id":"e-vol-breakout","source":"n-vol","target":"n-breakout"},{"id":"e-breakout-exec","source":"n-breakout","target":"n-exec"}]}'::jsonb,
        'ACTIVE'
    )
on conflict (template_id) do update set
    title = excluded.title,
    description = excluded.description,
    estimated_run_time = excluded.estimated_run_time,
    default_parameters = excluded.default_parameters,
    react_flow_schema = excluded.react_flow_schema,
    status = excluded.status;
