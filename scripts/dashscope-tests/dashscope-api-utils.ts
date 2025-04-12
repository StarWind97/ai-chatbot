/**
 * DashScope API Utilities
 *
 * Common utilities for testing various DashScope API features.
 * Contains shared types, configuration, and helper functions.
 */

import axios from 'axios';
import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// API configuration
export const API_KEY = process.env.ALIYUN_API_KEY || '';
export const API_BASE_URL =
  process.env.ALIYUN_API_BASE_URL || 'https://dashscope.aliyuncs.com/api/v1';
export const REQUEST_TIMEOUT = Number.parseInt(
  process.env.REQUEST_TIMEOUT || '60000',
);
export const RETRY_COUNT = Number.parseInt(process.env.RETRY_COUNT || '5');
export const LONG_TIMEOUT = 300000; // 5 minutes timeout for Wanx models
export const HIGH_RETRY_COUNT = 15; // Higher retry count for Wanx models

// API endpoints
export const API_ENDPOINT = 'services/aigc/text2image/image-synthesis';

// Common test parameters
export const DEFAULT_PROMPT = 'A cute orange cat sitting on a green sofa';
export const DEFAULT_NEGATIVE_PROMPT =
  'low quality, blurry, deformed, distorted';
export const DEFAULT_SIZE = '1024*1024';
export const DEFAULT_STEPS = 20;

// Utility function for polling delays
export const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Base interface for test results
 */
export interface BaseTestResult {
  success: boolean;
  taskId?: string;
  imageUrl?: string;
  imagePath?: string;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

/**
 * Interface for image generation request parameters
 */
export interface BaseImageGenParams {
  prompt: string;
  negativePrompt?: string;
  size?: string;
  n?: number;
  steps?: number;
}

/**
 * Interface for request body structure
 */
export interface BaseRequestBody {
  model: string;
  input: {
    prompt: string;
    negative_prompt?: string;
  };
  parameters: {
    size?: string;
    steps?: number;
    n?: number;
    [key: string]: any; // For additional model-specific parameters
  };
}

/**
 * Extract error details from Axios error
 */
export function extractErrorDetails(error: unknown): {
  code: string;
  message: string;
  details?: any;
} {
  if (axios.isAxiosError(error)) {
    const axiosError = error;
    const responseData = axiosError.response?.data;

    if (responseData) {
      return {
        code: responseData.code || 'API_REQUEST_ERROR',
        message: responseData.message || axiosError.message,
        details: responseData,
      };
    }

    return {
      code: 'API_REQUEST_ERROR',
      message: axiosError.message,
      details: {
        status: axiosError.response?.status,
        statusText: axiosError.response?.statusText,
      },
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: error instanceof Error ? error.message : String(error),
  };
}

/**
 * Prepare temp directory for image storage without deleting existing images
 */
export function prepareImageTempDir(modelType: string): string {
  // Define the base temp directory
  const tempDir = path.join(
    process.cwd(),
    'scripts',
    'dashscope-tests',
    'reports',
    'temp',
    modelType,
  );

  // Create directory if it doesn't exist, but don't clean existing files
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  return tempDir;
}

/**
 * Test authentication with DashScope API
 * @returns Promise with test result
 */
export async function testAuthentication(
  modelName = 'flux-schnell',
): Promise<BaseTestResult> {
  console.log('Testing authentication with DashScope API...');

  // Validate API key
  if (!API_KEY) {
    console.error('Error: API_KEY is not set in environment variables');
    return {
      success: false,
      error: {
        code: 'NO_API_KEY',
        message: 'API key is not configured in environment variables',
      },
    };
  }

  try {
    // Make a minimal request to test authentication
    const minimalRequestBody = {
      model: modelName,
      input: {
        prompt: 'Test authentication',
      },
      parameters: {},
    };

    // Submit a minimal request to check auth
    const response = await axios.post(
      `${API_BASE_URL}/${API_ENDPOINT}`,
      minimalRequestBody,
      {
        headers: {
          Authorization: `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          'X-DashScope-Async': 'enable',
        },
        timeout: 30000, // Shorter timeout for auth test
      },
    );

    // Check for task ID in response to confirm authentication
    const taskId = response.data.output?.task_id;
    if (!taskId) {
      console.error('Authentication failed: No task ID returned');
      return {
        success: false,
        error: {
          code: 'NO_TASK_ID',
          message: 'Authentication successful but no task ID returned',
          details: response.data,
        },
      };
    }

    console.log('Authentication successful!');
    return {
      success: true,
      taskId,
    };
  } catch (error) {
    // Extract error details from Axios error response
    const errorDetails = extractErrorDetails(error);
    console.error(`Authentication failed: ${errorDetails.message}`);

    return {
      success: false,
      error: errorDetails,
    };
  }
}

/**
 * Ensure reports directory exists
 */
export function ensureReportsDir(): string {
  const reportsDir = path.join(
    process.cwd(),
    'scripts',
    'dashscope-tests',
    'reports',
  );

  if (!fs.existsSync(reportsDir)) {
    fs.mkdirSync(reportsDir, { recursive: true });
  }

  return reportsDir;
}
