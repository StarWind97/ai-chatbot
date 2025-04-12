/**
 * Aliyun DashScope Image Generation Provider
 *
 * This module provides an adapter for the Aliyun DashScope API,
 * specifically for text-to-image generation with Flux and Wanx models.
 *
 * Note: To use this service, you need to register an account on Aliyun DashScope platform
 * and obtain a valid API key. The current implementation handles authentication errors
 * gracefully by returning a placeholder image.
 */

import axios from 'axios';
import { env } from '@/lib/env';

/**
 * Interface for image generation parameters
 */
export interface FluxImageGenerationParams {
  prompt: string;
  negative_prompt?: string;
  width?: number;
  height?: number;
  seed?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  model?: string; // Added model parameter
}

/**
 * Interface for image generation result
 */
export interface FluxImageGenerationResult {
  imageData: string;
  errorInfo?: {
    code: string;
    message: string;
  };
  model?: string; // Added to track which model was used
}

/**
 * Utility function to get models directly from environment
 * This is a fallback when normal processing fails
 */
function getModelsFromEnv(): { id: string; name: string; type: string }[] {
  const result = [];
  const modelDebug = [];

  // Always add the flux model
  const fluxModel = process.env.DASHSCOPE_FLUX_MODEL || 'flux-schnell';
  result.push({ id: fluxModel, name: 'Flux Schnell (Fast)', type: 'flux' });
  modelDebug.push(`Flux model: ${fluxModel}`);

  // Try to get wanx models directly from env
  try {
    const wanxEnv = process.env.DASHSCOPE_WANX_MODELS || '';
    if (wanxEnv && typeof wanxEnv === 'string') {
      const models = wanxEnv
        .split(',')
        .map((m: string) => m.trim())
        .filter(Boolean);

      modelDebug.push(`Wanx models from direct env: ${models.join(', ')}`);
      modelDebug.push(`Raw WANX_MODELS env string: "${wanxEnv}"`);

      for (const model of models) {
        result.push({
          id: model,
          name: `${model} (Higher Quality)`,
          type: 'wanx',
        });
      }
    }
  } catch (e) {
    console.error('[ERROR] Failed to parse wanx models from env:', e);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[DEBUG] Models from getModelsFromEnv(): ${result.length}`);
    console.log(`[DEBUG] ${modelDebug.join('\n[DEBUG] ')}`);
  }

  return result;
}

/**
 * Get all available DashScope image generation models
 * Combines Flux and Wanx models
 */
export function getAvailableDashScopeModels(): {
  id: string;
  name: string;
  type: string;
}[] {
  try {
    const models = [];
    // Use the getter from env, which now provides the processed array
    const fluxModel = env.DASHSCOPE_FLUX_MODEL;

    // Add the Flux model first
    models.push({ id: fluxModel, name: 'Flux Schnell (Fast)', type: 'flux' });

    // Use the getter from env for Wanx models, which returns the processed array
    const wanxModels: string[] = env.DASHSCOPE_WANX_MODELS;

    // Add Wanx models
    for (const model of wanxModels) {
      if (model) {
        models.push({
          id: model,
          name: `${model} (Higher Quality)`,
          type: 'wanx',
        });
      }
    }

    // Remove debug logs for the final list
    // if (process.env.NODE_ENV !== 'production') {
    //   console.log('[DEBUG] getAvailableDashScopeModels - Final models from env getters:', JSON.stringify(models, null, 2));
    //   console.log('[DEBUG] getAvailableDashScopeModels - Total model count:', models.length);
    // }

    return models;
  } catch (error) {
    console.error('[ERROR] Failed to get models using env getters:', error);
    // Fallback in case of unexpected errors
    return [
      { id: 'flux-schnell', name: 'Flux Schnell (Fast)', type: 'flux' },
      {
        id: 'wanx2.1-t2i-turbo',
        name: 'wanx2.1-t2i-turbo (Higher Quality)',
        type: 'wanx',
      },
    ];
  }
}

/**
 * Get a placeholder image data when API authentication fails
 * This returns a base64 encoded small placeholder image
 */
function getPlaceholderImage(
  errorCode?: string,
  errorMessage?: string,
  model?: string,
): FluxImageGenerationResult {
  // Red background placeholder image to make it more obvious there was an error
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
 * Sleep for specified milliseconds
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Determine if the model is a Wanx model
 */
function isWanxModel(model: string): boolean {
  return model.toLowerCase().startsWith('wanx');
}

/**
 * Generate an image using Aliyun DashScope API (asynchronous workflow)
 * @param params Image generation parameters
 * @returns Promise with generation result containing base64 encoded image data and error info if any
 */
export async function generateFluxImage(
  params: FluxImageGenerationParams,
): Promise<FluxImageGenerationResult> {
  // Log the incoming parameters at the very beginning
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[DEBUG] Entering generateFluxImage with params:',
      JSON.stringify(params, null, 2),
    );
  }

  try {
    // Determine model to use
    const model = params.model || env.DASHSCOPE_FLUX_MODEL;

    // Convert dimensions to string format required by the API
    const size = `${params.width || 1024}*${params.height || 1024}`;

    // Prepare request parameters with defaults
    const requestBody = {
      model: model,
      input: {
        prompt: params.prompt,
        negative_prompt: params.negative_prompt || '',
      },
      parameters: {
        size: size,
        seed: params.seed || Math.floor(Math.random() * 10000),
        steps: params.num_inference_steps || 20,
      },
    };

    // Log request details (in development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `Sending image generation request to DashScope API using model: ${model}`,
      );
      console.log(
        'Request URL:',
        `${env.ALIYUN_API_BASE_URL}/services/aigc/text2image/image-synthesis`,
      );
      console.log('Request body:', JSON.stringify(requestBody, null, 2));

      // Show partial API key for debugging
      const lastFourChars = env.ALIYUN_API_KEY.substring(
        env.ALIYUN_API_KEY.length - 4,
      );
      console.log(`Auth header format: Bearer XXXX...${lastFourChars}`);
    }

    // Step 1: Submit job to DashScope API
    const submitResponse = await axios.post(
      `${env.ALIYUN_API_BASE_URL}/services/aigc/text2image/image-synthesis`,
      requestBody,
      {
        headers: {
          Authorization: `Bearer ${env.ALIYUN_API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        timeout: env.REQUEST_TIMEOUT,
      },
    );

    // Debug logging in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        'DashScope API job submission response:',
        JSON.stringify(submitResponse.data, null, 2),
      );
    }

    // Check for API errors in submission
    if (submitResponse.data.code) {
      console.error(
        `DashScope API error: ${submitResponse.data.code} - ${submitResponse.data.message}`,
      );
      return getPlaceholderImage(
        submitResponse.data.code,
        submitResponse.data.message,
        model,
      );
    }

    // Extract task ID - adjust based on the actual response structure
    const taskId = submitResponse.data.output?.task_id;
    if (!taskId) {
      console.error('No task ID returned from DashScope API');
      return getPlaceholderImage(
        'NO_TASK_ID',
        'No task ID returned from API',
        model,
      );
    }

    // Step 2: Poll for job completion
    let retries = 0;
    // Wanx models need more retries as they take longer to generate
    const isWanx = isWanxModel(model);
    // Make sure we have reasonable defaults even if env.RETRY_COUNT is not set correctly
    const maxRetries = isWanx ? 15 : Number(env.RETRY_COUNT) || 10;
    const requestTimeout = isWanx ? 300000 : env.REQUEST_TIMEOUT;
    let taskStatus = 'PENDING';
    let taskResult = null;
    let errorCode = '';
    let errorMessage = '';
    // Store the latest API response
    let lastApiResponse = null;

    // Poll for results with exponential backoff
    while (
      retries < maxRetries &&
      ['PENDING', 'RUNNING'].includes(taskStatus)
    ) {
      // Wait before checking (increasing delay with each retry)
      await sleep(1000 * Math.pow(1.5, retries));

      try {
        // Query task status
        const statusResponse = await axios.get(
          `${env.ALIYUN_API_BASE_URL}/tasks/${taskId}`,
          {
            headers: {
              Authorization: `Bearer ${env.ALIYUN_API_KEY}`,
            },
            timeout: requestTimeout,
          },
        );

        // Save latest response
        lastApiResponse = statusResponse;

        // Debug logging in development
        if (process.env.NODE_ENV !== 'production') {
          console.log(
            `Task status check (attempt ${retries + 1}):`,
            JSON.stringify(statusResponse.data, null, 2),
          );
        }

        // Update task status - adjust based on the actual response structure
        taskStatus = statusResponse.data.output?.task_status || 'FAILED';

        // Capture error information if available
        if (taskStatus === 'FAILED') {
          errorCode = statusResponse.data.output?.code || 'UNKNOWN_ERROR';
          errorMessage = statusResponse.data.output?.message || 'Unknown error';
        }

        // If task completed successfully, get the result
        if (taskStatus === 'SUCCEEDED') {
          // Different result structure for Flux and Wanx models
          if (isWanx) {
            taskResult = statusResponse.data.output?.results?.[0]?.url;
          } else {
            // For Flux models, directly get image URL
            taskResult = statusResponse.data.output?.results?.[0]?.url;
          }
          break;
        }

        retries++;
      } catch (error) {
        console.error(
          `Error checking task status (attempt ${retries + 1}):`,
          error,
        );
        retries++;
      }
    }

    // Check if we have a valid result
    if (taskStatus === 'SUCCEEDED' && taskResult) {
      // For all models, we now need to download the image from the URL
      try {
        console.log(
          `Task ${taskId} completed successfully. Downloading image from: ${taskResult}`,
        );
        const imageResponse = await axios.get(taskResult, {
          responseType: 'arraybuffer',
        });

        // Convert image to base64
        const base64Image = Buffer.from(imageResponse.data, 'binary').toString(
          'base64',
        );
        console.log(
          `Image for task ${taskId} successfully downloaded and converted to base64`,
        );
        return { imageData: `data:image/png;base64,${base64Image}`, model };
      } catch (error) {
        console.error('Error downloading image:', error);
        return getPlaceholderImage(
          'IMAGE_DOWNLOAD_ERROR',
          'Failed to download image',
          model,
        );
      }
    } else if (taskStatus === 'SUCCEEDED' && lastApiResponse) {
      // Task succeeded but taskResult was not set - try extracting URL from last response
      try {
        // Look for image URL directly in response data structure
        const imageUrl = lastApiResponse.data.output?.results?.[0]?.url;
        console.log(
          `Task ${taskId} succeeded but taskResult not set. Attempting to extract URL from response:`,
          imageUrl ? `Found URL: ${imageUrl}` : 'No URL found',
        );

        if (imageUrl) {
          try {
            const imageResponse = await axios.get(imageUrl, {
              responseType: 'arraybuffer',
            });

            // Convert image to base64
            const base64Image = Buffer.from(
              imageResponse.data,
              'binary',
            ).toString('base64');
            console.log(
              `Image for task ${taskId} successfully downloaded from lastApiResponse URL`,
            );
            return { imageData: `data:image/png;base64,${base64Image}`, model };
          } catch (error) {
            console.error('Error downloading image from URL:', error);
            return getPlaceholderImage(
              'IMAGE_DOWNLOAD_ERROR',
              'Failed to download image',
              model,
            );
          }
        }

        console.error('Task succeeded but no image URL found in response');
        return getPlaceholderImage(
          'NO_IMAGE_URL',
          'No image URL found in successful response',
          model,
        );
      } catch (error) {
        console.error('Error processing successful response:', error);
        return getPlaceholderImage(
          'PROCESSING_ERROR',
          'Error processing successful response',
          model,
        );
      }
    } else if (taskStatus === 'RUNNING' || taskStatus === 'PENDING') {
      // Task is still processing but we've hit our timeout
      const modelType = isWanx ? 'Wanx' : 'Flux';
      console.warn(
        `Model ${model} (${modelType}) is still processing (${taskStatus}) after ${retries} attempts. Maximum retry limit: ${maxRetries}`,
      );
      return getPlaceholderImage(
        'STILL_PROCESSING',
        `The model ${model} is still processing the image. This may take longer than expected. Try again later.`,
        model,
      );
    } else {
      console.error(
        `Task did not complete within time limit. Final status: ${taskStatus}`,
      );
      return getPlaceholderImage(
        errorCode || 'TIMEOUT_ERROR',
        errorMessage || 'Task did not complete within time limit',
        model,
      );
    }
  } catch (error) {
    console.error(
      `Error generating image with model ${params.model || 'default'}:`,
      error,
    );
    // Return placeholder image instead of throwing an error
    return getPlaceholderImage(
      'API_REQUEST_ERROR',
      error instanceof Error ? error.message : 'Unknown error',
      params.model,
    );
  }
}

// Polling function with exponential backoff
async function pollForJobCompletion(
  taskId: string,
  retryCount = 0,
  retryDelay = 2000,
  maxRetries = 10,
): Promise<string | null> {
  if (retryCount >= maxRetries) {
    console.warn(
      `Task ${taskId} is still processing after ${maxRetries} attempts - reached maximum retry limit`,
    );
    return null;
  }

  try {
    console.log(
      `Polling task ${taskId}, attempt ${retryCount + 1}/${maxRetries}`,
    );
    // ... existing code ...

    // 这里缺少实际实现代码，添加一个临时返回
    // 在实际应用中应该发起API请求并返回结果
    return null; // 临时返回空值，实际应返回任务结果或状态
  } catch (error) {
    console.error('Error polling for job completion:', error);
    if (axios.isAxiosError(error) && error.response) {
      console.error(
        `API Error: ${error.response.status} - ${JSON.stringify(
          error.response.data,
        )}`,
      );
    }
    // Wait before retrying
    await sleep(retryDelay);
    return pollForJobCompletion(
      taskId,
      retryCount + 1,
      Math.min(retryDelay * 2, 10000), // Exponential backoff with max 10s
      maxRetries,
    );
  }
}
