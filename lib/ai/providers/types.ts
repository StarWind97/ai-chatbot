/**
 * Common type definitions for AI provider integrations
 * These types are designed to be platform-agnostic and reusable across different providers
 */

import type { Provider, ModelType } from './common';

/**
 * Generic interface for image generation parameters
 * This serves as a base for all image generation implementations
 */
export interface ImageGenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  model?: string;
  seed?: number;
  steps?: number;
  guidance_scale?: number;
  // Additional common parameters can be added here
}

/**
 * Generic interface for image generation results
 * This is returned by all image generation implementations
 */
export interface ImageGenerationResult {
  imageData: string;
  errorInfo?: {
    code: string;
    message: string;
  };
  model?: string;
  // Additional common result fields can be added here
}

/**
 * Model configuration interface for different model types
 * Used to specify model-specific settings like timeouts and retry policies
 */
export interface ModelConfig {
  // Maximum number of retries for polling or other operations
  maxRetries: number;
  // Request timeout in milliseconds
  requestTimeout: number;
  // Model type identifier
  type: ModelType;
  // Provider identifier
  provider: Provider;
  // Any additional provider-specific configuration
  [key: string]: any;
}

/**
 * Model information interface
 * Used for representing available models across providers
 */
export interface ModelInfo {
  id: string;
  name: string;
  type: string;
  provider: Provider;
}
