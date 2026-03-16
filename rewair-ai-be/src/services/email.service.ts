import { google } from 'googleapis';
import { supabase } from '../config/supabase';
import { getAIProvider } from '../ai/ai.service';
import { decrypt, encrypt } from '../utils/crypto';

interface EmailMessage {
  uid: string;
  from: string;
  fromName: string;
  subject: string;
  date: Date;
  text: string;
}

interface IntegrationConfig {
  id: string;
  email_address: string;
  credentials_enc: string;
  imap_host: string;
  imap_port: number;
}

function getAuthClient(config: IntegrationConfig) {
  const tokensJson = decrypt(config.credentials_enc);
  const tokens = JSON.parse(tokensJson);
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials(tokens);

  // Auto-save refreshed tokens
  oauth2.on('tokens', async (newTokens) => {
    const updated = {
      access_token: newTokens.access_token || tokens.access_token,
      refresh_token: newTokens.refresh_token || tokens.refresh_token,
      expiry_date: newTokens.expiry_date || tokens.expiry_date,
    };
    await supabase.from('rewair_integration_configs')
      .update({ credentials_enc: encrypt(JSON.stringify(updated)), updated_at: new Date().toISOString() })
      .eq('id', config.id);
    console.log('[Gmail] Tokens refreshed and saved');
  });

  return oauth2;
}

export async function fetchUnreadEmails(config: IntegrationConfig, integrationId: string): Promise<EmailMessage[]> {
  const auth = getAuthClient(config);
  const gmail = google.gmail({ version: 'v1', auth });

  console.log('[Gmail] Fetching unread messages...');

  const fifteenMinAgo = Math.floor((Date.now() - 15 * 60 * 1000) / 1000);
  const listRes = await gmail.users.messages.list({
    userId: 'me',
    q: `is:unread after:${fifteenMinAgo}`,
    maxResults: 10,
  });

  const messageIds = listRes.data.messages || [];
  if (messageIds.length === 0) return [];

  // Filter out already-processed messages using DB
  const ids = messageIds.map(m => m.id).filter(Boolean) as string[];
  const { data: alreadyProcessed } = await supabase
    .from('rewair_email_logs')
    .select('message_uid')
    .eq('integration_id', integrationId)
    .in('message_uid', ids);

  const processedSet = new Set((alreadyProcessed || []).map(r => r.message_uid));
  const newIds = ids.filter(id => !processedSet.has(id));

  if (newIds.length === 0) {
    console.log(`[Gmail] ${ids.length} unread but all already processed`);
    // Mark them as read so they don't show up again
    for (const id of ids) {
      await gmail.users.messages.modify({ userId: 'me', id, requestBody: { removeLabelIds: ['UNREAD'] } });
    }
    return [];
  }

  console.log(`[Gmail] ${newIds.length} new email(s) to process (${ids.length - newIds.length} skipped)`);

  const emails: EmailMessage[] = [];

  for (const id of newIds) {
    // Mark as read FIRST to prevent re-fetching on next poll
    await gmail.users.messages.modify({
      userId: 'me',
      id,
      requestBody: { removeLabelIds: ['UNREAD'] },
    });

    const msg = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'full',
    });

    const headers = msg.data.payload?.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    const fromRaw = getHeader('From');
    const fromMatch = fromRaw.match(/^(.+?)\s*<(.+?)>$/);
    const fromName = fromMatch ? fromMatch[1].replace(/"/g, '').trim() : '';
    const fromAddr = fromMatch ? fromMatch[2] : fromRaw;

    const textBody = extractBody(msg.data.payload);

    emails.push({
      uid: id,
      from: fromAddr,
      fromName,
      subject: getHeader('Subject'),
      date: new Date(parseInt(msg.data.internalDate || '0')),
      text: textBody,
    });
  }

  console.log(`[Gmail] Fetched ${emails.length} email(s)`);
  return emails;
}

function extractBody(payload: any): string {
  if (!payload) return '';

  // Direct body
  if (payload.body?.data) {
    return Buffer.from(payload.body.data, 'base64url').toString('utf-8')
      .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 8000);
  }

  // Multipart — find text/plain or text/html
  if (payload.parts) {
    // Prefer text/plain
    const textPart = payload.parts.find((p: any) => p.mimeType === 'text/plain');
    if (textPart?.body?.data) {
      return Buffer.from(textPart.body.data, 'base64url').toString('utf-8').substring(0, 8000);
    }

    // Fallback to text/html stripped
    const htmlPart = payload.parts.find((p: any) => p.mimeType === 'text/html');
    if (htmlPart?.body?.data) {
      return Buffer.from(htmlPart.body.data, 'base64url').toString('utf-8')
        .replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().substring(0, 8000);
    }

    // Recurse into nested multipart
    for (const part of payload.parts) {
      const nested = extractBody(part);
      if (nested) return nested;
    }
  }

  return '';
}

export async function classifyEmail(emailText: string, subject: string): Promise<{ is_order: boolean; confidence: number; reason: string }> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default;
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await client.messages.create({
    model: 'claude-opus-4-6',
    max_tokens: 256,
    temperature: 0.1,
    system: `Sei un assistente per ReWAir (azienda kitting compositi per pale eoliche).
Analizza l'email e determina se contiene una richiesta d'ordine da un cliente.
SONO ordini: richieste di kit, PO (purchase order), richieste di produzione, ordini di acquisto.
NON sono ordini: newsletter, conferme spedizione, fatture, comunicazioni interne, spam.
Rispondi SOLO con JSON: {"is_order": true/false, "confidence": 0.0-1.0, "reason": "breve spiegazione"}`,
    messages: [{ role: 'user', content: `Oggetto: ${subject}\n\n${emailText.substring(0, 4000)}` }],
  });

  const text = response.content.find(b => b.type === 'text');
  if (!text || text.type !== 'text') return { is_order: false, confidence: 0, reason: 'No AI response' };

  let json = text.text.trim();
  if (json.startsWith('```')) json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(json);
}

export async function processEmail(email: EmailMessage, integrationId: string) {
  const { data: existing } = await supabase
    .from('rewair_email_logs')
    .select('id')
    .eq('integration_id', integrationId)
    .eq('message_uid', email.uid)
    .maybeSingle();

  if (existing) {
    console.log(`[Email]   ⏭ Already processed: ${email.uid}`);
    return;
  }

  try {
    console.log(`[Email]   🤖 Classifying: "${email.subject}"`);
    const classification = await classifyEmail(email.text, email.subject);
    console.log(`[Email]   → is_order=${classification.is_order} (${(classification.confidence * 100).toFixed(0)}%) — ${classification.reason}`);

    if (!classification.is_order) {
      await supabase.from('rewair_email_logs').insert({
        integration_id: integrationId,
        message_uid: email.uid,
        from_address: email.from,
        from_name: email.fromName,
        subject: email.subject,
        received_at: email.date.toISOString(),
        is_order: false,
        ai_confidence: classification.confidence,
        ai_summary: classification.reason,
        status: 'not_order',
      });
      return;
    }

    // Extract order data
    const [customersRes, productsRes] = await Promise.all([
      supabase.from('rewair_customers').select('code, name'),
      supabase.from('rewair_products').select('sku, name'),
    ]);

    const context = {
      customers: (customersRes.data || []).map((c: any) => ({ code: c.code, name: c.name })),
      products: (productsRes.data || []).map((p: any) => ({ sku: p.sku, name: p.name })),
    };

    const provider = getAIProvider();
    const fullText = `Oggetto: ${email.subject}\nDa: ${email.fromName} <${email.from}>\n\n${email.text}`;
    console.log(`[Email]   📄 Extracting order data...`);
    const extracted = await provider.extractOrderFromText(fullText, context);

    // Resolve customer
    let customer_id: string | null = null;
    if (extracted.customer_code) {
      const { data } = await supabase.from('rewair_customers').select('id').ilike('code', extracted.customer_code).maybeSingle();
      if (data) customer_id = data.id;
    }
    if (!customer_id && extracted.customer_name) {
      const { data } = await supabase.from('rewair_customers').select('id, name').order('name');
      if (data) {
        const nameLower = extracted.customer_name.toLowerCase();
        const match = data.find((c: any) => nameLower.includes(c.name.toLowerCase()) || c.name.toLowerCase().includes(nameLower));
        if (match) customer_id = match.id;
      }
    }

    // Resolve products
    const lines = await Promise.all(
      (extracted.lines || []).map(async (line: any, i: number) => {
        let product_id: string | null = null;
        if (line.product_sku) {
          const { data } = await supabase.from('rewair_products').select('id').ilike('sku', line.product_sku).maybeSingle();
          if (data) product_id = data.id;
        }
        return product_id ? { line_number: i + 1, product_id, quantity: line.quantity, due_date: line.due_date || extracted.requested_delivery_date } : null;
      })
    );

    const validLines = lines.filter(Boolean);

    if (!customer_id || validLines.length === 0) {
      console.log(`[Email]   ⚠ Order detected but not created: ${!customer_id ? 'customer not resolved' : 'no valid products'}`);
      await supabase.from('rewair_email_logs').insert({
        integration_id: integrationId,
        message_uid: email.uid,
        from_address: email.from,
        from_name: email.fromName,
        subject: email.subject,
        received_at: email.date.toISOString(),
        is_order: true,
        ai_confidence: extracted.confidence,
        ai_summary: `Ordine rilevato ma non creato: ${!customer_id ? 'cliente non risolto' : 'prodotti non risolti'}`,
        status: 'error',
        error_message: !customer_id ? 'Customer not resolved' : 'No valid product lines',
      });
      return;
    }

    // Create order
    const orderNumber = extracted.order_number || `EMAIL-${Date.now()}`;
    const { data: order, error: orderErr } = await supabase
      .from('rewair_orders')
      .insert({
        order_number: orderNumber,
        customer_id,
        order_date: extracted.order_date || new Date().toISOString().split('T')[0],
        requested_delivery_date: extracted.requested_delivery_date || new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
        priority: extracted.priority || 5,
        status: 'new',
        notes: `[AI Email] Da: ${email.fromName} <${email.from}> — ${extracted.raw_summary || ''}`,
      })
      .select()
      .single();

    if (orderErr) throw orderErr;

    const linesWithOrderId = validLines.map((l: any) => ({ ...l, order_id: order.id }));
    await supabase.from('rewair_order_lines').insert(linesWithOrderId);

    await supabase.from('rewair_email_logs').insert({
      integration_id: integrationId,
      message_uid: email.uid,
      from_address: email.from,
      from_name: email.fromName,
      subject: email.subject,
      received_at: email.date.toISOString(),
      is_order: true,
      order_id: order.id,
      ai_confidence: extracted.confidence,
      ai_summary: extracted.raw_summary,
      status: 'order_created',
    });

    console.log(`[Email]   ✅ Order created: ${orderNumber} from ${email.from}`);
  } catch (e: any) {
    console.error(`[Email]   ✗ Error processing ${email.uid}:`, e.message);
    await supabase.from('rewair_email_logs').insert({
      integration_id: integrationId,
      message_uid: email.uid,
      from_address: email.from,
      from_name: email.fromName,
      subject: email.subject,
      received_at: email.date.toISOString(),
      is_order: false,
      status: 'error',
      error_message: e.message,
    });  // best-effort logging
  }
}
