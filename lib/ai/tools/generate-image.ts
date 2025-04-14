import { tool } from 'ai';
import { z } from 'zod';
import { generateAliyunImage } from '../providers/aliyun';
import { env } from '@/lib/env';
import { generateUUID } from '@/lib/utils';

/**
 * AI tool for generating images using Aliyun Bailian API
 *
 * This tool allows AI models to generate images from text prompts
 * using Aliyun Bailian image generation models (Flux and Wanx).
 */
export const generateImage = (config: { dataStream: any }) =>
  tool({
    description: 'Generate an image from a text description',
    parameters: z.object({
      prompt: z.string().describe('Text description of the image to generate'),
      negative_prompt: z
        .string()
        .optional()
        .describe('What should not be in the image'),
      width: z
        .number()
        .optional()
        .describe(
          'Width of the image (must match the allowed size combinations)',
        ),
      height: z
        .number()
        .optional()
        .describe(
          'Height of the image (must match the allowed size combinations)',
        ),
      model: z
        .string()
        .optional()
        .describe(
          'Model to use for image generation (e.g. flux-schnell or wanx2.1-t2i-turbo)',
        ),
    }),
    execute: async ({ prompt, negative_prompt, width, height, model }) => {
      const { dataStream } = config;
      const availableSizes = [
        { width: 1024, height: 1024 }, // Default
        { width: 768, height: 1024 },
        { width: 1024, height: 768 },
        { width: 768, height: 512 },
        { width: 512, height: 768 },
        { width: 1024, height: 576 },
        { width: 576, height: 1024 },
        { width: 1280, height: 720 },
        { width: 720, height: 1280 },
        { width: 960, height: 960 },
        { width: 1088, height: 832 },
        { width: 832, height: 1088 },
      ];

      // Use default size if not specified
      const requestWidth = width || 1024;
      const requestHeight = height || 1024;

      // Validate size
      const isValidSize = availableSizes.some(
        (size) => size.width === requestWidth && size.height === requestHeight,
      );

      if (!isValidSize) {
        console.error(
          `[IMAGE GENERATION] Invalid size: ${requestWidth}x${requestHeight}`,
        );
        return {
          imageData: null,
          success: false,
          message: `Invalid image size: ${requestWidth}x${requestHeight}. Please use one of the following sizes: ${availableSizes.map((s) => `${s.width}x${s.height}`).join(', ')}`,
          errorInfo: {
            code: 'INVALID_SIZE',
            message: `Invalid image size: ${requestWidth}x${requestHeight}`,
          },
        };
      }

      // Get all available models for fallback
      const fluxModel = env.ALIYUN_FLUX_MODEL;
      const wanxModels = env.ALIYUN_WANX_MODELS;

      // Create a prioritized list of models to try
      let modelsToTry: string[] = [];

      // If user specified a model, try that first
      if (model) {
        // If user specified "Wanx" (capital W), correct it to the first available wanx model
        if (model === 'Wanx' && wanxModels.length > 0) {
          modelsToTry.push(wanxModels[0]);
          console.log(
            `[IMAGE GENERATION] Corrected model name from "Wanx" to "${wanxModels[0]}"`,
          );
        } else {
          modelsToTry.push(model);
        }
      } else {
        // Default model strategy: try flux first, then wanx models
        modelsToTry.push(fluxModel);
        modelsToTry = modelsToTry.concat(wanxModels);
      }

      // Log the models we'll try
      console.log('[IMAGE GENERATION] Models to try in order:', modelsToTry);

      // Track errors for all models
      const allErrors = [];

      // Try each model in sequence until one works
      for (const modelToTry of modelsToTry) {
        // Log when image generation starts
        console.log('[IMAGE GENERATION] Attempting with model:', modelToTry, {
          prompt,
          negative_prompt,
          width: requestWidth,
          height: requestHeight,
        });

        try {
          // Instead of using dataStream.update, just log status
          console.log(
            `[IMAGE GENERATION] Status: Generating image with ${modelToTry}...`,
          );

          // Call Aliyun Bailian API to generate the image
          console.log('[IMAGE GENERATION] Calling Aliyun Bailian API');
          const { imageData, errorInfo } = await generateAliyunImage({
            prompt,
            negative_prompt,
            width: requestWidth,
            height: requestHeight,
            model: modelToTry,
          });

          // If successful, return a modified result
          if (!errorInfo) {
            console.log(
              `[IMAGE GENERATION] Successfully generated image with model: ${modelToTry}`,
            );

            // Generate a unique ID for this image
            const imageId = generateUUID();

            // Extract a preview (first 100 chars) of the image data to include in the response
            let previewData = null;
            if (imageData && typeof imageData === 'string') {
              // Get first 100 chars of data for preview/debugging
              const previewLength = 100;
              previewData = `${imageData.substring(0, previewLength)}...`;
              console.log(
                `[IMAGE GENERATION] Image data starts with: ${previewData}`,
              );
            }

            console.log(
              `[IMAGE GENERATION] Status: Image generated successfully!`,
            );

            // Save the full image data to a separate storage/global variable if needed
            // This could be implemented with a more permanent storage solution
            // For now, we'll just return a smaller version of the image data

            // Create a lightweight response object to avoid token size issues
            // We truncate the actual image data to avoid sending the full base64 string
            return {
              imageData: imageData.substring(0, 100000), // Truncate to first 100K chars to stay under token limits
              success: true,
              message: 'Image generated successfully',
              model: modelToTry,
              imageId: imageId,
            };
          }

          // If error, log and store it, then try next model
          console.error(
            `[IMAGE GENERATION] Failed with model ${modelToTry}, error:`,
            errorInfo,
          );
          console.log(
            `[IMAGE GENERATION] Status: Image generation failed with ${modelToTry}: ${errorInfo.code} - ${errorInfo.message}`,
          );

          allErrors.push({
            model: modelToTry,
            error: errorInfo,
          });

          // If this isn't the last model, continue to the next one
          if (modelToTry !== modelsToTry[modelsToTry.length - 1]) {
            console.log(`[IMAGE GENERATION] Trying next model...`);
            continue;
          }
        } catch (error) {
          console.error(
            `[IMAGE GENERATION] Critical error with model ${modelToTry}:`,
            error,
          );

          // Log detailed error information
          if (error instanceof Error) {
            console.error('[IMAGE GENERATION] Error name:', error.name);
            console.error('[IMAGE GENERATION] Error message:', error.message);
            console.error('[IMAGE GENERATION] Error stack:', error.stack);
          }

          allErrors.push({
            model: modelToTry,
            error: {
              code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
              message: error instanceof Error ? error.message : 'Unknown error',
            },
          });

          // If this isn't the last model, continue to the next one
          if (modelToTry !== modelsToTry[modelsToTry.length - 1]) {
            console.log(`[IMAGE GENERATION] Trying next model...`);
            continue;
          }
        }
      }

      // If we get here, all models failed
      console.log(
        '[IMAGE GENERATION] Status: All models failed to generate image.',
      );

      // Check if we have the tensor device error
      const hasTensorError = allErrors.some(
        (e) =>
          e.error.code === 'InternalError.Algo' &&
          e.error.message.includes(
            'Expected all tensors to be on the same device',
          ),
      );

      // Create appropriate error message
      let errorMessage = 'Failed to generate image with all available models.';
      let errorCode = 'ALL_MODELS_FAILED';

      if (hasTensorError) {
        errorMessage =
          'The image generation service is currently experiencing technical issues with its AI models. This is a server-side problem, not an issue with your prompt. Please try again later or try a different prompt.';
        errorCode = 'SERVER_MODEL_ERROR';
      }

      return {
        imageData: null,
        success: false,
        message: errorMessage,
        errorInfo: {
          code: errorCode,
          message: errorMessage,
          allErrors: allErrors,
        },
      };
    },
  });
