/**
 * Aliyun Model Configuration
 *
 * This module provides model configurations specific to Aliyun Bailian models.
 */

import { env } from '@/lib/env';
import type { ModelConfig } from '../types';
import {
  Provider,
  ModelType,
  getEnvNumber,
  DEFAULT_RETRY_COUNT,
  DEFAULT_REQUEST_TIMEOUT,
} from '../common';
import { registerModelConfigProvider } from '../model-config';

/**
 * Get model configuration for Aliyun models
 *
 * @param modelId The ID of the Aliyun model
 * @returns Configuration specific to the model
 */
export function getAliyunModelConfig(modelId: string): ModelConfig {
  // Convert model ID to lowercase for case-insensitive matching
  const modelIdLower = modelId?.toLowerCase() || '';

  // Default configuration for Aliyun models
  const defaultConfig: ModelConfig = {
    maxRetries: getEnvNumber(env.RETRY_COUNT, DEFAULT_RETRY_COUNT),
    requestTimeout: getEnvNumber(env.REQUEST_TIMEOUT, DEFAULT_REQUEST_TIMEOUT),
    type: ModelType.DEFAULT,
    provider: Provider.ALIYUN,
  };

  // Wanx models configuration (higher quality, longer processing time)
  if (modelIdLower.startsWith('wanx')) {
    return {
      maxRetries: 15,
      requestTimeout: 300000, // 5 minutes
      type: ModelType.HIGH_QUALITY,
      provider: Provider.ALIYUN,
    };
  }

  // Flux models configuration (faster processing)
  if (modelIdLower.startsWith('flux')) {
    return {
      maxRetries: getEnvNumber(env.RETRY_COUNT, DEFAULT_RETRY_COUNT),
      requestTimeout: getEnvNumber(
        env.REQUEST_TIMEOUT,
        DEFAULT_REQUEST_TIMEOUT,
      ),
      type: ModelType.FAST,
      provider: Provider.ALIYUN,
    };
  }

  // Return default configuration for unknown Aliyun models
  return defaultConfig;
}

// Register this provider's configuration function
registerModelConfigProvider(Provider.ALIYUN, getAliyunModelConfig);
