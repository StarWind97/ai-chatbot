import { NextResponse } from 'next/server';
import { generateAliyunImage } from '@/lib/ai/providers/aliyun';

// Define types
interface GenerateImageRequest {
  prompt: string;
  model: string;
  width?: number;
  height?: number;
  negativePrompt?: string;
}

export async function POST(request: Request) {
  // Directly log the environment variable at the start of the request handler
  if (process.env.NODE_ENV !== 'production') {
    console.log(
      '[DEBUG] Direct check of process.env.ALIYUN_WANX_MODELS in API route:',
      process.env.ALIYUN_WANX_MODELS,
    );
  }

  try {
    // Parse request body
    const data = (await request.json()) as GenerateImageRequest;

    if (!data.prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 },
      );
    }

    if (!data.model) {
      return NextResponse.json({ error: 'Model is required' }, { status: 400 });
    }

    // Log generation attempt in non-production environments
    if (process.env.NODE_ENV !== 'production') {
      // Log the full request body received from the client
      console.log(
        '[DEBUG] Received image generation request body:',
        JSON.stringify(data, null, 2),
      );

      console.log('[DEBUG] Image generation request details:', {
        prompt: data.prompt.substring(0, 50),
        model: data.model,
        width: data.width || 1024,
        height: data.height || 1024,
      });
    }

    // Create a dummy streaming object for the tool
    const dummyStream = {
      update: (update: any) => {
        // This is a simplified streaming handler
        if (process.env.NODE_ENV !== 'production') {
          console.log('[DEBUG] Image generation update:', update?.type);
        }
        return Promise.resolve();
      },
    };

    // Call the image generation function directly
    const result = await generateAliyunImage({
      prompt: data.prompt,
      negative_prompt: data.negativePrompt || '',
      width: data.width || 1024,
      height: data.height || 1024,
      model: data.model,
    });

    // Validate that we have image data
    if (!result || !result.imageData) {
      throw new Error('Failed to generate image: No image data received');
    }

    // Return the image data
    return NextResponse.json({
      imageData: result.imageData,
      success: !result.errorInfo,
      error: result.errorInfo?.message,
    });
  } catch (error) {
    console.error('[ERROR] Image generation API error:', error);

    // Return appropriate error response
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
        success: false,
      },
      { status: 500 },
    );
  }
}
