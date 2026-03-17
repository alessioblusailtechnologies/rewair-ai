import PDFDocument from 'pdfkit';
import { google } from 'googleapis';
import { supabase } from '../config/supabase';
import { decrypt } from '../utils/crypto';

// ---------------------------------------------------------------------------
// PDF Generation — converts markdown-ish text into a styled PDF buffer
// ---------------------------------------------------------------------------

/** Remove emoji and other non-Latin unicode symbols that Helvetica cannot render */
function stripEmoji(text: string): string {
  return text
    .replace(/[\u{1F000}-\u{1FFFF}]/gu, '')   // emoticons, symbols, etc.
    .replace(/[\u{2600}-\u{27BF}]/gu, '')      // misc symbols & dingbats
    .replace(/[\u{FE00}-\u{FE0F}]/gu, '')      // variation selectors
    .replace(/[\u{200D}]/gu, '')                // zero-width joiner
    .replace(/[\u{20E3}]/gu, '')                // combining enclosing keycap
    .replace(/[\u{E0020}-\u{E007F}]/gu, '')    // tags
    .replace(/\s{2,}/g, ' ')                    // collapse double spaces left behind
    .trim();
}

function stripBold(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1');
}

/** Clean a text cell: strip emoji, bold markers, and surrounding whitespace */
function cleanText(text: string): string {
  return stripEmoji(stripBold(text)).trim();
}

/** Check if a line is a markdown table separator (e.g. |---|---|) */
function isTableSeparator(line: string): boolean {
  return /^\|[\s\-:|]+\|$/.test(line.trim());
}

/** Parse a markdown table row into cell strings */
function parseTableRow(line: string): string[] {
  return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => cleanText(c));
}

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

    const pageWidth = 495; // 545 - 50
    const leftMargin = 50;
    const rightEdge = 545;

    // Header
    doc.fontSize(8).fillColor('#6B778C').text('REWAIR — AI AGENT REPORT', { align: 'left' });
    doc.fontSize(8).text(new Date().toLocaleString('it-IT'), { align: 'right' });
    doc.moveDown(0.5);
    doc.moveTo(leftMargin, doc.y).lineTo(rightEdge, doc.y).strokeColor('#DFE1E6').stroke();
    doc.moveDown(1);

    // Title
    doc.fontSize(20).fillColor('#172B4D').text(cleanText(title), { align: 'left' });
    doc.moveDown(0.8);

    // Helper: ensure there's enough space on the page, otherwise add a new page
    function ensureSpace(needed: number) {
      if (doc.y + needed > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
      }
    }

    // Helper: draw a table from collected rows
    function drawTable(rows: string[][]) {
      if (rows.length === 0) return;

      const cols = rows[0].length;
      const colWidth = pageWidth / cols;
      const fontSize = 8;
      const cellPadding = 4;
      const rowHeight = fontSize + cellPadding * 2 + 2;

      for (let r = 0; r < rows.length; r++) {
        ensureSpace(rowHeight + 4);
        const y = doc.y;
        const isHeader = r === 0;

        // Background for header row
        if (isHeader) {
          doc.save();
          doc.rect(leftMargin, y, pageWidth, rowHeight).fill('#F4F5F7');
          doc.restore();
        }

        // Draw cells
        for (let c = 0; c < cols; c++) {
          const x = leftMargin + c * colWidth;
          const cellText = (rows[r][c] || '').substring(0, 60); // truncate long cells

          doc.fontSize(fontSize)
            .fillColor(isHeader ? '#172B4D' : '#344563')
            .text(cellText, x + cellPadding, y + cellPadding, {
              width: colWidth - cellPadding * 2,
              height: rowHeight,
              lineBreak: false,
            });
        }

        // Row bottom border
        doc.moveTo(leftMargin, y + rowHeight).lineTo(rightEdge, y + rowHeight).strokeColor('#DFE1E6').stroke();
        doc.y = y + rowHeight + 1;
      }

      doc.moveDown(0.3);
    }

    // Parse and render content
    const lines = markdownContent.split('\n');
    let inCodeBlock = false;
    let tableRows: string[][] = [];

    for (let i = 0; i < lines.length; i++) {
      const trimmed = lines[i].trim();

      // Flush pending table if current line is not a table row
      if (tableRows.length > 0 && !trimmed.startsWith('|')) {
        drawTable(tableRows);
        tableRows = [];
      }

      if (!trimmed) {
        if (!inCodeBlock) doc.moveDown(0.3);
        continue;
      }

      // Code block toggle
      if (trimmed.startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        if (inCodeBlock) {
          doc.moveDown(0.2);
        } else {
          doc.moveDown(0.2);
        }
        continue;
      }

      // Inside code block — render as monospace-style
      if (inCodeBlock) {
        ensureSpace(14);
        const codeLine = stripEmoji(trimmed);
        doc.fontSize(8).fillColor('#505F79').text(codeLine, leftMargin + 10, doc.y, {
          width: pageWidth - 20,
        });
        continue;
      }

      // Table rows
      if (trimmed.startsWith('|')) {
        if (isTableSeparator(trimmed)) continue; // skip |---|---| lines
        tableRows.push(parseTableRow(trimmed));
        continue;
      }

      // Headings
      if (trimmed.startsWith('### ')) {
        ensureSpace(22);
        doc.moveDown(0.4);
        doc.fontSize(13).fillColor('#172B4D').text(cleanText(trimmed.replace(/^### /, '')), { continued: false });
        doc.moveDown(0.2);
        continue;
      }
      if (trimmed.startsWith('## ')) {
        ensureSpace(26);
        doc.moveDown(0.5);
        doc.fontSize(15).fillColor('#172B4D').text(cleanText(trimmed.replace(/^## /, '')), { continued: false });
        doc.moveDown(0.3);
        continue;
      }
      if (trimmed.startsWith('# ')) {
        ensureSpace(30);
        doc.moveDown(0.5);
        doc.fontSize(18).fillColor('#172B4D').text(cleanText(trimmed.replace(/^# /, '')), { continued: false });
        doc.moveDown(0.3);
        continue;
      }

      // Horizontal rule
      if (trimmed === '---' || trimmed === '***') {
        doc.moveDown(0.3);
        doc.moveTo(leftMargin, doc.y).lineTo(rightEdge, doc.y).strokeColor('#DFE1E6').stroke();
        doc.moveDown(0.3);
        continue;
      }

      // Checkbox items
      if (trimmed.startsWith('- [ ] ') || trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ')) {
        ensureSpace(14);
        const checked = trimmed.startsWith('- [x] ') || trimmed.startsWith('- [X] ');
        const text = cleanText(trimmed.replace(/^- \[.\] /, ''));
        const marker = checked ? '[x]' : '[ ]';
        doc.fontSize(10).fillColor('#344563').text(`  ${marker}  ${text}`, { indent: 10 });
        continue;
      }

      // Bullet points (including numbered lists like "1. ")
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || /^\d+\.\s/.test(trimmed)) {
        ensureSpace(14);
        const text = trimmed.replace(/^[-*]\s/, '').replace(/^\d+\.\s/, '');
        doc.fontSize(10).fillColor('#344563').text(`  •  ${cleanText(text)}`, { indent: 10 });
        continue;
      }

      // Regular paragraph
      ensureSpace(14);
      doc.fontSize(10).fillColor('#344563').text(cleanText(trimmed), { lineGap: 2 });
    }

    // Flush any remaining table
    if (tableRows.length > 0) {
      drawTable(tableRows);
    }

    // Footer
    doc.moveDown(2);
    doc.moveTo(leftMargin, doc.y).lineTo(rightEdge, doc.y).strokeColor('#DFE1E6').stroke();
    doc.moveDown(0.5);
    doc.fontSize(7).fillColor('#97A0AF').text('Generato automaticamente da ReWAir AI Agent', { align: 'center' });

    doc.end();
  });
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
  message += `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\r\n`;
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
