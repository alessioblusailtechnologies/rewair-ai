import { Router } from 'express';
import { supabase } from '../config/supabase';

const router = Router();

// --- Customers ---
router.get('/customers', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_customers')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/customers', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_customers')
      .insert(req.body)
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/customers/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_customers')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/customers/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_customers')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Orders CRUD ---
router.get('/', async (req, res, next) => {
  try {
    let query = supabase
      .from('rewair_orders')
      .select('*, customer:rewair_customers(name, code, priority_class), lines:rewair_order_lines(*, product:rewair_products(sku, name, product_type))')
      .order('requested_delivery_date');
    if (req.query.status) query = query.eq('status', req.query.status);
    if (req.query.customer_id) query = query.eq('customer_id', req.query.customer_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_orders')
      .select('*, customer:rewair_customers(*), lines:rewair_order_lines(*, product:rewair_products(*))')
      .eq('id', req.params.id)
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/', async (req, res, next) => {
  try {
    const { lines, ...orderData } = req.body;
    // Create order
    const { data: order, error: orderError } = await supabase
      .from('rewair_orders')
      .insert(orderData)
      .select()
      .single();
    if (orderError) throw orderError;

    // Create lines if provided
    if (lines?.length) {
      const linesWithOrderId = lines.map((line: any, i: number) => ({
        ...line,
        order_id: order.id,
        line_number: line.line_number || i + 1,
      }));
      const { error: linesError } = await supabase
        .from('rewair_order_lines')
        .insert(linesWithOrderId);
      if (linesError) throw linesError;
    }

    // Return full order with lines
    const { data, error } = await supabase
      .from('rewair_orders')
      .select('*, customer:rewair_customers(*), lines:rewair_order_lines(*, product:rewair_products(*))')
      .eq('id', order.id)
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_orders')
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
      .from('rewair_orders')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Order Lines ---
router.get('/:orderId/lines', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_order_lines')
      .select('*, product:rewair_products(*)')
      .eq('order_id', req.params.orderId)
      .order('line_number');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.post('/:orderId/lines', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_order_lines')
      .insert({ ...req.body, order_id: req.params.orderId })
      .select()
      .single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (e) { next(e); }
});

router.put('/lines/:id', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_order_lines')
      .update(req.body)
      .eq('id', req.params.id)
      .select()
      .single();
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/lines/:id', async (req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_order_lines')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

// --- Order Progress View ---
router.get('/views/progress', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_v_order_progress')
      .select('*');
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

export default router;
