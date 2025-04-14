/**
 * Common utilities for AI providers
 *
 * This file contains shared utilities and helper functions that are used across different AI providers.
 */

import { env } from '@/lib/env';

/**
 * Sleep utility for polling operations - used by many providers for async operations
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Provider enum for type safety when identifying AI providers
 */
export enum Provider {
  ALIYUN = 'aliyun',
  OPENAI = 'openai',
  OPENROUTER = 'openrouter',
  ANTHROPIC = 'anthropic',
  GOOGLE = 'google',
  DEFAULT = 'default',
}

/**
 * Model type enum for categorizing models by their capabilities/performance
 */
export enum ModelType {
  DEFAULT = 'default',
  FAST = 'fast',
  HIGH_QUALITY = 'high_quality',
  BALANCED = 'balanced',
}

/**
 * Default retry count for API calls if env value is not set
 */
export const DEFAULT_RETRY_COUNT = 10;

/**
 * Default request timeout in milliseconds if env value is not set
 */
export const DEFAULT_REQUEST_TIMEOUT = 60000;

/**
 * Safely parse a number from environment variable with fallback
 */
export function getEnvNumber(
  value: string | number | undefined,
  fallback: number,
): number {
  if (value === undefined) return fallback;

  // If already a number, just return it
  if (typeof value === 'number') return value;

  // Try to convert string to number
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
}
