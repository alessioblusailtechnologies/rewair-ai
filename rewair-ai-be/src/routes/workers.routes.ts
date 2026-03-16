import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// --- Workers CRUD ---
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('rewair_workers').select('*').order('employee_code');
    if (req.query.is_active) query = query.eq('is_active', req.query.is_active === 'true');
    if (req.query.contract_type) query = query.eq('contract_type', req.query.contract_type);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_workers')
      .select('*')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_workers')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_workers')
      .update(req.body)
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
      .from('rewair_workers')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Worker Skills ---
router.get('/:id/skills', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_worker_skills')
      .select('*, skill:rewair_skills(*)')
      .eq('worker_id', req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/:id/skills', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_worker_skills')
      .insert({ ...req.body, worker_id: req.params.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/skills/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_worker_skills')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/skills/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_worker_skills')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Worker Availability ---
router.get('/:id/availability', async (req, res, next) => {
  try {
    let query = supabase
      .from('rewair_worker_availability')
      .select('*, shift:rewair_shift_types(name, start_time, end_time)')
      .eq('worker_id', req.params.id)
      .order('date');
    if (req.query.from) query = query.gte('date', req.query.from);
    if (req.query.to) query = query.lte('date', req.query.to);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// Bulk availability for a date range (all workers)
router.get('/availability/range', async (req, res, next) => {
  try {
    const { from, to } = req.query;
    if (!from || !to) { res.status(400).json({ error: 'from and to query params required' }); return; }
    const { data, error } = await supabase
      .from('rewair_worker_availability')
      .select('*, worker:rewair_workers(employee_code, first_name, last_name), shift:rewair_shift_types(name)')
      .gte('date', from as string)
      .lte('date', to as string)
      .order('date');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/:id/availability', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_worker_availability')
      .insert({ ...req.body, worker_id: req.params.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/availability/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_worker_availability')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/availability/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_worker_availability')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
