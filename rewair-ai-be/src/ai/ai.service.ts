import { AIProvider } from './ai.types';
import { ClaudeProvider } from './providers/claude.provider';
import { OpenAIProvider } from './providers/openai.provider';

const providers: Record<string, () => AIProvider> = {
  claude: () => new ClaudeProvider(),
  openai: () => new OpenAIProvider(),
};

let instance: AIProvider | null = null;

export function getAIProvider(): AIProvider {
  if (instance) return instance;

  const providerName = (process.env.AI_PROVIDER || 'claude').toLowerCase();
  const factory = providers[providerName];
  if (!factory) {
    throw new Error(`Unknown AI provider "${providerName}". Available: ${Object.keys(providers).join(', ')}`);
  }

  instance = factory();
  console.log(`[AI] Using provider: ${instance.name}`);
  return instance;
}

/**
 * Register a custom AI provider at runtime.
 */
export function registerAIProvider(name: string, factory: () => AIProvider) {
  providers[name] = factory;
}
