import Anthropic from '@anthropic-ai/sdk';

let _client: Anthropic | null = null;

export function getAnthropic(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

export function defaultModel(): string {
  return process.env.ANTHROPIC_MODEL_DEFAULT ?? 'claude-sonnet-4-6';
}

export function heavyModel(): string {
  return process.env.ANTHROPIC_MODEL_HEAVY ?? 'claude-opus-4-7';
}
