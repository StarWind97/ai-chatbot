import { NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import { auth } from '@/app/(auth)/auth';

/**
 * API endpoint to handle base64 image data uploads
 *
 * This converts base64 data to binary and stores it in Vercel Blob storage
 */
export async function POST(request: Request) {
  try {
    // Verify user is authenticated
    const session = await auth();
    if (!session || !session.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse the request body
    const body = await request.json();

    // Check for required fields
    if (!body.data || !body.name || !body.contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: data, name, contentType' },
        { status: 400 },
      );
    }

    const { data, name, contentType } = body;

    // Log for debugging
    if (process.env.NODE_ENV !== 'production') {
      console.log(
        `[DEBUG] Processing base64 upload: name=${name}, contentType=${contentType}`,
      );
      console.log(`[DEBUG] Base64 data length: ${data.length}`);
    }

    // Extract base64 data (remove data:image/png;base64, prefix if present)
    let base64Data = data;
    if (base64Data.includes('base64,')) {
      base64Data = base64Data.split('base64,')[1];
    }

    // Convert base64 to binary data
    const binaryData = Buffer.from(base64Data, 'base64');

    // Generate a unique filename
    const timestamp = Date.now();
    const filename = `${name.split('.')[0] || 'image'}-${timestamp}.${name.split('.')[1] || 'png'}`;
    const pathname = `images/${session.user.id}/${filename}`;

    // Upload to Vercel Blob storage
    const blob = await put(pathname, binaryData, {
      contentType,
      access: 'public',
    });

    // Return the URL and path information
    return NextResponse.json({
      url: blob.url,
      pathname: pathname,
      contentType: blob.contentType,
    });
  } catch (error) {
    console.error('[ERROR] Failed to process base64 upload:', error);
    return NextResponse.json(
      { error: 'Failed to process image' },
      { status: 500 },
    );
  }
}
