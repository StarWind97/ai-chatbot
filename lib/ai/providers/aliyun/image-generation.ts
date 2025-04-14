/**
 * Aliyun Bailian Image Generation Provider
 *
 * This module provides an adapter for the Aliyun Bailian API,
 * specifically for text-to-image generation with Flux and Wanx models.
 */

import axios from 'axios';
import { env } from '@/lib/env';
import type { ImageGenerationParams, ImageGenerationResult } from '../types';
import { getModelConfig } from '../model-config';
import { Provider, sleep } from '../common';
import { getPlaceholderImage } from './common';

/**
 * Aliyun-specific image generation parameters
 * Extends the common parameters with platform-specific options
 */
export interface AliyunImageGenerationParams extends ImageGenerationParams {
  // Aliyun-specific parameters can be added here
  num_inference_steps?: number; // Alias for steps for backward compatibility
}

/**
 * Aliyun-specific image generation result
 * Extends the common result with platform-specific fields
 */
export interface AliyunImageGenerationResult extends ImageGenerationResult {
  // Aliyun-specific result fields can be added here
}

/**
 * Generate an image using Aliyun Bailian API (asynchronous workflow)
 * Supports both Flux and Wanx model types
 *
 * @param params Image generation parameters
 * @returns Promise with generation result containing base64 encoded image data and error info if any
 */
export async function generateAliyunImage(
  params: AliyunImageGenerationParams,
): Promise<AliyunImageGenerationResult> {
  // Log the incoming parameters at the very beginning
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[DEBUG] Entering generateAliyunImage with params:',
      JSON.stringify(params, null, 2),
    );
  }

  // Maximum number of retries for internal errors
  const MAX_INTERNAL_ERROR_RETRIES = 3;
  let internalErrorRetryCount = 0;

  // Define a helper function to make the API request with proper error handling
  async function makeAPIRequest(
    requestBody: any,
    modelName: string,
  ): Promise<AliyunImageGenerationResult> {
    try {
      // Debug logging in development
      if (process.env.NODE_ENV !== 'production') {
        console.log(
          `Sending image generation request to Aliyun Bailian API using model: ${modelName}`,
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

      // Step 1: Submit job to Aliyun Bailian API
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
          'Aliyun Bailian API job submission response:',
          JSON.stringify(submitResponse.data, null, 2),
        );
      }

      // Check for API errors in submission
      if (submitResponse.data.code) {
        console.error(
          `Aliyun Bailian API error: ${submitResponse.data.code} - ${submitResponse.data.message}`,
        );
        return getPlaceholderImage(
          submitResponse.data.code,
          submitResponse.data.message,
          modelName,
        );
      }

      // Extract task ID
      const taskId = submitResponse.data.output?.task_id;
      if (!taskId) {
        console.error('No task ID returned from Aliyun Bailian API');
        return getPlaceholderImage(
          'NO_TASK_ID',
          'No task ID returned from API',
          modelName,
        );
      }

      // Step 2: Poll for job completion
      let retries = 0;
      // Get model-specific configuration
      const modelConfig = getModelConfig(modelName, Provider.ALIYUN);
      // Use configuration from model type
      const maxRetries = modelConfig.maxRetries;
      const requestTimeout = modelConfig.requestTimeout;
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
            errorMessage =
              statusResponse.data.output?.message || 'Unknown error';

            // If we encounter the CUDA/CPU tensor error, break and retry with a different seed
            if (
              errorCode === 'InternalError.Algo' &&
              errorMessage.includes(
                'Expected all tensors to be on the same device',
              ) &&
              retries < maxRetries - 1
            ) {
              console.log(
                `Encountered CUDA/CPU tensor error, will retry with a different seed`,
              );
              // Break out of the while loop - the outer function can then retry
              break;
            }
          }

          // If task completed successfully, get the result
          if (taskStatus === 'SUCCEEDED') {
            // Get image URL from results
            taskResult = statusResponse.data.output?.results?.[0]?.url;
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

      // Continue with rest of the existing code for handling the task result
      // Check if we have a valid result
      if (taskStatus === 'SUCCEEDED' && taskResult) {
        // For all models, we now need to download the image from the URL
        try {
          console.log(
            `Task ${taskId} completed successfully. Downloading image from: ${taskResult}`,
          );

          // Add detailed logging about download attempt
          console.log(
            `[IMAGE DOWNLOAD] Attempting to download image from URL: ${taskResult}`,
          );
          console.log(
            `[IMAGE DOWNLOAD] Using axios with responseType: arraybuffer`,
          );

          try {
            const imageResponse = await axios.get(taskResult, {
              responseType: 'arraybuffer',
            });

            // Log download success and response info
            console.log(
              `[IMAGE DOWNLOAD] Download successful. Content type: ${imageResponse.headers['content-type']}`,
            );
            console.log(
              `[IMAGE DOWNLOAD] Response status: ${imageResponse.status}`,
            );
            console.log(
              `[IMAGE DOWNLOAD] Image data size: ${imageResponse.data.byteLength} bytes`,
            );

            // Convert image to base64
            const base64Image = Buffer.from(
              imageResponse.data,
              'binary',
            ).toString('base64');
            console.log(
              `[IMAGE DOWNLOAD] Image for task ${taskId} successfully converted to base64. Length: ${base64Image.length} chars`,
            );
            return {
              imageData: `data:image/png;base64,${base64Image}`,
              model: modelName,
            };
          } catch (error: any) {
            console.error('[IMAGE DOWNLOAD] Error downloading image:', error);
            // Add more detailed error logging
            if (error.response) {
              console.error(
                '[IMAGE DOWNLOAD] Response error data:',
                error.response.data,
              );
              console.error(
                '[IMAGE DOWNLOAD] Response error status:',
                error.response.status,
              );
              console.error(
                '[IMAGE DOWNLOAD] Response error headers:',
                error.response.headers,
              );
            } else if (error.request) {
              console.error(
                '[IMAGE DOWNLOAD] Request error - no response received:',
                error.request,
              );
            } else {
              console.error('[IMAGE DOWNLOAD] Error message:', error.message);
            }
            console.error('[IMAGE DOWNLOAD] Error config:', error.config);

            return getPlaceholderImage(
              'IMAGE_DOWNLOAD_ERROR',
              'Failed to download image',
              modelName,
            );
          }
        } catch (error) {
          console.error('Error downloading image:', error);
          return getPlaceholderImage(
            'IMAGE_DOWNLOAD_ERROR',
            'Failed to download image',
            modelName,
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
              return {
                imageData: `data:image/png;base64,${base64Image}`,
                model: modelName,
              };
            } catch (error) {
              console.error('Error downloading image from URL:', error);
              return getPlaceholderImage(
                'IMAGE_DOWNLOAD_ERROR',
                'Failed to download image',
                modelName,
              );
            }
          }

          console.error('Task succeeded but no image URL found in response');
          return getPlaceholderImage(
            'NO_IMAGE_URL',
            'No image URL found in successful response',
            modelName,
          );
        } catch (error) {
          console.error('Error processing successful response:', error);
          return getPlaceholderImage(
            'PROCESSING_ERROR',
            'Error processing successful response',
            modelName,
          );
        }
      } else if (taskStatus === 'RUNNING' || taskStatus === 'PENDING') {
        // Task is still processing but we've hit our timeout
        console.warn(
          `Model ${modelName} (${modelConfig.type}) is still processing (${taskStatus}) after ${retries} attempts. Maximum retry limit: ${maxRetries}`,
        );
        return getPlaceholderImage(
          'STILL_PROCESSING',
          `The model ${modelName} is still processing the image. This may take longer than expected. Try again later.`,
          modelName,
        );
      } else {
        console.error(
          `Task did not complete within time limit. Final status: ${taskStatus}`,
        );
        return getPlaceholderImage(
          errorCode || 'TIMEOUT_ERROR',
          errorMessage || 'Task did not complete within time limit',
          modelName,
        );
      }
    } catch (error: any) {
      console.error(`Error making API request with model ${modelName}:`, error);

      // Special handling for HTTP status errors
      if (error.response) {
        const status = error.response.status;
        const responseData = error.response.data;

        console.error(
          `HTTP error ${status} for model ${modelName}:`,
          responseData,
        );

        // Special handling for 400 errors with Wanx models
        if (status === 400 && modelName.startsWith('wanx')) {
          return getPlaceholderImage(
            'WANX_MODEL_ERROR',
            'This Wanx model is temporarily unavailable. The server returned a 400 error.',
            modelName,
          );
        }

        // General HTTP error
        return getPlaceholderImage(
          `HTTP_ERROR_${status}`,
          `Server returned HTTP ${status}: ${responseData?.message || 'Unknown error'}`,
          modelName,
        );
      }

      // Network errors or other issues
      return getPlaceholderImage(
        error.code || 'API_REQUEST_ERROR',
        error.message || 'Request failed',
        modelName,
      );
    }
  }

  // For retrying with different seeds on InternalError.Algo
  async function attemptGeneration(): Promise<AliyunImageGenerationResult> {
    try {
      // Determine model to use
      const model = params.model || env.ALIYUN_FLUX_MODEL;

      // Convert dimensions to string format required by the API
      const size = `${params.width || 1024}*${params.height || 1024}`;

      // Prepare request parameters with defaults
      // If this is a retry, use a new random seed
      const seed =
        internalErrorRetryCount > 0
          ? Math.floor(Math.random() * 10000)
          : params.seed || Math.floor(Math.random() * 10000);

      const requestBody = {
        model: model,
        input: {
          prompt: params.prompt,
          negative_prompt: params.negative_prompt || '',
        },
        parameters: {
          size: size,
          seed: seed,
          steps: params.steps || params.num_inference_steps || 20,
        },
      };

      // Add special parameters for Wanx models if needed
      if (model.startsWith('wanx')) {
        // For Wanx models, make sure we're using valid parameters
        // Some Wanx models might need specific parameter configurations
        console.log(`Using Wanx-specific parameters for model: ${model}`);

        // Remove any parameters that might cause issues with Wanx models
        // and add required parameters if needed
        const wanxRequestBody = {
          ...requestBody,
          parameters: {
            ...requestBody.parameters,
            // Specific parameters for Wanx models can be added here
            // Example: n: 1 (number of images, default 1)
          },
        };

        // Use this modified request body
        return await makeAPIRequest(wanxRequestBody, model);
      } else {
        // For non-Wanx models use the default request body
        return await makeAPIRequest(requestBody, model);
      }
    } catch (error: any) {
      console.error('Error in attemptGeneration:', error);

      // Return placeholder for errors
      return getPlaceholderImage(
        error.code || 'API_REQUEST_ERROR',
        error.message || 'Request failed',
        params.model || env.ALIYUN_FLUX_MODEL,
      );
    }
  }

  // Initial attempt
  let result = await attemptGeneration();

  // Retry loop for internal errors
  while (
    internalErrorRetryCount < MAX_INTERNAL_ERROR_RETRIES &&
    result.errorInfo &&
    result.errorInfo.code === 'InternalError.Algo' &&
    result.errorInfo.message.includes(
      'Expected all tensors to be on the same device',
    )
  ) {
    internalErrorRetryCount++;
    console.log(
      `[RETRY] Attempting retry #${internalErrorRetryCount} for InternalError.Algo...`,
    );
    result = await attemptGeneration();
  }

  return result;
}
