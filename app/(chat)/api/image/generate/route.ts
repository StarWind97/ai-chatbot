import { auth } from '@/app/(auth)/auth';
import { NextResponse } from 'next/server';
import { generateAliyunImage } from '@/lib/ai/providers/aliyun';

/**
 * API route for image generation using Aliyun Bailian API
 *
 * This endpoint accepts a POST request with a prompt and optional parameters,
 * and returns the generated image as base64 encoded data.
 */
export async function POST(request: Request) {
  // Check authentication
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Parse request body - wrap in try/catch to handle JSON parsing errors
    let prompt: string;
    let negative_prompt: string;
    let width: number | undefined;
    let height: number | undefined;
    let model: string | undefined;
    try {
      const body = await request.json();
      ({ prompt, negative_prompt, width, height, model } = body);
    } catch (error) {
      console.error('Failed to parse request body:', error);
      return NextResponse.json(
        { error: 'Invalid request body format' },
        { status: 400 },
      );
    }

    // Validate required parameters
    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json(
        { error: 'Prompt is required and must be a string' },
        { status: 400 },
      );
    }

    // Log request (in development only)
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `Image generation request received. Model: ${model || 'default'}, Prompt: ${prompt.substring(0, 30)}...`,
      );
    }

    // Generate image - the function now returns a placeholder instead of throwing errors
    const {
      imageData,
      errorInfo,
      model: usedModel,
    } = await generateAliyunImage({
      prompt,
      negative_prompt,
      width,
      height,
      model,
    });

    // Check if it's a placeholder image (very small base64 string)
    let isPlaceholder = !imageData || imageData.length < 100;

    // Prepare error message based on error info (if available)
    let message = isPlaceholder
      ? 'API authentication failed. Please check your Aliyun API key or contact the administrator. Using placeholder image.'
      : `Image generated successfully using model: ${usedModel || model || 'default'}`;

    // If we have specific error info, provide a more detailed message
    if (errorInfo) {
      if (errorInfo.code === 'InternalError.Algo') {
        message =
          'The Aliyun Bailian API encountered an internal server error. This is not an issue with your API key or settings. Using placeholder image.';
      } else if (errorInfo.code === 'STILL_PROCESSING') {
        message =
          errorInfo.message ||
          `The model ${usedModel || model} is still processing the image. This may take longer than expected. Try again later.`;
        // In this case, we send the error but don't mark it as a placeholder
        isPlaceholder = false;
      } else {
        message = `API error (${errorInfo.code}): ${errorInfo.message}. Using placeholder image.`;
      }
    }

    // Ensure imageData exists, even if it's just a placeholder
    if (!imageData) {
      // Return a red placeholder image if the API failed completely
      const response = {
        imageData:
          'iVBORw0KGgoAAAANSUhEUgAABAAAAAQACAIAAADwf7zUAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAB3RJTUUH5wMHDjgUZRp0TgAAAB1pVFh0Q29tbWVudAAAAAAAQ3JlYXRlZCB3aXRoIEdJTVBkLmUHAAACHklEQVR42u3BAQEAAACCIP+vbkhAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAALgGKgwAAWCn5qkAAAAASUVORK5CYII=',
        isPlaceholder: true,
        message: 'Failed to generate image.',
        model: usedModel || model,
        errorInfo: errorInfo || {
          code: 'API_ERROR',
          message: 'The image generation API failed to return a valid image.',
        },
      };

      return NextResponse.json(response);
    }

    // Remove the "data:image/png;base64," prefix if it exists
    const cleanedImageData = imageData.replace(/^data:image\/\w+;base64,/, '');

    // Return generated image data with appropriate message
    return NextResponse.json({
      imageData: cleanedImageData,
      isPlaceholder,
      message,
      model: usedModel || model,
      errorInfo: errorInfo || undefined,
    });
  } catch (error) {
    console.error('Image generation failed:', error);
    return NextResponse.json(
      {
        error: 'Failed to generate image',
        message:
          'The image generation service encountered an error. Check server logs for details.',
      },
      { status: 500 },
    );
  }
}
