import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// --- Production Log ---
router.get('/log', async (req, res, next) => {
  try {
    let query = supabase
      .from('rewair_production_log')
      .select('*, schedule:rewair_production_schedule(planned_date, machine:rewair_machines(name), shift:rewair_shift_types(name))')
      .order('recorded_at', { ascending: false });
    if (req.query.schedule_id) query = query.eq('schedule_id', req.query.schedule_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/log', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_production_log')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/log/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_production_log')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/log/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_production_log')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Overtime Requests ---
router.get('/overtime', async (req, res, next) => {
  try {
    let query = supabase
      .from('rewair_overtime_requests')
      .select('*, worker:rewair_workers(employee_code, first_name, last_name)')
      .order('date');
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.worker_id) query = query.eq('worker_id', req.query.worker_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/overtime', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_overtime_requests')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/overtime/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_overtime_requests')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/overtime/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_overtime_requests')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
