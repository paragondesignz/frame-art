import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { imageUrl, editInstruction, style } = await request.json();

    if (!imageUrl || !editInstruction) {
      return NextResponse.json(
        { error: 'Image URL and edit instruction are required' },
        { status: 400 }
      );
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key not configured' },
        { status: 500 }
      );
    }

    // Fetch the original image and convert to base64
    console.log('Fetching original image...');
    const imageResponse = await fetch(imageUrl);
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch original image');
    }
    const imageArrayBuffer = await imageResponse.arrayBuffer();
    const imageBase64 = Buffer.from(imageArrayBuffer).toString('base64');

    // Determine mime type
    const contentType = imageResponse.headers.get('content-type') || 'image/png';

    console.log('Sending edit request to Gemini...');
    console.log('Edit instruction:', editInstruction);

    // Send image and edit instruction to Gemini 3 Pro Image
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inlineData: {
                  mimeType: contentType,
                  data: imageBase64,
                },
              },
              {
                text: `Edit this image according to the following instruction. Maintain the same 16:9 aspect ratio and overall composition unless the instruction specifically asks to change it. Keep the artistic quality high and professional.

EDIT INSTRUCTION: ${editInstruction}

IMPORTANT: Output only the edited image. Maintain 4K quality and the same artistic style.`,
              },
            ],
          }],
          generationConfig: {
            responseModalities: ['TEXT', 'IMAGE'],
            imageConfig: {
              aspectRatio: '16:9',
              imageSize: '4K',
            },
          },
        }),
      }
    );

    const responseText = await response.text();

    if (!response.ok) {
      console.error('Gemini API error:', responseText);
      return NextResponse.json(
        { error: 'Failed to edit image', details: responseText },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse response:', responseText.substring(0, 500));
      return NextResponse.json(
        { error: 'Edit failed', details: responseText.substring(0, 200) },
        { status: 500 }
      );
    }

    // Extract edited image from response
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: { inlineData?: { data: string } }) => part.inlineData?.data);
    const editedImageBase64 = imagePart?.inlineData?.data;

    if (!editedImageBase64) {
      // Check if there's a text response explaining why editing failed
      const textPart = parts.find((part: { text?: string }) => part.text);
      const textResponse = textPart?.text || 'Model did not return an edited image';
      console.error('No image in response:', textResponse);
      return NextResponse.json(
        { error: 'Edit failed', details: textResponse },
        { status: 500 }
      );
    }

    // Process edited image with Sharp
    const editedBuffer = Buffer.from(editedImageBase64, 'base64');
    const metadata = await sharp(editedBuffer).metadata();
    console.log(`📐 Edited image dimensions: ${metadata.width}×${metadata.height} pixels`);

    // Resize to exactly 3840×2160 (4K 16:9)
    const TARGET_WIDTH = 3840;
    const TARGET_HEIGHT = 2160;

    const resizedBuffer = await sharp(editedBuffer)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toBuffer();

    console.log(`✅ Resized to: ${TARGET_WIDTH}×${TARGET_HEIGHT} pixels (4K)`);

    // Save to Vercel Blob
    const id = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const safeStyle = (style || 'edited').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const filename = `frame-art/${id}_${safeStyle}_${timestamp}.png`;

    console.log(`💾 Saving edited image: ${filename}`);
    const blob = await put(filename, resizedBuffer, {
      access: 'public',
      contentType: 'image/png',
    });
    console.log(`✅ Saved successfully: ${blob.url}`);

    return NextResponse.json({
      image: {
        id,
        url: blob.url,
        prompt: editInstruction,
        style: style || 'Edited',
        createdAt: new Date(timestamp).toISOString(),
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Edit error:', errorMessage);

    return NextResponse.json(
      { error: 'Failed to edit image', details: errorMessage },
      { status: 500 }
    );
  }
}
