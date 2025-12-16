import { NextRequest, NextResponse } from 'next/server';
import { put, list, del } from '@vercel/blob';
import { GeneratedImage } from '@/types';

// Disable all caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - List all saved images
export async function GET() {
  try {
    // Fetch all blobs with pagination (default limit is 100)
    let allBlobs: Awaited<ReturnType<typeof list>>['blobs'] = [];
    let cursor: string | undefined;

    do {
      const response = await list({
        prefix: 'frame-art/',
        cursor,
      });
      allBlobs = allBlobs.concat(response.blobs);
      cursor = response.hasMore ? response.cursor : undefined;
    } while (cursor);

    const images: GeneratedImage[] = allBlobs
      .filter(blob => blob.pathname.endsWith('.png'))
      .map(blob => {
        // Extract metadata from pathname: frame-art/{id}_{style}_{timestamp}.png
        const filename = blob.pathname.replace('frame-art/', '').replace('.png', '');
        const parts = filename.split('_');
        const id = parts[0] || blob.pathname;
        const style = parts.slice(1, -1).join('_') || 'Unknown';
        const timestamp = parts[parts.length - 1] || Date.now().toString();

        return {
          id,
          url: blob.url,
          prompt: '',
          style: style.replace(/-/g, ' '),
          createdAt: new Date(parseInt(timestamp) || Date.now()).toISOString(),
        };
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 100); // Return only the 100 most recent images

    return NextResponse.json({ images }, {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'CDN-Cache-Control': 'no-store',
        'Vercel-CDN-Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    console.error('List images error:', error);
    return NextResponse.json(
      { error: 'Failed to list images', images: [] },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      }
    );
  }
}

// POST - Save a new image
export async function POST(request: NextRequest) {
  try {
    const { imageBase64, style, prompt } = await request.json();

    if (!imageBase64) {
      return NextResponse.json(
        { error: 'Image data is required' },
        { status: 400 }
      );
    }

    // Convert base64 to buffer
    const buffer = Buffer.from(imageBase64, 'base64');

    // Generate unique filename
    const id = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const safeStyle = (style || 'artwork').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const filename = `frame-art/${id}_${safeStyle}_${timestamp}.png`;

    // Upload to Vercel Blob
    const blob = await put(filename, buffer, {
      access: 'public',
      contentType: 'image/png',
    });

    const image: GeneratedImage = {
      id,
      url: blob.url,
      prompt: prompt || '',
      style: style || 'Unknown',
      createdAt: new Date(timestamp).toISOString(),
    };

    return NextResponse.json({ image });
  } catch (error) {
    console.error('Save image error:', error);
    return NextResponse.json(
      { error: 'Failed to save image' },
      { status: 500 }
    );
  }
}

// DELETE - Remove an image
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Image ID is required' },
        { status: 400 }
      );
    }

    // List blobs to find the one with matching ID
    const { blobs } = await list({
      prefix: 'frame-art/',
    });

    const blobToDelete = blobs.find(blob => blob.pathname.includes(id));

    if (!blobToDelete) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: 404 }
      );
    }

    await del(blobToDelete.url);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete image error:', error);
    return NextResponse.json(
      { error: 'Failed to delete image' },
      { status: 500 }
    );
  }
}
