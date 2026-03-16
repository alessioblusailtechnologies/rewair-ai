import { Router } from 'express';
import multer from 'multer';
import { PDFParse } from 'pdf-parse';
import { supabase } from '../config/supabase';
import { getAIProvider } from '../ai/ai.service';

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } }); // 10MB max

const IMAGE_MIMES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp'];

/**
 * POST /api/ai/extract-order
 * Upload a document (PDF, image, text) and extract order data using AI.
 */
router.post('/extract-order', upload.single('file'), async (req, res, next) => {
  try {
    const file = req.file;
    if (!file) { res.status(400).json({ error: 'No file uploaded' }); return; }

    // Load context from DB
    const [customersRes, productsRes] = await Promise.all([
      supabase.from('rewair_customers').select('code, name'),
      supabase.from('rewair_products').select('sku, name'),
    ]);

    const context = {
      customers: (customersRes.data || []).map((c: any) => ({ code: c.code, name: c.name })),
      products: (productsRes.data || []).map((p: any) => ({ sku: p.sku, name: p.name })),
    };

    const provider = getAIProvider();
    const providerConfig = req.body.model ? { model: req.body.model } : undefined;

    let result;

    if (IMAGE_MIMES.includes(file.mimetype)) {
      // Image → send directly to AI vision
      const base64 = file.buffer.toString('base64');
      result = await provider.extractOrderFromImage(base64, file.mimetype, context, providerConfig);
    } else if (file.mimetype === 'application/pdf') {
      // PDF → extract text, then send to AI
      const parser = new PDFParse(new Uint8Array(file.buffer));
      const pdfResult = await parser.getText();
      const pdfText = (pdfResult as any).text ?? String(pdfResult);
      if (!pdfText?.trim()) {
        res.status(422).json({ error: 'PDF appears to be empty or image-only. Try uploading as image.' });
        return;
      }
      result = await provider.extractOrderFromText(pdfText, context, providerConfig);
    } else {
      // Assume text-based (txt, csv, etc.)
      const text = file.buffer.toString('utf-8');
      if (!text.trim()) {
        res.status(422).json({ error: 'File appears to be empty.' });
        return;
      }
      result = await provider.extractOrderFromText(text, context, providerConfig);
    }

    // Try to resolve customer and product IDs from the extracted data
    const enriched = await enrichExtractedOrder(result);

    res.json(enriched);
  } catch (e) { next(e); }
});

/**
 * Enrich extracted order with real DB IDs where possible.
 */
async function enrichExtractedOrder(extracted: any) {
  // Resolve customer — the AI already matched to our customer codes
  let customer_id: string | null = null;
  if (extracted.customer_code) {
    // Exact match on code (AI should return our DB code like "SIEMENS", "VESTAS")
    const { data } = await supabase.from('rewair_customers').select('id').ilike('code', extracted.customer_code).maybeSingle();
    if (data) customer_id = data.id;
  }
  if (!customer_id && extracted.customer_name) {
    // Fallback: try partial name match
    const { data } = await supabase.from('rewair_customers').select('id, name').order('name');
    if (data) {
      const nameLower = extracted.customer_name.toLowerCase();
      const match = data.find((c: any) => nameLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nameLower));
      if (match) customer_id = match.id;
    }
  }

  // Resolve products — the AI already matched SKUs from our catalog
  const enrichedLines = await Promise.all(
    (extracted.lines || []).map(async (line: any) => {
      let product_id: string | null = null;
      if (line.product_sku) {
        const { data } = await supabase.from('rewair_products').select('id').ilike('sku', line.product_sku).maybeSingle();
        if (data) product_id = data.id;
      }
      if (!product_id && line.product_name) {
        // Fallback: partial name match
        const { data } = await supabase.from('rewair_products').select('id, name').order('name');
        if (data) {
          const nameLower = line.product_name.toLowerCase();
          const match = data.find((p: any) => nameLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().includes(nameLower));
          if (match) product_id = match.id;
        }
      }
      return { ...line, product_id };
    })
  );

  return {
    ...extracted,
    customer_id,
    lines: enrichedLines,
  };
}

export default router;
