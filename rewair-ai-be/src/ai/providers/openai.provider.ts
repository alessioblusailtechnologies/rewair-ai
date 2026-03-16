import { AIProvider, AIProviderConfig, ExtractedOrder } from '../ai.types';

/**
 * OpenAI provider stub — implement when needed.
 * Install: npm install openai
 */
export class OpenAIProvider implements AIProvider {
  readonly name = 'openai';

  async extractOrderFromText(
    _text: string,
    _context: { customers: { code: string; name: string }[]; products: { sku: string; name: string }[] },
    _config?: AIProviderConfig,
  ): Promise<ExtractedOrder> {
    throw new Error('OpenAI provider not yet implemented. Set AI_PROVIDER=claude to use Claude.');
  }

  async extractOrderFromImage(
    _imageBase64: string,
    _mimeType: string,
    _context: { customers: { code: string; name: string }[]; products: { sku: string; name: string }[] },
    _config?: AIProviderConfig,
  ): Promise<ExtractedOrder> {
    throw new Error('OpenAI provider not yet implemented. Set AI_PROVIDER=claude to use Claude.');
  }
}
