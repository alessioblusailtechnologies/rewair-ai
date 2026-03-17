import PDFDocument from 'pdfkit';
import { google } from 'googleapis';
import { supabase } from '../config/supabase';
import { decrypt } from '../utils/crypto';

// ---------------------------------------------------------------------------
// PDF Generation — converts markdown-ish text into a styled PDF buffer
// ---------------------------------------------------------------------------
export async function generatePdf(title: string, markdownContent: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 },
      info: { Title: title, Author: 'ReWAir AI Agent' },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.fontSize(8).fillColor('#6B778C').text('REWAIR — AI AGENT REPORT', { align: 'left' });
    doc.fontSize(8).text(new Date().toLocaleString('it-IT'), { align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#DFE1E6').stroke();
    doc.moveDown(1);

    // Title
    doc.fontSize(20).fillColor('#172B4D').text(title, { align: 'left' });
    doc.moveDown(0.8);

    // Parse and render content
    const lines = markdownContent.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        doc.moveDown(0.3);
        continue;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        doc.moveDown(0.4);
        doc.fontSize(13).fillColor('#172B4D').text(trimmed.replace(/^### /, ''), { continued: false });
        doc.moveDown(0.2);
        continue;
      }
      if (trimmed.startsWith('## ')) {
        doc.moveDown(0.5);
        doc.fontSize(15).fillColor('#172B4D').text(trimmed.replace(/^## /, ''), { continued: false });
        doc.moveDown(0.3);
        continue;
      }
      if (trimmed.startsWith('# ')) {
        doc.moveDown(0.5);
        doc.fontSize(18).fillColor('#172B4D').text(trimmed.replace(/^# /, ''), { continued: false });
        doc.moveDown(0.3);
        continue;
      }

      // Horizontal rule
      if (trimmed === '---' || trimmed === '***') {
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#DFE1E6').stroke();
        doc.moveDown(0.3);
        continue;
      }

      // Bullet points
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.replace(/^[-*] /, '');
        doc.fontSize(10).fillColor('#344563').text(`  •  ${stripBold(text)}`, { indent: 10 });
        continue;
      }

      // Regular paragraph
      doc.fontSize(10).fillColor('#344563').text(stripBold(trimmed), { lineGap: 2 });
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor('#DFE1E6').stroke();
    doc.moveDown(0.5);
    doc.fontSize(7).fillColor('#97A0AF').text('Generato automaticamente da ReWAir AI Agent', { align: 'center' });

    doc.end();
  });
}

function stripBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

// ---------------------------------------------------------------------------
// Email sending via Gmail API (reuses existing OAuth credentials)
// ---------------------------------------------------------------------------
export async function sendEmailWithAttachment(
  to: string[],
  subject: string,
  bodyText: string,
  attachment?: { filename: string; content: Buffer; mimeType: string },
): Promise<void> {
  // Get the active email integration config
  const { data: config, error } = await supabase
    .from('rewair_integration_configs')
    .select('id, email_address, credentials_enc')
    .eq('type', 'email_google')
    .eq('is_active', true)
    .single();

  if (error || !config) {
    throw new Error('Nessuna integrazione email attiva. Configura Gmail in Integrazioni.');
  }

  const tokensJson = decrypt(config.credentials_enc);
  const tokens = JSON.parse(tokensJson);
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
  );
  oauth2.setCredentials(tokens);

  const gmail = google.gmail({ version: 'v1', auth: oauth2 });

  // Build RFC 2822 message
  const boundary = `boundary_${Date.now()}`;
  const toHeader = to.join(', ');

  let message = '';
  message += `From: ${config.email_address}\r\n`;
  message += `To: ${toHeader}\r\n`;
  message += `Subject: ${subject}\r\n`;
  message += `MIME-Version: 1.0\r\n`;

  if (attachment) {
    message += `Content-Type: multipart/mixed; boundary="${boundary}"\r\n\r\n`;
    message += `--${boundary}\r\n`;
    message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    message += `${bodyText}\r\n\r\n`;
    message += `--${boundary}\r\n`;
    message += `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"\r\n`;
    message += `Content-Disposition: attachment; filename="${attachment.filename}"\r\n`;
    message += `Content-Transfer-Encoding: base64\r\n\r\n`;
    message += attachment.content.toString('base64');
    message += `\r\n--${boundary}--`;
  } else {
    message += `Content-Type: text/plain; charset="UTF-8"\r\n\r\n`;
    message += bodyText;
  }

  // Base64url encode
  const encodedMessage = Buffer.from(message)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encodedMessage },
  });

  console.log(`[Agent] Email sent to ${toHeader}`);
}
