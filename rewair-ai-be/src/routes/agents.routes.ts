import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../config/supabase';
import { generatePdf, sendEmailWithAttachment } from '../services/agent-actions.service';

const router = Router();

// ---------------------------------------------------------------------------
// System prompt for agent creation via natural language
// ---------------------------------------------------------------------------
const AGENT_CREATOR_PROMPT = `Sei l'assistente AI di ReWAir. L'utente vuole creare un agente automatico.
Analizza la richiesta e genera la configurazione dell'agente.

TIPI DI AGENTE:
- "reporter": genera report (PDF, riepiloghi, analisi) e li invia via email
- "monitor": monitora metriche e invia alert al superamento di soglie
- "custom": altro tipo di automazione

Gli agenti vengono eseguiti manualmente dall'utente quando lo desidera.
Se l'utente menziona una frequenza (es. "ogni lunedì"), includila nella descrizione come promemoria ma l'esecuzione resta manuale.

Rispondi SOLO con JSON valido (senza markdown fencing):
{
  "name": "Nome breve dell'agente (max 6 parole)",
  "description": "Descrizione chiara di cosa fa l'agente, in 1-2 frasi.",
  "agent_type": "reporter|monitor|custom",
  "system_prompt": "Il prompt di sistema che l'agente userà quando viene eseguito. Deve essere specifico e dettagliato su cosa analizzare, che formato usare, e come presentare i risultati. In italiano.",
  "config": {
    "email_recipients": ["lista email destinatari se menzionati"],
    "description_details": "dettagli extra dalla richiesta utente"
  }
}`;

// ---------------------------------------------------------------------------
// System prompt template for agent execution
// ---------------------------------------------------------------------------
function buildExecutionPrompt(agent: any, contextText: string): string {
  return `${agent.system_prompt}

REGOLE:
- Rispondi SEMPRE in italiano
- Usa dati CONCRETI dal contesto: nomi reali, codici, numeri, date
- Formatta la risposta in markdown leggibile (titoli con ##, tabelle con |, liste con -)
- NON usare MAI emoji, simboli unicode speciali o caratteri non-ASCII decorativi. Usa solo testo semplice.
- Per enfasi usa **grassetto** e intestazioni, NON icone o simboli
- Sii conciso ma completo

${contextText}`;
}

// ---------------------------------------------------------------------------
// CRUD Routes
// ---------------------------------------------------------------------------

// GET all agents
router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_agents')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// GET single agent
router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_agents')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// DELETE agent
router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_agents')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// PUT update agent
router.put('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_agents')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// POST toggle agent status
router.post('/:id/toggle', async (req, res, next) => {
  try {
    const status = req.body.active ? 'active' : 'paused';
    const { data, error } = await supabase
      .from('rewair_agents')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// AI Create — parse natural language into agent config
// ---------------------------------------------------------------------------
router.post('/ai/create', async (req, res, next) => {
  try {
    const { prompt } = req.body;
    if (!prompt?.trim()) {
      res.status(400).json({ error: 'Il prompt è obbligatorio' });
      return;
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      temperature: 0.2,
      system: AGENT_CREATOR_PROMPT,
      messages: [{ role: 'user', content: prompt }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') throw new Error('Nessuna risposta dall\'AI');

    let json = textBlock.text.trim();
    if (json.startsWith('```')) {
      json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    const agentConfig = JSON.parse(json);

    // Save to database
    const { data, error } = await supabase
      .from('rewair_agents')
      .insert({
        name: agentConfig.name,
        description: agentConfig.description,
        agent_type: agentConfig.agent_type,
        system_prompt: agentConfig.system_prompt,
        trigger_type: 'manual',
        config: agentConfig.config || {},
        created_via: prompt,
        status: 'active',
      })
      .select()
      .single();

    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Execute agent — run it now and return results
// ---------------------------------------------------------------------------
router.post('/:id/run', async (req, res, next) => {
  try {
    // Fetch agent
    const { data: agent, error: agentErr } = await supabase
      .from('rewair_agents')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (agentErr) throw agentErr;
    if (!agent) { res.status(404).json({ error: 'Agente non trovato' }); return; }

    // Create execution record
    const { data: execution, error: execErr } = await supabase
      .from('rewair_agent_executions')
      .insert({ agent_id: agent.id, status: 'running' })
      .select()
      .single();
    if (execErr) throw execErr;

    try {
      // Load context
      const contextText = await loadAgentContext();

      // Execute via Claude
      const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
      const response = await client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        temperature: 0.2,
        system: buildExecutionPrompt(agent, contextText),
        messages: [{
          role: 'user',
          content: `Esegui ora l'agente "${agent.name}". ${agent.description}`,
        }],
      });

      const textBlock = response.content.find(b => b.type === 'text');
      const output = textBlock?.type === 'text' ? textBlock.text : '';

      // Post-processing: PDF generation + email if configured
      const config = agent.config || {};
      const recipients: string[] = config.email_recipients || [];
      let emailSent = false;
      let pdfGenerated = false;

      if (recipients.length > 0) {
        const isReporter = agent.agent_type === 'reporter' || agent.created_via?.toLowerCase().includes('report') || agent.created_via?.toLowerCase().includes('pdf');

        if (isReporter) {
          // Generate PDF and send as attachment
          const pdfBuffer = await generatePdf(agent.name, output);
          pdfGenerated = true;
          const dateStr = new Date().toISOString().split('T')[0];
          const filename = `${agent.name.replace(/[^a-zA-Z0-9À-ÿ ]/g, '').replace(/\s+/g, '_')}_${dateStr}.pdf`;

          await sendEmailWithAttachment(
            recipients,
            `[ReWAir] ${agent.name} — ${dateStr}`,
            `In allegato il report "${agent.name}" generato automaticamente dall'agente AI di ReWAir.\n\nBuona lettura.`,
            { filename, content: pdfBuffer, mimeType: 'application/pdf' },
          );
          emailSent = true;
        } else {
          // Send plain text email (monitors, alerts, etc.)
          await sendEmailWithAttachment(
            recipients,
            `[ReWAir] ${agent.name}`,
            output,
          );
          emailSent = true;
        }
      }

      const outputData = { result: output, pdf_generated: pdfGenerated, email_sent: emailSent, email_recipients: emailSent ? recipients : [] };

      // Update execution as success
      await supabase
        .from('rewair_agent_executions')
        .update({ status: 'success', completed_at: new Date().toISOString(), output: outputData })
        .eq('id', execution!.id);

      // Update agent last run
      await supabase
        .from('rewair_agents')
        .update({ last_run_at: new Date().toISOString(), last_run_status: 'success', last_error: null, updated_at: new Date().toISOString() })
        .eq('id', agent.id);

      res.json({ ...execution, status: 'success', output: outputData, completed_at: new Date().toISOString() });
    } catch (runErr: any) {
      // Update execution as failed
      await supabase
        .from('rewair_agent_executions')
        .update({ status: 'failed', completed_at: new Date().toISOString(), error_message: runErr.message })
        .eq('id', execution!.id);

      await supabase
        .from('rewair_agents')
        .update({ last_run_at: new Date().toISOString(), last_run_status: 'failed', last_error: runErr.message, updated_at: new Date().toISOString() })
        .eq('id', agent.id);

      throw runErr;
    }
  } catch (e) { next(e); }
});

// GET agent executions
router.get('/:id/executions', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_agent_executions')
      .select('*')
      .eq('agent_id', req.params.id)
      .order('started_at', { ascending: false })
      .limit(20);
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Context loader for agent execution
// ---------------------------------------------------------------------------
async function loadAgentContext(): Promise<string> {
  const today = new Date().toISOString().split('T')[0];

  const [ordersRes, machinesRes, workersRes, scheduleRes] = await Promise.all([
    supabase.from('rewair_orders').select('order_number, order_date, requested_delivery_date, priority, status, customer:rewair_customers(code, name)').in('status', ['new', 'confirmed', 'in_progress']),
    supabase.from('rewair_machines').select('code, name, machine_type, phase_code, is_active, capacity_units_per_shift'),
    supabase.from('rewair_workers').select('employee_code, first_name, last_name, contract_type, is_active'),
    supabase.from('rewair_production_schedule').select('planned_date, planned_quantity, status, phase_code, machine:rewair_machines(code, name), order_line:rewair_order_lines(line_number, quantity, quantity_completed, product:rewair_products(sku, name), order:rewair_orders(order_number))').gte('planned_date', today).order('planned_date').limit(100),
  ]);

  const orders = (ordersRes.data || []).map((o: any) =>
    `- ${o.order_number} | ${(o.customer as any)?.name} | consegna: ${o.requested_delivery_date} | priorità: ${o.priority} | stato: ${o.status}`
  ).join('\n');

  const machines = (machinesRes.data || []).map((m: any) =>
    `- ${m.code} "${m.name}" | fase: ${m.phase_code} | attiva: ${m.is_active ? 'SÌ' : 'NO'} | capacità/turno: ${m.capacity_units_per_shift ?? 'N/D'}`
  ).join('\n');

  const workers = (workersRes.data || []).map((w: any) =>
    `- ${w.employee_code} ${w.first_name} ${w.last_name} | contratto: ${w.contract_type} | attivo: ${w.is_active ? 'SÌ' : 'NO'}`
  ).join('\n');

  const schedule = (scheduleRes.data || []).map((s: any) => {
    const m = s.machine as any;
    const ol = s.order_line as any;
    const p = ol?.product as any;
    const o = ol?.order as any;
    return `- ${s.planned_date} | ${m?.name} | ${s.phase_code} | ${o?.order_number} | ${p?.name} | qtà: ${s.planned_quantity} | stato: ${s.status}`;
  }).join('\n');

  return `=== CONTESTO REWAIR (${today}) ===

ORDINI ATTIVI:
${orders || '(nessun ordine attivo)'}

MACCHINE:
${machines || '(nessuna macchina)'}

OPERATORI:
${workers || '(nessun operatore)'}

SCHEDULE PRODUZIONE:
${schedule || '(nessuna schedulazione)'}`;
}

export default router;
