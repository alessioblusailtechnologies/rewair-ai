import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { supabase } from '../config/supabase';

const router = Router();

const WORKFORCE_SYSTEM_PROMPT = `Sei l'assistente AI di ReWAir per la pianificazione della workforce.
ReWAir produce kit di materiali compositi per pale eoliche (wind turbine blades).

FLUSSO PRODUTTIVO (lineare, sempre lo stesso):
1. TAGLIO (cutting) — Macchine Lectra: taglio automatico tessuti e fibra di vetro
2. ASSEMBLAGGIO (assembly) — Macchine ASM Big, ASM Small, CSM: assemblaggio kit
3. TAGGING (tagging) — Linee Tagging: etichettatura e confezionamento

CONCETTI CHIAVE:
- Ogni macchina richiede un numero medio di operatori per turno (avg_operators)
- Gli operatori devono avere la competenza (skill) corretta per operare una macchina
- I turni sono: Mattina (06:00-14:00), Pomeriggio (14:00-22:00), Notte (22:00-06:00), ciascuno 7.5 ore nette
- Tipi di contratto: permanent (indeterminato), temporary (determinato), agency (interinale)
- Proficiency: 1=base, 2=intermedio, 3=avanzato, 4=esperto
- Prodotti: Glass Kit, Core Kit, Vacuum Kit, Protective Cover — in versioni Prefab e Shell, taglie 60m e 80m
- Priorità ordine: 1=urgente, 10=bassa
- Status ordine: new → confirmed → in_progress → completed

COME RISPONDERE:
- SEMPRE in italiano
- Usa dati CONCRETI dal contesto fornito: nomi reali, codici, numeri, date
- MAI risposte generiche, vaghe o teoriche — solo fatti e numeri dal database
- Per domande "what-if" / scenari, simula l'impatto concreto sui dati reali
- Per domande su capacità, calcola basandoti su: operatori disponibili × turni × capacità macchina
- Quando menzioni un operatore, usa sempre nome e cognome e codice
- Quando menzioni una macchina, usa il nome completo

FORMATO ANSWER (markdown):
Il campo "answer" deve essere in MARKDOWN ben formattato. Usa:
- Paragrafi separati da doppio a capo
- **Grassetto** per nomi, codici e valori importanti
- Elenchi puntati con "- " per liste (NON usare numerazione, solo trattini)
- Intestazioni ### per separare sezioni se la risposta è lunga
- NON includere raccomandazioni nel campo answer, mettile nel campo recommendations

Rispondi SOLO con JSON valido (senza markdown fencing, senza commenti), con questo schema:
{
  "summary": "Frase riassuntiva di massimo 15 parole",
  "answer": "Risposta in markdown con analisi concreta, dati specifici, nomi e numeri.",
  "impact": "positive|negative|neutral|warning",
  "data_points": [{"label": "Etichetta", "value": "Valore concreto"}],
  "affected_entities": [{"type": "machine|worker|order", "name": "Nome", "code": "CODICE"}],
  "recommendations": ["Suggerimento operativo concreto 1", "Suggerimento 2"]
}

- impact: "positive" se lo scenario è favorevole, "negative" se critico, "warning" se ci sono rischi, "neutral" per query informative
- data_points: metriche chiave numeriche rilevanti alla domanda (max 6)
- affected_entities: macchine/operatori/ordini coinvolti nello scenario
- recommendations: suggerimenti pratici e attuabili (max 4)`;

/**
 * POST /api/ai/workforce-chat
 * Natural language workforce planning queries answered with real data.
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { question } = req.body;
    if (!question?.trim()) {
      res.status(400).json({ error: 'La domanda è obbligatoria' });
      return;
    }

    // Load comprehensive context from database
    const context = await loadWorkforceContext();
    const contextText = formatContext(context);

    // Call Claude
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      temperature: 0.2,
      system: WORKFORCE_SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `${contextText}\n\n--- DOMANDA UTENTE ---\n${question}\n--- FINE DOMANDA ---\n\nAnalizza i dati di contesto e rispondi alla domanda con dati concreti. Rispondi SOLO con JSON valido.`,
      }],
    });

    const textBlock = response.content.find(b => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('Nessuna risposta dall\'AI');
    }

    let json = textBlock.text.trim();
    if (json.startsWith('```')) {
      json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    res.json(JSON.parse(json));
  } catch (e) { next(e); }
});

// ---------------------------------------------------------------------------
// Context loading
// ---------------------------------------------------------------------------

async function loadWorkforceContext() {
  const today = new Date().toISOString().split('T')[0];

  const [
    workersRes, machinesRes, skillsRes, shiftsRes,
    workerSkillsRes, machineSkillsRes, scheduleRes,
    ordersRes, orderLinesRes, availabilityRes,
    downtimeRes, workforceGapRes, machineLoadRes, productsRes,
  ] = await Promise.all([
    supabase.from('rewair_workers').select('employee_code, first_name, last_name, contract_type, hourly_cost, weekly_hours, is_active'),
    supabase.from('rewair_machines').select('code, name, machine_type, phase_code, avg_operators, avg_shifts, capacity_units_per_shift, is_active'),
    supabase.from('rewair_skills').select('code, name, phase_code'),
    supabase.from('rewair_shift_types').select('code, name, start_time, end_time, net_hours'),
    supabase.from('rewair_worker_skills').select('proficiency, certified, worker:rewair_workers(employee_code, first_name, last_name), skill:rewair_skills(code, name, phase_code)'),
    supabase.from('rewair_machine_skills').select('min_operators, machine:rewair_machines(code, name), skill:rewair_skills(code, name)'),
    supabase.from('rewair_production_schedule').select('planned_date, planned_quantity, status, phase_code, machine:rewair_machines(code, name), shift:rewair_shift_types(name), order_line:rewair_order_lines(line_number, quantity, quantity_completed, status, product:rewair_products(sku, name), order:rewair_orders(order_number, status, requested_delivery_date, priority, customer:rewair_customers(code, name)))').gte('planned_date', today).order('planned_date'),
    supabase.from('rewair_orders').select('order_number, order_date, requested_delivery_date, priority, status, customer:rewair_customers(code, name, priority_class)').in('status', ['new', 'confirmed', 'in_progress']),
    supabase.from('rewair_order_lines').select('line_number, quantity, quantity_completed, due_date, status, product:rewair_products(sku, name, product_type, assembly_machine_type), order:rewair_orders(order_number)').in('status', ['pending', 'scheduled', 'in_progress']),
    supabase.from('rewair_worker_availability').select('date, status, notes, worker:rewair_workers(employee_code, first_name, last_name), shift:rewair_shift_types(name)').gte('date', today).order('date').limit(200),
    supabase.from('rewair_machine_downtime').select('start_at, end_at, reason, notes, machine:rewair_machines(code, name)').gte('end_at', new Date().toISOString()),
    supabase.from('rewair_v_workforce_gap').select('*'),
    supabase.from('rewair_v_daily_machine_load').select('*'),
    supabase.from('rewair_products').select('sku, name, product_type, kit_category, cutting_time_min, assembly_time_min, tagging_time_min, assembly_machine_type'),
  ]);

  return {
    workers: workersRes.data || [],
    machines: machinesRes.data || [],
    skills: skillsRes.data || [],
    shifts: shiftsRes.data || [],
    workerSkills: workerSkillsRes.data || [],
    machineSkills: machineSkillsRes.data || [],
    schedule: scheduleRes.data || [],
    orders: ordersRes.data || [],
    orderLines: orderLinesRes.data || [],
    availability: availabilityRes.data || [],
    downtime: downtimeRes.data || [],
    workforceGap: workforceGapRes.data || [],
    machineLoad: machineLoadRes.data || [],
    products: productsRes.data || [],
  };
}

function formatContext(ctx: any): string {
  const today = new Date().toISOString().split('T')[0];

  // Compact formatting for each section
  const machinesText = ctx.machines.map((m: any) =>
    `- ${m.code} "${m.name}" | tipo: ${m.machine_type} | fase: ${m.phase_code} | operatori medi: ${m.avg_operators ?? 'N/D'} | turni medi: ${m.avg_shifts ?? 'N/D'} | capacità/turno: ${m.capacity_units_per_shift ?? 'N/D'} | attiva: ${m.is_active ? 'SÌ' : 'NO'}`
  ).join('\n');

  const workersText = ctx.workers.map((w: any) =>
    `- ${w.employee_code} ${w.first_name} ${w.last_name} | contratto: ${w.contract_type} | €${w.hourly_cost}/h | ${w.weekly_hours}h/sett | attivo: ${w.is_active ? 'SÌ' : 'NO'}`
  ).join('\n');

  // Group skills by worker
  const skillsByWorker: Record<string, string[]> = {};
  for (const ws of ctx.workerSkills) {
    const w = ws.worker as any;
    const s = ws.skill as any;
    if (!w || !s) continue;
    const key = `${w.employee_code} ${w.first_name} ${w.last_name}`;
    if (!skillsByWorker[key]) skillsByWorker[key] = [];
    skillsByWorker[key].push(`${s.name} (livello ${ws.proficiency}${ws.certified ? ', certificato' : ''})`);
  }
  const workerSkillsText = Object.entries(skillsByWorker).map(
    ([worker, skills]) => `- ${worker}: ${skills.join(', ')}`
  ).join('\n');

  const machineSkillsText = ctx.machineSkills.map((ms: any) => {
    const m = ms.machine as any;
    const s = ms.skill as any;
    return m && s ? `- ${m.name} richiede: ${s.name} (min ${ms.min_operators} operatori)` : null;
  }).filter(Boolean).join('\n');

  const ordersText = ctx.orders.map((o: any) => {
    const c = o.customer as any;
    return `- ${o.order_number} | cliente: ${c?.name} (${c?.code}, classe ${c?.priority_class}) | data: ${o.order_date} | consegna: ${o.requested_delivery_date} | priorità: ${o.priority} | stato: ${o.status}`;
  }).join('\n');

  const orderLinesText = ctx.orderLines.map((ol: any) => {
    const p = ol.product as any;
    const o = ol.order as any;
    return `- ${o?.order_number} riga ${ol.line_number}: ${p?.name} (${p?.sku}) | qtà: ${ol.quantity} (completati: ${ol.quantity_completed}) | scadenza: ${ol.due_date} | stato: ${ol.status} | macchina assemblaggio: ${p?.assembly_machine_type || 'N/D'}`;
  }).join('\n');

  const scheduleText = ctx.schedule.length > 0
    ? ctx.schedule.map((s: any) => {
        const m = s.machine as any;
        const sh = s.shift as any;
        const ol = s.order_line as any;
        const p = ol?.product as any;
        const o = ol?.order as any;
        const c = o?.customer as any;
        return `- ${s.planned_date} | turno: ${sh?.name} | macchina: ${m?.name} | fase: ${s.phase_code} | ordine: ${o?.order_number} (${c?.name}) | prodotto: ${p?.name} | qtà: ${s.planned_quantity} | stato: ${s.status}`;
      }).join('\n')
    : '(nessuna schedulazione futura)';

  const availabilityText = ctx.availability.length > 0
    ? ctx.availability.map((a: any) => {
        const w = a.worker as any;
        const sh = a.shift as any;
        return `- ${a.date} | ${w?.employee_code} ${w?.first_name} ${w?.last_name} | turno: ${sh?.name || 'tutti'} | stato: ${a.status}${a.notes ? ' | note: ' + a.notes : ''}`;
      }).join('\n')
    : '(nessuna assenza/disponibilità registrata — tutti disponibili per default)';

  const downtimeText = ctx.downtime.length > 0
    ? ctx.downtime.map((d: any) => {
        const m = d.machine as any;
        return `- ${m?.name} (${m?.code}) | da: ${d.start_at} a: ${d.end_at} | motivo: ${d.reason}${d.notes ? ' | note: ' + d.notes : ''}`;
      }).join('\n')
    : '(nessun fermo macchina programmato)';

  const gapText = ctx.workforceGap.length > 0
    ? ctx.workforceGap.map((g: any) =>
        `- ${g.date} | turno: ${g.shift_name} | fase: ${g.phase_name} | operatori necessari: ${g.operators_needed} | disponibili: ${g.available_workers} | gap: ${g.gap}`
      ).join('\n')
    : '(nessun gap workforce rilevato)';

  const productsText = ctx.products.map((p: any) =>
    `- ${p.sku} "${p.name}" | tipo: ${p.product_type} | categoria: ${p.kit_category} | tempi: taglio ${p.cutting_time_min}min, assemblaggio ${p.assembly_time_min}min, tagging ${p.tagging_time_min}min | macchina asm: ${p.assembly_machine_type}`
  ).join('\n');

  return `=== CONTESTO ATTUALE REWAIR (data odierna: ${today}) ===

MACCHINE STABILIMENTO:
${machinesText}

PRODOTTI (catalogo kit):
${productsText}

OPERATORI ATTIVI:
${workersText}

COMPETENZE PER OPERATORE:
${workerSkillsText}

COMPETENZE RICHIESTE PER MACCHINA:
${machineSkillsText}

TURNI:
${ctx.shifts.map((s: any) => `- ${s.name} (${s.code}): ${s.start_time}–${s.end_time}, ${s.net_hours}h nette`).join('\n')}

ORDINI ATTIVI:
${ordersText}

RIGHE ORDINE IN LAVORAZIONE:
${orderLinesText}

SCHEDULE PRODUZIONE (prossime settimane):
${scheduleText}

DISPONIBILITÀ / ASSENZE OPERATORI:
${availabilityText}

FERMI MACCHINA PROGRAMMATI:
${downtimeText}

ANALISI GAP WORKFORCE (domanda vs offerta):
${gapText}`;
}

export default router;
