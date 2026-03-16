import { supabase } from '../config/supabase';
import { fetchUnreadEmails, processEmail } from './email.service';

let interval: ReturnType<typeof setInterval> | null = null;
let polling = false;
let pollCount = 0;

export function startPolling() {
  const ms = parseInt(process.env.EMAIL_POLL_INTERVAL_MS || '20000', 10);
  console.log(`[Poller] ✓ Email polling started — interval: ${ms / 1000}s`);
  interval = setInterval(poll, ms);
}

export function stopPolling() {
  if (interval) {
    clearInterval(interval);
    interval = null;
    console.log('[Poller] ✗ Polling stopped');
  }
}

async function poll() {
  if (polling) {
    console.log('[Poller] ⏭ Skipping — previous poll still running');
    return;
  }
  polling = true;
  pollCount++;

  try {
    const { data: configs } = await supabase
      .from('rewair_integration_configs')
      .select('*')
      .eq('type', 'email_google')
      .eq('is_active', true);

    if (!configs?.length) {
      // Log only every 30th cycle to avoid spam
      if (pollCount % 30 === 1) console.log('[Poller] — No active email integrations');
      polling = false;
      return;
    }

    for (const config of configs) {
      const ts = new Date().toISOString().substring(11, 19);
      console.log(`[Poller] [${ts}] Checking ${config.email_address}...`);

      try {
        const emails = await fetchUnreadEmails(config, config.id);

        if (emails.length > 0) {
          console.log(`[Poller] [${ts}] 📬 ${emails.length} new email(s) found for ${config.email_address}`);
          for (const email of emails) {
            console.log(`[Poller]   → Processing: "${email.subject}" from ${email.from}`);
            await processEmail(email, config.id);
          }
        } else {
          console.log(`[Poller] [${ts}] — No new emails`);
        }

        await supabase.from('rewair_integration_configs').update({
          last_poll_at: new Date().toISOString(),
          last_poll_status: emails.length > 0 ? 'success' : 'no_new',
          last_error: null,
          updated_at: new Date().toISOString(),
        }).eq('id', config.id);

      } catch (e: any) {
        console.error(`[Poller] ✗ Error polling ${config.email_address}:`, e.message);
        await supabase.from('rewair_integration_configs').update({
          last_poll_at: new Date().toISOString(),
          last_poll_status: 'error',
          last_error: e.message,
          updated_at: new Date().toISOString(),
        }).eq('id', config.id);
      }
    }
  } catch (e: any) {
    console.error('[Poller] ✗ Fatal error:', e.message);
  }

  polling = false;
}
