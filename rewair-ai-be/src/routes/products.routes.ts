import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// --- Products CRUD ---
router.get('/', async (req, res, next) => {
  try {
    let query = supabase.from('rewair_products').select('*').order('sku');
    if (req.query.product_type) query = query.eq('product_type', req.query.product_type);
    if (req.query.kit_category) query = query.eq('kit_category', req.query.kit_category);
    if (req.query.is_active) query = query.eq('is_active', req.query.is_active === 'true');
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_products')
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
      .from('rewair_products')
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
      .from('rewair_products')
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
      .from('rewair_products')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

export default router;
