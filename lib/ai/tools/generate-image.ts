import { tool } from 'ai';
import { z } from 'zod';
import { generateFluxImage } from '../providers/aliyun-flux';

/**
 * AI tool for generating images using Aliyun DashScope API
 *
 * This tool allows AI models to generate images from text prompts
 * using the Aliyun DashScope Flux-Schnell model.
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
        .min(512)
        .max(1024)
        .optional()
        .describe('Width of the image (between 512 and 1024)'),
      height: z
        .number()
        .min(512)
        .max(1024)
        .optional()
        .describe('Height of the image (between 512 and 1024)'),
    }),
    execute: async ({ prompt, negative_prompt, width, height }) => {
      const { dataStream } = config;

      try {
        // Inform user that image generation has started
        dataStream.update({
          id: 'generate-image-status',
          content: 'Generating image...',
        });

        // Call Aliyun DashScope API to generate the image
        const { imageData, errorInfo } = await generateFluxImage({
          prompt,
          negative_prompt,
          width,
          height,
        });

        // If there was an error, update the status with error information
        if (errorInfo) {
          dataStream.update({
            id: 'generate-image-status',
            content: `Image generation failed: ${errorInfo.code} - ${errorInfo.message}`,
          });
        } else {
          // Update with success status
          dataStream.update({
            id: 'generate-image-status',
            content: 'Image generated successfully!',
          });
        }

        // Return the base64 encoded image data (even if it's a placeholder due to error)
        return {
          imageData,
          success: !errorInfo,
          message: errorInfo
            ? `Failed to generate image: ${errorInfo.message}`
            : 'Image generated successfully',
          errorInfo,
        };
      } catch (error) {
        console.error('Image generation failed:', error);

        // Update with error status
        dataStream.update({
          id: 'generate-image-status',
          content: 'Failed to generate image.',
        });

        return {
          imageData: null,
          success: false,
          message: 'Failed to generate image',
          errorInfo: {
            code: 'TOOL_EXECUTION_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        };
      }
    },
  });
