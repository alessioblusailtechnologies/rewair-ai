import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// --- Production Schedule CRUD ---
router.get('/', async (req, res, next) => {
  try {
    let query = supabase
      .from('rewair_production_schedule')
      .select(`
        *,
        order_line:rewair_order_lines(*, order:rewair_orders(order_number, customer:rewair_customers(name)), product:rewair_products(sku, name)),
        machine:rewair_machines(code, name, machine_type),
        shift:rewair_shift_types(name, start_time, end_time),
        assignments:rewair_workforce_assignments(*, worker:rewair_workers(employee_code, first_name, last_name))
      `)
      .order('planned_date');
    if (req.query.from) query = query.gte('planned_date', req.query.from);
    if (req.query.to) query = query.lte('planned_date', req.query.to);
    if (req.query.machine_id) query = query.eq('machine_id', req.query.machine_id);
    if (req.query.phase_code) query = query.eq('phase_code', req.query.phase_code);
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_production_schedule')
      .select(`
        *,
        order_line:rewair_order_lines(*, order:rewair_orders(*, customer:rewair_customers(*)), product:rewair_products(*)),
        machine:rewair_machines(*),
        shift:rewair_shift_types(*),
        assignments:rewair_workforce_assignments(*, worker:rewair_workers(*))
      `)
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { assignments, ...scheduleData } = req.body;
    const { data: schedule, error } = await supabase
      .from('rewair_production_schedule')
      .insert(scheduleData)
      .select()
      .single();
    if (error) throw error;

    // Create assignments if provided
    if (assignments?.length) {
      const withScheduleId = assignments.map((a: any) => ({
        ...a,
        schedule_id: schedule.id,
      }));
      const { error: assignError } = await supabase
        .from('rewair_workforce_assignments')
        .insert(withScheduleId);
      if (assignError) throw assignError;
    }

    res.status(201).json(schedule);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_production_schedule')
      .update({ ...req.body, updated_at: new Date().toISOString() })
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_production_schedule')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Workforce Assignments ---
router.get('/:scheduleId/assignments', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_workforce_assignments')
      .select('*, worker:rewair_workers(employee_code, first_name, last_name)')
      .eq('schedule_id', req.params.scheduleId);
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/:scheduleId/assignments', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_workforce_assignments')
      .insert({ ...req.body, schedule_id: req.params.scheduleId })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/assignments/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_workforce_assignments')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/assignments/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_workforce_assignments')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Analytics Views ---
router.get('/views/machine-load', async (req, res, next) => {
  try {
    let query = supabase.from('rewair_v_daily_machine_load').select('*');
    if (req.query.from) query = query.gte('planned_date', req.query.from);
    if (req.query.to) query = query.lte('planned_date', req.query.to);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/views/availability', async (req, res, next) => {
  try {
    let query = supabase.from('rewair_v_daily_availability').select('*');
    if (req.query.from) query = query.gte('date', req.query.from);
    if (req.query.to) query = query.lte('date', req.query.to);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/views/workforce-gap', async (req, res, next) => {
  try {
    let query = supabase.from('rewair_v_workforce_gap').select('*');
    if (req.query.from) query = query.gte('date', req.query.from);
    if (req.query.to) query = query.lte('date', req.query.to);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
