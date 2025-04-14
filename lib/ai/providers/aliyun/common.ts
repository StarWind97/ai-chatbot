/**
 * Aliyun Bailian Common Utilities
 *
 * This file contains shared utilities and helper functions specific to Aliyun Bailian API
 */

import { env } from '@/lib/env';
import type { ModelInfo } from '../types';
import { Provider } from '../common';

/**
 * Sleep utility for polling operations
 */
export const sleep = (ms: number) =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Get placeholder image data when API authentication fails
 * This returns a base64 encoded small placeholder image
 */
export function getPlaceholderImage(
  errorCode?: string,
  errorMessage?: string,
  model?: string,
) {
  // Red background placeholder image to make it obvious there was an error
  return {
    imageData:
      'iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAIAAADwf7zUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5wMHDjgUZRp0TgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACHklEQVR42u3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALgGKgwAAWCn5qkAAAAASUVORK5CYII=',
    errorInfo: errorCode
      ? {
          code: errorCode,
          message: errorMessage || 'Unknown error',
        }
      : undefined,
    model,
  };
}

/**
 * Get all available Aliyun image generation models
 */
export function getAvailableAliyunModels(): ModelInfo[] {
  try {
    const models: ModelInfo[] = [];
    // Add Flux model
    const fluxModel = env.ALIYUN_FLUX_MODEL;
    models.push({
      id: fluxModel,
      name: 'Flux Schnell (Fast)',
      type: 'flux',
      provider: Provider.ALIYUN,
    });

    // Add Wanx models
    const wanxModels: string[] = env.ALIYUN_WANX_MODELS;
    for (const model of wanxModels) {
      if (model) {
        models.push({
          id: model,
          name: `${model} (Higher Quality)`,
          type: 'wanx',
          provider: Provider.ALIYUN,
        });
      }
    }

    return models;
  } catch (error) {
    console.error('[ERROR] Failed to get models using env getters:', error);
    // Fallback in case of unexpected errors
    return [
      {
        id: 'flux-schnell',
        name: 'Flux Schnell (Fast)',
        type: 'flux',
        provider: Provider.ALIYUN,
      },
      {
        id: 'wanx2.1-t2i-turbo',
        name: 'wanx2.1-t2i-turbo (Higher Quality)',
        type: 'wanx',
        provider: Provider.ALIYUN,
      },
    ];
  }
}
