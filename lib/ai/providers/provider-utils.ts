/**
 * Provider Utilities
 *
 * This module provides utility functions for working with AI providers.
 */

import { Provider } from './common';

/**
 * Detect provider from model ID based on known naming patterns
 *
 * @param modelId The model ID to analyze
 * @returns The detected provider or DEFAULT if unknown
 */
export function detectProviderFromModelId(modelId: string): Provider {
  if (!modelId) return Provider.DEFAULT;

  const modelIdLower = modelId.toLowerCase();

  // Check for Aliyun models
  if (modelIdLower.startsWith('wanx') || modelIdLower.startsWith('flux')) {
    return Provider.ALIYUN;
  }

  // Check for OpenAI models
  if (
    modelIdLower.startsWith('gpt-') ||
    modelIdLower.includes('dall-e') ||
    modelIdLower.includes('whisper')
  ) {
    return Provider.OPENAI;
  }

  // Check for Anthropic models
  if (modelIdLower.includes('claude')) {
    return Provider.ANTHROPIC;
  }

  // Check for Google models
  if (
    modelIdLower.includes('gemini') ||
    modelIdLower.includes('palm') ||
    modelIdLower.startsWith('text-bison')
  ) {
    return Provider.GOOGLE;
  }

  // Default case
  return Provider.DEFAULT;
}

/**
 * Format provider name for display
 *
 * @param provider The provider enum value
 * @returns Human-readable provider name
 */
export function formatProviderName(provider: Provider): string {
  switch (provider) {
    case Provider.ALIYUN:
      return 'Aliyun Bailian';
    case Provider.OPENAI:
      return 'OpenAI';
    case Provider.OPENROUTER:
      return 'OpenRouter';
    case Provider.ANTHROPIC:
      return 'Anthropic';
    case Provider.GOOGLE:
      return 'Google AI';
    case Provider.DEFAULT:
    default:
      return 'Default Provider';
  }
}
