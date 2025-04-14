/**
 * Model Configuration Interface
 *
 * This module provides a common interface for model configurations.
 * The actual implementations are in each provider's directory.
 */

import type { ModelConfig } from './types';
import { Provider, ModelType } from './common';

/**
 * Function signature for provider-specific model configuration retrieval
 */
export type GetModelConfigFn = (modelId: string) => ModelConfig;

/**
 * Registry of provider-specific model configuration functions
 * This will be populated by each provider's implementation
 */
const modelConfigProviders: Record<Provider, GetModelConfigFn | undefined> = {
  [Provider.ALIYUN]: undefined,
  [Provider.OPENAI]: undefined,
  [Provider.OPENROUTER]: undefined,
  [Provider.ANTHROPIC]: undefined,
  [Provider.GOOGLE]: undefined,
  [Provider.DEFAULT]: undefined,
};

/**
 * Register a provider's model configuration function
 * This is called by each provider's implementation to register its getModelConfig function
 *
 * @param provider The provider enum value
 * @param configFn The function that returns model configurations for this provider
 */
export function registerModelConfigProvider(
  provider: Provider,
  configFn: GetModelConfigFn,
): void {
  modelConfigProviders[provider] = configFn;
}

/**
 * Get model configuration based on model ID and provider
 * This is the main entry point for getting model configurations
 *
 * @param modelId The ID of the model
 * @param provider The provider of the model
 * @returns Configuration for the specified model
 */
export function getModelConfig(
  modelId: string,
  provider: Provider = Provider.DEFAULT,
): ModelConfig {
  // Try to use the registered provider's implementation
  const providerFn = modelConfigProviders[provider];

  if (providerFn) {
    return providerFn(modelId);
  }

  // Fallback default configuration if no provider implementation is registered
  return {
    maxRetries: 10,
    requestTimeout: 60000,
    type: ModelType.DEFAULT,
    provider: provider,
  };
}

/**
 * Get provider from model ID
 * Helper function to extract provider information from model ID when it's embedded in the ID
 *
 * @param modelId The full model ID, which may contain provider information
 * @returns The detected provider or 'default' if none found
 */
export function getProviderFromModelId(modelId: string): string {
  const modelIdLower = modelId?.toLowerCase() || '';

  // Check for known provider prefixes in the model ID
  if (modelIdLower.startsWith('wanx') || modelIdLower.startsWith('flux')) {
    return 'aliyun';
  }

  // Add other provider detection logic here

  return 'default';
}
