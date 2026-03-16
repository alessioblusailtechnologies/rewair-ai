-- Integration configs
CREATE TABLE rewair_integration_configs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type            TEXT NOT NULL,
    label           TEXT NOT NULL,
    email_address   TEXT,
    credentials_enc TEXT,
    imap_host       TEXT DEFAULT 'imap.gmail.com',
    imap_port       INT DEFAULT 993,
    is_active       BOOLEAN DEFAULT FALSE,
    last_poll_at    TIMESTAMPTZ,
    last_poll_status TEXT,
    last_error      TEXT,
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE(type)
);

ALTER TABLE rewair_integration_configs ENABLE ROW LEVEL SECURITY;

-- Email processing logs
CREATE TABLE rewair_email_logs (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    integration_id  UUID NOT NULL REFERENCES rewair_integration_configs(id) ON DELETE CASCADE,
    message_uid     TEXT NOT NULL,
    from_address    TEXT NOT NULL,
    from_name       TEXT,
    subject         TEXT,
    received_at     TIMESTAMPTZ,
    is_order        BOOLEAN NOT NULL DEFAULT FALSE,
    order_id        UUID REFERENCES rewair_orders(id) ON DELETE SET NULL,
    ai_confidence   NUMERIC(3,2),
    ai_summary      TEXT,
    error_message   TEXT,
    status          TEXT NOT NULL DEFAULT 'processed',
    processed_at    TIMESTAMPTZ DEFAULT now(),
    UNIQUE(integration_id, message_uid)
);

ALTER TABLE rewair_email_logs ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_rewair_integrations_active ON rewair_integration_configs(is_active);
CREATE INDEX idx_rewair_email_logs_integration ON rewair_email_logs(integration_id);
CREATE INDEX idx_rewair_email_logs_processed ON rewair_email_logs(processed_at DESC);
