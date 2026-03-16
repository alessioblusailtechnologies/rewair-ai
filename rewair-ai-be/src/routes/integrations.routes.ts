import { Router } from 'express';
import { google } from 'googleapis';
import { supabase } from '../config/supabase';
import { encrypt } from '../utils/crypto';

const router = Router();

function getOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/api/integrations/email/oauth/callback',
  );
}

// ==================== OAuth2 Flow (must be BEFORE /:type) ====================

router.get('/email/oauth/url', (_req, res, next) => {
  try {
    const oauth2 = getOAuth2Client();
    const url = oauth2.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/gmail.modify',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
    });
    res.json({ url });
  } catch (e) { next(e); }
});

router.get('/email/oauth/callback', async (req, res, _next) => {
  try {
    const code = req.query.code as string;
    if (!code) { res.status(400).send('Missing code parameter'); return; }

    const oauth2 = getOAuth2Client();
    const { tokens } = await oauth2.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      res.status(400).send('Failed to obtain tokens. Try again.');
      return;
    }

    oauth2.setCredentials(tokens);
    const oauth2Api = google.oauth2({ version: 'v2', auth: oauth2 });
    const userInfo = await oauth2Api.userinfo.get();
    const email = userInfo.data.email;

    const tokensJson = JSON.stringify({
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    });
    const encrypted = encrypt(tokensJson);

    const { data: existing } = await supabase
      .from('rewair_integration_configs')
      .select('id')
      .eq('type', 'email_google')
      .maybeSingle();

    if (existing) {
      await supabase.from('rewair_integration_configs').update({
        email_address: email,
        credentials_enc: encrypted,
        updated_at: new Date().toISOString(),
        last_error: null,
      }).eq('id', existing.id);
    } else {
      await supabase.from('rewair_integration_configs').insert({
        type: 'email_google',
        label: 'Email Google',
        email_address: email,
        credentials_enc: encrypted,
        imap_host: 'imap.gmail.com',
        imap_port: 993,
        is_active: false,
      });
    }

    res.send(`
      <html><body><script>
        window.opener?.postMessage({ type: 'GOOGLE_OAUTH_SUCCESS', email: '${email}' }, '*');
        window.close();
      </script><p>Connessione riuscita! Questa finestra si chiuderà automaticamente.</p></body></html>
    `);
  } catch (e: any) {
    console.error('[OAuth Callback]', e.message);
    res.send(`
      <html><body><script>
        window.opener?.postMessage({ type: 'GOOGLE_OAUTH_ERROR', error: '${(e.message || '').replace(/'/g, '')}' }, '*');
        window.close();
      </script><p>Errore: ${e.message}</p></body></html>
    `);
  }
});

// ==================== Email config endpoints ====================

router.get('/email/logs', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '30', 10);
    const offset = (page - 1) * limit;
    const { data, error } = await supabase
      .from('rewair_email_logs')
      .select('*')
      .order('processed_at', { ascending: false })
      .range(offset, offset + limit - 1);
    if (error) throw error;
    res.json(data);
  } catch (e) { next(e); }
});

router.delete('/email/config', async (_req, res, next) => {
  try {
    const { error } = await supabase
      .from('rewair_integration_configs')
      .delete()
      .eq('type', 'email_google');
    if (error) throw error;
    res.status(204).send();
  } catch (e) { next(e); }
});

router.post('/email/toggle', async (req, res, next) => {
  try {
    const { active } = req.body;
    const { data, error } = await supabase
      .from('rewair_integration_configs')
      .update({ is_active: !!active, updated_at: new Date().toISOString() })
      .eq('type', 'email_google')
      .select('id, type, label, email_address, is_active, last_poll_at, last_poll_status')
      .single();
    if (error) throw error;
    res.json({ ...data, has_credentials: true });
  } catch (e) { next(e); }
});

// ==================== Generic (AFTER specific routes) ====================

router.get('/', async (_req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_integration_configs')
      .select('id, type, label, email_address, imap_host, imap_port, is_active, last_poll_at, last_poll_status, last_error, credentials_enc, created_at, updated_at')
      .order('type');
    if (error) throw error;

    const safe = (data || []).map(({ credentials_enc, ...rest }) => ({
      ...rest,
      has_credentials: !!credentials_enc,
    }));
    res.json(safe);
  } catch (e) { next(e); }
});

router.get('/:type', async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('rewair_integration_configs')
      .select('id, type, label, email_address, imap_host, imap_port, is_active, last_poll_at, last_poll_status, last_error, credentials_enc, created_at, updated_at')
      .eq('type', req.params.type)
      .maybeSingle();
    if (error) throw error;
    if (!data) { res.json(null); return; }

    const { credentials_enc, ...rest } = data;
    res.json({ ...rest, has_credentials: !!credentials_enc });
  } catch (e) { next(e); }
});

export default router;
