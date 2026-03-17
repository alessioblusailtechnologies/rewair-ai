-- AI Agents — user-defined automations created via natural language
CREATE TABLE rewair_agents (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name            TEXT NOT NULL,
    description     TEXT,
    agent_type      TEXT NOT NULL DEFAULT 'custom',
    system_prompt   TEXT,
    trigger_type    TEXT NOT NULL DEFAULT 'manual',
    schedule_cron   TEXT,
    status          TEXT NOT NULL DEFAULT 'active',
    last_run_at     TIMESTAMPTZ,
    last_run_status TEXT,
    last_error      TEXT,
    config          JSONB DEFAULT '{}',
    created_via     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rewair_agent_executions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    agent_id        UUID NOT NULL REFERENCES rewair_agents(id) ON DELETE CASCADE,
    started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at    TIMESTAMPTZ,
    status          TEXT NOT NULL DEFAULT 'running',
    output          JSONB,
    error_message   TEXT
);

ALTER TABLE rewair_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_agent_executions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rewair_agents_status ON rewair_agents(status);
CREATE INDEX idx_rewair_agent_executions_agent ON rewair_agent_executions(agent_id);
CREATE INDEX idx_rewair_agent_executions_date ON rewair_agent_executions(started_at DESC);
