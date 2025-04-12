import { NextResponse } from 'next/server';
import { getAvailableDashScopeModels } from '@/lib/ai/providers/aliyun-flux';

export const dynamic = 'force-dynamic'; // Ensure the route is always dynamic

/**
 * GET handler to fetch available image generation models.
 * This runs on the server and can access environment variables.
 */
export async function GET() {
  try {
    const models = getAvailableDashScopeModels();

    // Remove the server-side log for returned models
    // if (process.env.NODE_ENV !== 'production') {
    //   console.log('[API /api/models/image-generation] Returning models:', JSON.stringify(models, null, 2));
    // }

    return NextResponse.json(models);
  } catch (error) {
    console.error(
      '[API /api/models/image-generation] Error fetching models:',
      error,
    );
    return NextResponse.json(
      { error: 'Failed to fetch image generation models' },
      { status: 500 },
    );
  }
}
