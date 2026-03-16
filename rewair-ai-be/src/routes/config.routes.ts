import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// --- Workflow Phases ---
router.get('/phases', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_workflow_phases')
      .select('*')
      .order('sequence_order');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// --- Shift Types ---
router.get('/shifts', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_shift_types')
      .select('*')
      .order('start_time');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

// --- Skills ---
router.get('/skills', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_skills')
      .select('*')
      .order('code');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
