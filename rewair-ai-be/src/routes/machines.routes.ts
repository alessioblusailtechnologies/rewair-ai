import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// --- Machines CRUD ---
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('rewair_machines').select('*').order('code');
    if (req.query.phase_code) query = query.eq('phase_code', req.query.phase_code);
    if (req.query.is_active) query = query.eq('is_active', req.query.is_active === 'true');
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_machines')
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
      .from('rewair_machines')
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
      .from('rewair_machines')
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
      .from('rewair_machines')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Machine Skills ---
router.get('/:id/skills', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_machine_skills')
      .select('*, skill:rewair_skills(*)')
      .eq('machine_id', req.params.id);
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/:id/skills', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_machine_skills')
      .insert({ ...req.body, machine_id: req.params.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.delete('/:machineId/skills/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_machine_skills')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Machine Downtime ---
router.get('/:id/downtime', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_machine_downtime')
      .select('*')
      .eq('machine_id', req.params.id)
      .order('start_at', { ascending: false });
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/:id/downtime', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_machine_downtime')
      .insert({ ...req.body, machine_id: req.params.id })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/downtime/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_machine_downtime')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/downtime/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_machine_downtime')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
