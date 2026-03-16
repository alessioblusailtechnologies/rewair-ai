-- ============================================================================
-- REWAIR — WORKFORCE PLANNING DATABASE
-- Target: Supabase (PostgreSQL)
-- Prefisso tabelle: rewair_
-- ============================================================================
-- Flusso produttivo RewAir (lineare, sempre uguale):
--   1. CUTTING    (Lectra 1-3)         — taglio tessuti / fibra di vetro
--   2. ASSEMBLY   (ASM Big 1-4, ASM Small 1-2, CSM 1-2) — assemblaggio kit
--   3. TAGGING    (Tagging 1-4)        — etichettatura e confezionamento
-- ============================================================================

-- Abilita UUID se non già abilitato
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. ANAGRAFICHE
-- ============================================================================

-- Fasi del flusso produttivo (sempre le stesse per tutti i prodotti)
CREATE TABLE rewair_workflow_phases (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,       -- 'cutting', 'assembly', 'tagging'
    name            TEXT NOT NULL,
    sequence_order  INT NOT NULL,               -- 1, 2, 3
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Tipi di turno
CREATE TABLE rewair_shift_types (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,               -- 'Mattina', 'Pomeriggio', 'Notte'
    start_time      TIME NOT NULL,
    end_time        TIME NOT NULL,
    break_minutes   INT DEFAULT 30,
    net_hours       NUMERIC(4,1) NOT NULL,       -- ore effettive
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Competenze / certificazioni operatori
CREATE TABLE rewair_skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    phase_code      TEXT REFERENCES rewair_workflow_phases(code), -- a quale fase è legata
    description     TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 2. MACCHINE (il capannone RewAir)
-- ============================================================================

CREATE TABLE rewair_machines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,        -- 'LECTRA_1', 'ASM_BIG_2', ecc.
    name            TEXT NOT NULL,               -- 'Lectra 1', 'ASM Big 2', ecc.
    machine_type    TEXT NOT NULL,               -- 'lectra', 'asm_big', 'asm_small', 'csm', 'tagging'
    phase_code      TEXT NOT NULL REFERENCES rewair_workflow_phases(code),
    avg_operators   NUMERIC(3,1),                -- operatori medi necessari (NULL se TBD)
    avg_shifts      NUMERIC(3,1),                -- turni medi giornalieri (NULL se TBD)
    capacity_units_per_shift NUMERIC(10,1),      -- capacità nominale per turno
    is_active       BOOLEAN DEFAULT TRUE,        -- false = TBD / non ancora operativa
    prefab_avg_3w   NUMERIC(10,1),               -- produzione media ultime 3 settimane Prefab
    shell_avg_3w    NUMERIC(10,1),               -- produzione media ultime 3 settimane Shell
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Skill richieste per operare una macchina
CREATE TABLE rewair_machine_skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id      UUID NOT NULL REFERENCES rewair_machines(id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES rewair_skills(id),
    min_operators   INT DEFAULT 1,               -- quanti operatori con questa skill servono
    UNIQUE(machine_id, skill_id)
);

-- Fermi macchina (manutenzione, guasti, changeover)
CREATE TABLE rewair_machine_downtime (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    machine_id      UUID NOT NULL REFERENCES rewair_machines(id) ON DELETE CASCADE,
    start_at        TIMESTAMPTZ NOT NULL,
    end_at          TIMESTAMPTZ NOT NULL,
    reason          TEXT NOT NULL,               -- 'maintenance', 'breakdown', 'changeover', 'cleaning'
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 3. WORKFORCE (operatori)
-- ============================================================================

CREATE TABLE rewair_workers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_code   TEXT UNIQUE NOT NULL,
    first_name      TEXT NOT NULL,
    last_name       TEXT NOT NULL,
    email           TEXT,
    contract_type   TEXT DEFAULT 'permanent',    -- 'permanent', 'temporary', 'agency', 'seasonal'
    hire_date       DATE NOT NULL,
    end_date        DATE,
    hourly_cost     NUMERIC(8,2),                -- costo orario azienda (€)
    weekly_hours    NUMERIC(4,1) DEFAULT 40,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- Competenze di ogni operatore
CREATE TABLE rewair_worker_skills (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id       UUID NOT NULL REFERENCES rewair_workers(id) ON DELETE CASCADE,
    skill_id        UUID NOT NULL REFERENCES rewair_skills(id),
    proficiency     INT NOT NULL CHECK (proficiency BETWEEN 1 AND 4),
                    -- 1=base, 2=intermedio, 3=avanzato, 4=esperto
    certified       BOOLEAN DEFAULT FALSE,
    certification_expiry DATE,
    UNIQUE(worker_id, skill_id)
);

-- Disponibilità giornaliera per turno
CREATE TABLE rewair_worker_availability (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id       UUID NOT NULL REFERENCES rewair_workers(id) ON DELETE CASCADE,
    date            DATE NOT NULL,
    shift_type_id   UUID REFERENCES rewair_shift_types(id),
    status          TEXT NOT NULL DEFAULT 'available',
                    -- 'available', 'vacation', 'sick', 'training', 'unavailable'
    notes           TEXT,
    UNIQUE(worker_id, date, shift_type_id)
);

-- ============================================================================
-- 4. PRODOTTI (kit RewAir)
-- ============================================================================

CREATE TABLE rewair_products (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sku             TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    product_type    TEXT NOT NULL,               -- 'prefab', 'shell'
    kit_category    TEXT,                        -- 'glass_kit', 'core_kit', 'vacuum_kit', 'cover'
    unit_of_measure TEXT DEFAULT 'kit',
    -- Tempi standard per fase (minuti per unità)
    cutting_time_min    NUMERIC(8,2),            -- tempo su Lectra per kit
    assembly_time_min   NUMERIC(8,2),            -- tempo su ASM/CSM per kit
    tagging_time_min    NUMERIC(8,2),            -- tempo tagging per kit
    -- Macchine compatibili (tipo)
    assembly_machine_type TEXT,                  -- 'asm_big', 'asm_small', 'csm'
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 5. ORDINI
-- ============================================================================

CREATE TABLE rewair_customers (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code            TEXT UNIQUE NOT NULL,
    name            TEXT NOT NULL,
    priority_class  TEXT DEFAULT 'B',            -- 'A'=OEM top, 'B'=standard, 'C'=spot
    country         TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rewair_orders (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_number    TEXT UNIQUE NOT NULL,
    customer_id     UUID NOT NULL REFERENCES rewair_customers(id),
    order_date      DATE NOT NULL,
    requested_delivery_date DATE NOT NULL,
    confirmed_delivery_date DATE,
    priority        INT DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    status          TEXT DEFAULT 'new',          -- 'new','confirmed','in_progress','completed','cancelled'
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rewair_order_lines (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_id        UUID NOT NULL REFERENCES rewair_orders(id) ON DELETE CASCADE,
    line_number     INT NOT NULL,
    product_id      UUID NOT NULL REFERENCES rewair_products(id),
    quantity        INT NOT NULL,
    quantity_completed INT DEFAULT 0,
    due_date        DATE,
    status          TEXT DEFAULT 'pending',      -- 'pending','scheduled','in_progress','completed'
    UNIQUE(order_id, line_number)
);

-- ============================================================================
-- 6. PIANIFICAZIONE PRODUZIONE
-- ============================================================================

-- Cosa si produce, dove, quando
CREATE TABLE rewair_production_schedule (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    order_line_id   UUID NOT NULL REFERENCES rewair_order_lines(id),
    phase_code      TEXT NOT NULL REFERENCES rewair_workflow_phases(code),
    machine_id      UUID NOT NULL REFERENCES rewair_machines(id),
    planned_date    DATE NOT NULL,
    shift_type_id   UUID NOT NULL REFERENCES rewair_shift_types(id),
    planned_quantity INT NOT NULL,
    planned_start   TIMESTAMPTZ,
    planned_end     TIMESTAMPTZ,
    status          TEXT DEFAULT 'planned',
                    -- 'planned','confirmed','in_progress','completed','delayed'
    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Chi lavora su cosa
CREATE TABLE rewair_workforce_assignments (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id     UUID NOT NULL REFERENCES rewair_production_schedule(id) ON DELETE CASCADE,
    worker_id       UUID NOT NULL REFERENCES rewair_workers(id),
    role            TEXT DEFAULT 'operator',     -- 'operator', 'lead', 'support', 'qc'
    planned_hours   NUMERIC(4,1),
    actual_hours    NUMERIC(4,1),
    status          TEXT DEFAULT 'assigned',     -- 'assigned','confirmed','working','completed','absent'
    notes           TEXT,
    UNIQUE(schedule_id, worker_id)
);

-- ============================================================================
-- 7. CONSUNTIVAZIONE
-- ============================================================================

CREATE TABLE rewair_production_log (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id     UUID NOT NULL REFERENCES rewair_production_schedule(id),
    actual_start    TIMESTAMPTZ,
    actual_end      TIMESTAMPTZ,
    quantity_produced INT NOT NULL DEFAULT 0,
    quantity_rejected INT DEFAULT 0,
    downtime_minutes INT DEFAULT 0,
    notes           TEXT,
    recorded_at     TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE rewair_overtime_requests (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    worker_id       UUID NOT NULL REFERENCES rewair_workers(id),
    date            DATE NOT NULL,
    hours           NUMERIC(4,1) NOT NULL,
    reason          TEXT,
    approved_by     TEXT,
    status          TEXT DEFAULT 'pending',      -- 'pending','approved','rejected'
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 8. TABELLA AI SUGGESTIONS (per il livello 2 — motore AI)
-- ============================================================================

CREATE TABLE rewair_ai_suggestions (
    id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_type TEXT NOT NULL,
                    -- 'reallocation', 'overtime', 'bottleneck', 'capacity', 'shift_change'
    severity        TEXT DEFAULT 'info',         -- 'info', 'warning', 'critical'
    title           TEXT NOT NULL,
    description     TEXT NOT NULL,
    affected_date   DATE,
    affected_machine_id UUID REFERENCES rewair_machines(id),
    affected_worker_id  UUID REFERENCES rewair_workers(id),
    suggested_action    JSONB,                   -- azione strutturata proposta dall'AI
    context_data        JSONB,                   -- dati di contesto usati per generare il suggerimento
    status          TEXT DEFAULT 'pending',      -- 'pending','accepted','rejected','expired'
    accepted_by     TEXT,
    accepted_at     TIMESTAMPTZ,
    created_at      TIMESTAMPTZ DEFAULT now()
);

-- ============================================================================
-- 9. INDICI
-- ============================================================================

CREATE INDEX idx_rewair_machines_phase ON rewair_machines(phase_code);
CREATE INDEX idx_rewair_machines_type ON rewair_machines(machine_type);
CREATE INDEX idx_rewair_worker_skills_worker ON rewair_worker_skills(worker_id);
CREATE INDEX idx_rewair_worker_skills_skill ON rewair_worker_skills(skill_id);
CREATE INDEX idx_rewair_availability_date ON rewair_worker_availability(date, shift_type_id);
CREATE INDEX idx_rewair_availability_worker ON rewair_worker_availability(worker_id, date);
CREATE INDEX idx_rewair_orders_status ON rewair_orders(status);
CREATE INDEX idx_rewair_orders_delivery ON rewair_orders(requested_delivery_date);
CREATE INDEX idx_rewair_order_lines_status ON rewair_order_lines(status);
CREATE INDEX idx_rewair_schedule_date ON rewair_production_schedule(planned_date);
CREATE INDEX idx_rewair_schedule_machine ON rewair_production_schedule(machine_id, planned_date);
CREATE INDEX idx_rewair_schedule_status ON rewair_production_schedule(status);
CREATE INDEX idx_rewair_assignments_worker ON rewair_workforce_assignments(worker_id);
CREATE INDEX idx_rewair_assignments_schedule ON rewair_workforce_assignments(schedule_id);
CREATE INDEX idx_rewair_log_schedule ON rewair_production_log(schedule_id);
CREATE INDEX idx_rewair_ai_status ON rewair_ai_suggestions(status, severity);
CREATE INDEX idx_rewair_ai_date ON rewair_ai_suggestions(affected_date);

-- ============================================================================
-- 10. VISTE ANALITICHE
-- ============================================================================

-- Vista: carico giornaliero per macchina
CREATE OR REPLACE VIEW rewair_v_daily_machine_load AS
SELECT
    ps.planned_date,
    st.name AS shift_name,
    m.name AS machine_name,
    m.machine_type,
    wp.name AS phase_name,
    COUNT(ps.id) AS scheduled_batches,
    SUM(ps.planned_quantity) AS total_planned_qty,
    m.avg_operators AS operators_needed,
    m.capacity_units_per_shift
FROM rewair_production_schedule ps
JOIN rewair_machines m ON ps.machine_id = m.id
JOIN rewair_workflow_phases wp ON ps.phase_code = wp.code
JOIN rewair_shift_types st ON ps.shift_type_id = st.id
WHERE ps.status NOT IN ('completed', 'cancelled')
GROUP BY ps.planned_date, st.name, m.name, m.machine_type,
         wp.name, m.avg_operators, m.capacity_units_per_shift;

-- Vista: disponibilità operatori per data
CREATE OR REPLACE VIEW rewair_v_daily_availability AS
SELECT
    wa.date,
    st.name AS shift_name,
    COUNT(*) FILTER (WHERE wa.status = 'available') AS available,
    COUNT(*) FILTER (WHERE wa.status = 'vacation') AS on_vacation,
    COUNT(*) FILTER (WHERE wa.status = 'sick') AS sick,
    COUNT(*) FILTER (WHERE wa.status = 'training') AS training,
    COUNT(*) FILTER (WHERE wa.status = 'unavailable') AS unavailable
FROM rewair_worker_availability wa
LEFT JOIN rewair_shift_types st ON wa.shift_type_id = st.id
GROUP BY wa.date, st.name;

-- Vista: gap workforce (domanda vs offerta per fase)
CREATE OR REPLACE VIEW rewair_v_workforce_gap AS
WITH demand AS (
    SELECT
        ps.planned_date,
        ps.shift_type_id,
        m.phase_code,
        SUM(m.avg_operators) AS operators_needed
    FROM rewair_production_schedule ps
    JOIN rewair_machines m ON ps.machine_id = m.id
    WHERE ps.status NOT IN ('completed', 'cancelled')
    GROUP BY ps.planned_date, ps.shift_type_id, m.phase_code
),
supply AS (
    SELECT
        wa.date,
        wa.shift_type_id,
        ws.skill_id,
        s.phase_code,
        COUNT(DISTINCT wa.worker_id) AS available_workers
    FROM rewair_worker_availability wa
    JOIN rewair_worker_skills ws ON wa.worker_id = ws.worker_id
    JOIN rewair_skills s ON ws.skill_id = s.id
    WHERE wa.status = 'available'
    GROUP BY wa.date, wa.shift_type_id, ws.skill_id, s.phase_code
)
SELECT
    d.planned_date AS date,
    st.name AS shift_name,
    wp.name AS phase_name,
    d.operators_needed,
    COALESCE(s.available_workers, 0) AS available_workers,
    COALESCE(s.available_workers, 0) - d.operators_needed AS gap
FROM demand d
JOIN rewair_shift_types st ON d.shift_type_id = st.id
JOIN rewair_workflow_phases wp ON d.phase_code = wp.code
LEFT JOIN supply s ON d.planned_date = s.date
    AND d.shift_type_id = s.shift_type_id
    AND d.phase_code = s.phase_code;

-- Vista: avanzamento ordini
CREATE OR REPLACE VIEW rewair_v_order_progress AS
SELECT
    o.order_number,
    c.name AS customer_name,
    c.priority_class,
    o.requested_delivery_date,
    o.status AS order_status,
    ol.line_number,
    p.name AS product_name,
    p.product_type,
    ol.quantity,
    ol.quantity_completed,
    CASE WHEN ol.quantity > 0
         THEN ROUND(ol.quantity_completed::NUMERIC / ol.quantity * 100, 1)
         ELSE 0
    END AS completion_pct,
    ol.due_date,
    ol.status AS line_status
FROM rewair_orders o
JOIN rewair_customers c ON o.customer_id = c.id
JOIN rewair_order_lines ol ON ol.order_id = o.id
JOIN rewair_products p ON ol.product_id = p.id;

-- ============================================================================
-- 11. ROW LEVEL SECURITY (Supabase best practice)
-- ============================================================================

-- Abilita RLS su tutte le tabelle (puoi poi configurare le policy in Supabase)
ALTER TABLE rewair_workflow_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_shift_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_machines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_machine_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_machine_downtime ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_worker_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_worker_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_order_lines ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_production_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_workforce_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_production_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_overtime_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rewair_ai_suggestions ENABLE ROW LEVEL SECURITY;

-- Policy di esempio: accesso completo per utenti autenticati (per la demo)
-- Decommentare e adattare per la produzione
/*
CREATE POLICY "Authenticated users full access" ON rewair_machines
    FOR ALL USING (auth.role() = 'authenticated');
-- Ripetere per ogni tabella...
*/

-- ============================================================================
-- 12. DATI DEMO
-- ============================================================================

-- 12a. Fasi del workflow
INSERT INTO rewair_workflow_phases (code, name, sequence_order, description) VALUES
    ('cutting',  'Taglio',        1, 'Taglio automatico tessuti e fibra di vetro con macchine Lectra'),
    ('assembly', 'Assemblaggio',  2, 'Assemblaggio kit (preformi, core, vacuum) su linee ASM e CSM'),
    ('tagging',  'Tagging',       3, 'Etichettatura, controllo qualità e confezionamento kit finali');

-- 12b. Turni
INSERT INTO rewair_shift_types (code, name, start_time, end_time, break_minutes, net_hours) VALUES
    ('morning',   'Mattina',     '06:00', '14:00', 30, 7.5),
    ('afternoon', 'Pomeriggio',  '14:00', '22:00', 30, 7.5),
    ('night',     'Notte',       '22:00', '06:00', 30, 7.5);

-- 12c. Competenze
INSERT INTO rewair_skills (code, name, phase_code, description) VALUES
    ('lectra_op',    'Operatore Lectra',         'cutting',  'Utilizzo e programmazione macchine Lectra per taglio automatico'),
    ('lectra_setup', 'Setup Lectra',             'cutting',  'Attrezzaggio e cambio programma su Lectra'),
    ('asm_big_op',   'Operatore ASM Big',        'assembly', 'Assemblaggio kit su linee ASM Big'),
    ('asm_small_op', 'Operatore ASM Small',      'assembly', 'Assemblaggio kit su linee ASM Small'),
    ('csm_op',       'Operatore CSM',            'assembly', 'Lavorazione e assemblaggio su linee CSM'),
    ('tagging_op',   'Operatore Tagging',        'tagging',  'Etichettatura e confezionamento kit'),
    ('qc',           'Controllo Qualità',        NULL,       'Ispezione e controllo qualità trasversale'),
    ('forklift',     'Carrellista',              NULL,       'Movimentazione materiali con carrello elevatore');

-- 12d. Macchine (dal documento RewAir)
INSERT INTO rewair_machines (code, name, machine_type, phase_code, avg_operators, avg_shifts, is_active, prefab_avg_3w, shell_avg_3w) VALUES
    -- Taglio
    ('LECTRA_1',    'Lectra 1',     'lectra',    'cutting',  4,   2,   TRUE,  NULL, NULL),
    ('LECTRA_2',    'Lectra 2',     'lectra',    'cutting',  4,   2,   TRUE,  NULL, NULL),
    ('LECTRA_3',    'Lectra 3',     'lectra',    'cutting',  4,   2.5, TRUE,  NULL, NULL),
    -- Assemblaggio Big
    ('ASM_BIG_1',   'ASM Big 1',    'asm_big',   'assembly', 4,   3,   TRUE,  NULL, NULL),
    ('ASM_BIG_2',   'ASM Big 2',    'asm_big',   'assembly', 4,   3,   TRUE,  6,    2),
    ('ASM_BIG_3',   'ASM Big 3',    'asm_big',   'assembly', 4,   NULL,FALSE, NULL, NULL),
    ('ASM_BIG_4',   'ASM Big 4',    'asm_big',   'assembly', 4,   NULL,FALSE, NULL, NULL),
    -- Assemblaggio Small
    ('ASM_SMALL_1', 'ASM Small 1',  'asm_small', 'assembly', 3,   3,   TRUE,  NULL, NULL),
    ('ASM_SMALL_2', 'ASM Small 2',  'asm_small', 'assembly', 3,   NULL,FALSE, NULL, NULL),
    -- CSM
    ('CSM_1',       'CSM 1',        'csm',       'assembly', 3,   1.5, TRUE,  NULL, NULL),
    ('CSM_2',       'CSM 2',        'csm',       'assembly', 3,   NULL,FALSE, NULL, NULL),
    -- Tagging
    ('TAGGING_1',   'Tagging 1',    'tagging',   'tagging',  2.5, 2,   TRUE,  NULL, NULL),
    ('TAGGING_2',   'Tagging 2',    'tagging',   'tagging',  2.5, 2,   TRUE,  NULL, NULL),
    ('TAGGING_3',   'Tagging 3',    'tagging',   'tagging',  2.5, NULL,FALSE, NULL, NULL),
    ('TAGGING_4',   'Tagging 4',    'tagging',   'tagging',  2.5, NULL,FALSE, NULL, NULL);

-- 12e. Operatori demo (30 persone realistiche)
INSERT INTO rewair_workers (employee_code, first_name, last_name, contract_type, hire_date, hourly_cost, weekly_hours) VALUES
    ('RW001', 'Marco',    'Fernández',  'permanent',  '2020-03-15', 18.50, 40),
    ('RW002', 'Ana',      'García',     'permanent',  '2019-07-01', 19.00, 40),
    ('RW003', 'Piotr',    'Kowalski',   'permanent',  '2021-01-10', 17.50, 40),
    ('RW004', 'Lars',     'Nielsen',    'permanent',  '2018-05-20', 21.00, 40),
    ('RW005', 'Sofia',    'López',      'permanent',  '2022-02-14', 16.50, 40),
    ('RW006', 'Tomasz',   'Nowak',      'permanent',  '2020-09-01', 18.00, 40),
    ('RW007', 'Elena',    'Ruiz',       'permanent',  '2019-11-15', 19.50, 40),
    ('RW008', 'Mikkel',   'Andersen',   'permanent',  '2017-04-01', 22.00, 40),
    ('RW009', 'Carlos',   'Martínez',   'temporary',  '2024-01-15', 15.50, 40),
    ('RW010', 'Katarzyna','Wiśniewska', 'permanent',  '2021-06-01', 17.00, 40),
    ('RW011', 'José',     'Hernández',  'permanent',  '2020-08-10', 18.50, 40),
    ('RW012', 'Mads',     'Pedersen',   'permanent',  '2019-03-20', 20.00, 40),
    ('RW013', 'María',    'Sánchez',    'agency',     '2025-06-01', 14.50, 40),
    ('RW014', 'Jakub',    'Zieliński',  'permanent',  '2022-04-15', 17.00, 40),
    ('RW015', 'Carmen',   'Díaz',       'permanent',  '2018-10-01', 20.50, 40),
    ('RW016', 'Henrik',   'Christensen','permanent',  '2020-01-20', 19.00, 40),
    ('RW017', 'Pablo',    'Torres',     'temporary',  '2025-03-01', 15.00, 40),
    ('RW018', 'Agnieszka','Kamińska',   'permanent',  '2021-09-10', 17.50, 40),
    ('RW019', 'Javier',   'Moreno',     'permanent',  '2019-06-15', 19.00, 40),
    ('RW020', 'Rasmus',   'Larsen',     'permanent',  '2020-11-01', 18.50, 40),
    ('RW021', 'Lucía',    'Romero',     'permanent',  '2022-07-01', 16.50, 40),
    ('RW022', 'Wojciech', 'Lewandowski','permanent',  '2018-12-01', 21.00, 40),
    ('RW023', 'Isabel',   'Navarro',    'agency',     '2025-09-15', 14.00, 36),
    ('RW024', 'Niels',    'Rasmussen',  'permanent',  '2019-02-10', 20.00, 40),
    ('RW025', 'Alberto',  'Gil',        'permanent',  '2021-03-20', 17.50, 40),
    ('RW026', 'Dorota',   'Szymańska',  'permanent',  '2020-05-15', 18.00, 40),
    ('RW027', 'Fernando', 'Vega',       'temporary',  '2025-11-01', 15.00, 40),
    ('RW028', 'Louise',   'Jensen',     'permanent',  '2022-08-10', 17.00, 40),
    ('RW029', 'Ricardo',  'Castro',     'permanent',  '2019-09-01', 19.50, 40),
    ('RW030', 'Beata',    'Dąbrowska',  'permanent',  '2021-12-15', 17.00, 40);

-- 12f. Assegnazione competenze agli operatori
-- (usando subquery per risolvere gli UUID)
INSERT INTO rewair_worker_skills (worker_id, skill_id, proficiency, certified)
SELECT w.id, s.id, prof, cert FROM (VALUES
    -- Operatori Lectra (esperti taglio)
    ('RW001', 'lectra_op',    4, TRUE),
    ('RW001', 'lectra_setup', 3, TRUE),
    ('RW002', 'lectra_op',    4, TRUE),
    ('RW002', 'lectra_setup', 4, TRUE),
    ('RW003', 'lectra_op',    3, TRUE),
    ('RW004', 'lectra_op',    4, TRUE),
    ('RW004', 'lectra_setup', 4, TRUE),
    ('RW005', 'lectra_op',    2, FALSE),
    ('RW006', 'lectra_op',    3, TRUE),
    ('RW007', 'lectra_op',    3, TRUE),
    ('RW007', 'lectra_setup', 2, FALSE),
    ('RW008', 'lectra_op',    4, TRUE),
    ('RW008', 'lectra_setup', 4, TRUE),
    ('RW009', 'lectra_op',    2, FALSE),
    ('RW010', 'lectra_op',    3, TRUE),
    -- Operatori ASM Big
    ('RW011', 'asm_big_op',   4, TRUE),
    ('RW012', 'asm_big_op',   4, TRUE),
    ('RW013', 'asm_big_op',   2, FALSE),
    ('RW014', 'asm_big_op',   3, TRUE),
    ('RW015', 'asm_big_op',   4, TRUE),
    ('RW016', 'asm_big_op',   3, TRUE),
    ('RW017', 'asm_big_op',   2, FALSE),
    ('RW018', 'asm_big_op',   3, TRUE),
    -- Operatori ASM Small
    ('RW019', 'asm_small_op', 4, TRUE),
    ('RW020', 'asm_small_op', 3, TRUE),
    ('RW021', 'asm_small_op', 3, TRUE),
    -- Operatori CSM
    ('RW022', 'csm_op',       4, TRUE),
    ('RW023', 'csm_op',       2, FALSE),
    ('RW024', 'csm_op',       3, TRUE),
    -- Operatori Tagging
    ('RW025', 'tagging_op',   3, TRUE),
    ('RW026', 'tagging_op',   4, TRUE),
    ('RW027', 'tagging_op',   2, FALSE),
    ('RW028', 'tagging_op',   3, TRUE),
    ('RW029', 'tagging_op',   4, TRUE),
    ('RW030', 'tagging_op',   3, TRUE),
    -- Cross-skill: alcuni operatori sanno fare più cose
    ('RW001', 'asm_big_op',   2, FALSE),   -- Marco sa anche assemblare
    ('RW011', 'lectra_op',    2, FALSE),    -- José sa anche tagliare
    ('RW025', 'asm_small_op', 2, FALSE),    -- Alberto sa anche assemblare small
    ('RW029', 'qc',           3, TRUE),     -- Ricardo è anche QC
    ('RW008', 'qc',           4, TRUE),     -- Mikkel è QC senior
    ('RW012', 'forklift',     3, TRUE),     -- Mads ha patentino carrello
    ('RW022', 'forklift',     3, TRUE)      -- Wojciech ha patentino carrello
) AS v(wcode, scode, prof, cert)
JOIN rewair_workers w ON w.employee_code = v.wcode
JOIN rewair_skills s ON s.code = v.scode;

-- 12g. Clienti demo
INSERT INTO rewair_customers (code, name, priority_class, country) VALUES
    ('NORDEX',  'Nordex SE',              'A', 'DE'),
    ('VESTAS',  'Vestas Wind Systems',    'A', 'DK'),
    ('SIEMENS', 'Siemens Gamesa',         'A', 'ES'),
    ('LM',      'LM Wind Power',          'B', 'DK'),
    ('TPI',     'TPI Composites',         'B', 'US');

-- 12h. Prodotti demo
INSERT INTO rewair_products (sku, name, product_type, kit_category, cutting_time_min, assembly_time_min, tagging_time_min, assembly_machine_type) VALUES
    ('GK-PF-80',  'Glass Kit Prefab 80m',     'prefab', 'glass_kit',   45, 90, 15, 'asm_big'),
    ('GK-PF-60',  'Glass Kit Prefab 60m',     'prefab', 'glass_kit',   35, 70, 12, 'asm_big'),
    ('GK-SH-80',  'Glass Kit Shell 80m',      'shell',  'glass_kit',   50, 95, 15, 'asm_big'),
    ('GK-SH-60',  'Glass Kit Shell 60m',      'shell',  'glass_kit',   40, 75, 12, 'asm_big'),
    ('CK-PF-80',  'Core Kit Prefab 80m',      'prefab', 'core_kit',    20, 40, 10, 'asm_small'),
    ('CK-SH-60',  'Core Kit Shell 60m',       'shell',  'core_kit',    18, 35, 10, 'asm_small'),
    ('VK-STD',    'Vacuum Kit Standard',       'prefab', 'vacuum_kit',  15, 25,  8, 'csm'),
    ('VK-XL',     'Vacuum Kit XL',             'shell',  'vacuum_kit',  20, 35, 10, 'csm'),
    ('PC-NAC',    'Protective Cover Nacelle',  'prefab', 'cover',       25, 50, 12, 'asm_small');

-- 12i. Ordini demo (prossime 2 settimane)
INSERT INTO rewair_orders (order_number, customer_id, order_date, requested_delivery_date, priority, status)
SELECT order_number, c.id, order_date::DATE, delivery::DATE, prio, stat FROM (VALUES
    ('ORD-2026-0147', 'NORDEX',  '2026-03-10', '2026-03-24', 2, 'confirmed'),
    ('ORD-2026-0148', 'VESTAS',  '2026-03-11', '2026-03-25', 2, 'confirmed'),
    ('ORD-2026-0149', 'SIEMENS', '2026-03-12', '2026-03-28', 3, 'confirmed'),
    ('ORD-2026-0150', 'LM',      '2026-03-13', '2026-03-31', 5, 'new'),
    ('ORD-2026-0151', 'TPI',     '2026-03-14', '2026-04-04', 6, 'new'),
    ('ORD-2026-0152', 'NORDEX',  '2026-03-15', '2026-03-26', 1, 'confirmed')
) AS v(order_number, ccode, order_date, delivery, prio, stat)
JOIN rewair_customers c ON c.code = v.ccode;

-- 12j. Righe ordine demo
INSERT INTO rewair_order_lines (order_id, line_number, product_id, quantity, due_date, status)
SELECT o.id, ln, p.id, qty, dd::DATE, stat FROM (VALUES
    ('ORD-2026-0147', 1, 'GK-PF-80', 24, '2026-03-24', 'scheduled'),
    ('ORD-2026-0147', 2, 'VK-STD',   24, '2026-03-24', 'scheduled'),
    ('ORD-2026-0148', 1, 'GK-SH-80', 18, '2026-03-25', 'scheduled'),
    ('ORD-2026-0148', 2, 'CK-SH-60', 18, '2026-03-25', 'pending'),
    ('ORD-2026-0149', 1, 'GK-PF-60', 30, '2026-03-28', 'pending'),
    ('ORD-2026-0149', 2, 'GK-SH-60', 20, '2026-03-28', 'pending'),
    ('ORD-2026-0149', 3, 'VK-XL',    30, '2026-03-28', 'pending'),
    ('ORD-2026-0150', 1, 'CK-PF-80', 40, '2026-03-31', 'pending'),
    ('ORD-2026-0150', 2, 'PC-NAC',   15, '2026-03-31', 'pending'),
    ('ORD-2026-0151', 1, 'GK-PF-80', 50, '2026-04-04', 'pending'),
    ('ORD-2026-0152', 1, 'GK-PF-80', 12, '2026-03-26', 'scheduled'),
    ('ORD-2026-0152', 2, 'GK-SH-80', 12, '2026-03-26', 'scheduled')
) AS v(onum, ln, sku, qty, dd, stat)
JOIN rewair_orders o ON o.order_number = v.onum
JOIN rewair_products p ON p.sku = v.sku;

-- Fine schema. Pronto per Supabase!