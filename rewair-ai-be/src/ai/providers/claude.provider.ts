import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, AIProviderConfig, ExtractedOrder } from '../ai.types';

const SYSTEM_PROMPT = `Sei un assistente AI per ReWAir, azienda specializzata nel kitting di materiali compositi per l'industria eolica.
Il tuo compito è estrarre dati strutturati di ordine da documenti (PDF, email, immagini).

ReWAir produce kit per pale eoliche: Glass Kit, Core Kit, Vacuum Kit, Protective Cover.

REGOLA FONDAMENTALE PER IL MATCHING:
- Ti verrà fornita una lista di clienti noti (codice + nome) e prodotti noti (SKU + nome) dal database.
- Per "customer_code": DEVI restituire il CODICE del cliente noto che corrisponde al cliente nel documento, anche se il nome non è identico. Usa il buon senso: "Siemens Gamesa Renewable Energy S.A." corrisponde a "Siemens Gamesa" → codice "SIEMENS". "Vestas Wind Systems A/S" corrisponde a "Vestas" → codice "VESTAS". Fai sempre fuzzy matching.
- Per "product_sku" nelle righe: DEVI restituire lo SKU del prodotto noto più vicino. Associa per tipo di prodotto, dimensioni, e contesto. Se il documento dice "Glass Kit 80m prefab" → SKU "GK-PF-80".
- Se davvero non riesci ad associare, usa null.

Devi estrarre:
- customer_code: codice del cliente noto matchato (FONDAMENTALE)
- customer_name: nome del cliente come appare nel documento
- Numero ordine (se presente)
- Data ordine
- Data consegna richiesta
- Priorità (1=urgente, 5=normale, 10=bassa)
- Righe ordine con product_sku matchato

Rispondi SOLO con JSON valido, senza markdown, senza commenti. Schema:
{
  "customer_name": "string",
  "customer_code": "string|null",
  "order_number": "string|null",
  "order_date": "YYYY-MM-DD|null",
  "requested_delivery_date": "YYYY-MM-DD|null",
  "priority": number,
  "notes": "string|null",
  "lines": [{"product_sku": "string|null", "product_name": "string", "quantity": number, "due_date": "YYYY-MM-DD|null"}],
  "confidence": number,
  "raw_summary": "string"
}

Il campo "confidence" è tra 0 e 1. "raw_summary" è un breve riassunto.`;

export class ClaudeProvider implements AIProvider {
  readonly name = 'claude';
  private client: Anthropic;

  constructor() {
    this.client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }

  async extractOrderFromText(
    text: string,
    context: { customers: { code: string; name: string }[]; products: { sku: string; name: string }[] },
    config?: AIProviderConfig,
  ): Promise<ExtractedOrder> {
    const contextPrompt = this.buildContext(context);

    const response = await this.client.messages.create({
      model: config?.model || 'claude-opus-4-6',
      max_tokens: config?.maxTokens || 2048,
      temperature: config?.temperature ?? 0.1,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: `${contextPrompt}\n\n--- DOCUMENTO ---\n${text}\n--- FINE DOCUMENTO ---\n\nEstrai i dati dell'ordine dal documento sopra. Rispondi solo con JSON.`,
      }],
    });

    return this.parseResponse(response);
  }

  async extractOrderFromImage(
    imageBase64: string,
    mimeType: string,
    context: { customers: { code: string; name: string }[]; products: { sku: string; name: string }[] },
    config?: AIProviderConfig,
  ): Promise<ExtractedOrder> {
    const contextPrompt = this.buildContext(context);

    const response = await this.client.messages.create({
      model: config?.model || 'claude-opus-4-6',
      max_tokens: config?.maxTokens || 2048,
      temperature: config?.temperature ?? 0.1,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: `${contextPrompt}\n\nEstrai i dati dell'ordine dall'immagine allegata. Rispondi solo con JSON.` },
          { type: 'image', source: { type: 'base64', media_type: mimeType as any, data: imageBase64 } },
        ],
      }],
    });

    return this.parseResponse(response);
  }

  private buildContext(context: { customers: { code: string; name: string }[]; products: { sku: string; name: string }[] }): string {
    const customersList = context.customers.map(c => `- ${c.code}: ${c.name}`).join('\n');
    const productsList = context.products.map(p => `- ${p.sku}: ${p.name}`).join('\n');
    return `CLIENTI NOTI NEL DATABASE (codice: nome):\n${customersList}\n\nPRODOTTI DISPONIBILI (SKU: nome):\n${productsList}`;
  }

  private parseResponse(response: Anthropic.Message): ExtractedOrder {
    const text = response.content.find(b => b.type === 'text');
    if (!text || text.type !== 'text') throw new Error('No text response from Claude');

    // Strip any markdown fencing if present
    let json = text.text.trim();
    if (json.startsWith('```')) {
      json = json.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    return JSON.parse(json) as ExtractedOrder;
  }
}
