import { NextRequest, NextResponse } from 'next/server';
import { put } from '@vercel/blob';
import sharp from 'sharp';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const { style, userPrompt, useTealAccent } = await request.json();

    if (!style) {
      return NextResponse.json(
        { error: 'Style is required' },
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

    // Step 1: Use Gemini to craft a unique, detailed prompt
    const subject = userPrompt?.trim() || 'a beautiful and captivating scene';

    const tealAccentInstruction = useTealAccent
      ? `\n\nCOLOR PALETTE REQUIREMENT: The artwork MUST feature a teal accent color palette. Incorporate shades of teal (#008080), cyan, and aqua as prominent accent colors throughout the composition. These teal tones should complement the overall style while adding a sophisticated, modern touch. Use teal strategically in key focal points, highlights, or decorative elements.`
      : '';

    const promptCraftingRequest = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a world-class art director creating an image prompt for Imagen 4 AI. Your goal: create a STUNNING, AWARD-WINNING 16:9 artwork.

ARTISTIC STYLE: ${style}
SUBJECT/THEME: ${subject}

Your prompt must be HIGHLY DETAILED and SPECIFIC to achieve the desired style. Describe:

1. COMPOSITION - Precise placement of elements, use of space (negative space if the style calls for it), visual balance, focal points, depth layers

2. LIGHTING - Exact lighting setup that serves the style (dramatic, soft, harsh, diffused, directional), light source, shadows, highlights, color temperature

3. MOOD & ATMOSPHERE - The emotional quality, environmental conditions, time of day, sense of place

4. STYLE EXECUTION - How specifically to achieve this artistic style. What makes this style distinctive? Capture its essence precisely.

5. COLOR & TONE - Specific palette, saturation levels, contrast, color relationships that define this style

6. TECHNICAL QUALITY - Resolution, clarity, professional finish. "4K, masterfully executed"

CRITICAL: Your prompt must HONOR THE CHOSEN STYLE.

IMPORTANT: The image must be the artwork itself - DO NOT include picture frames, borders, gallery walls, or any framing elements. The image should fill the entire canvas edge-to-edge. If the style is minimalist, describe how to achieve minimalism (negative space, restraint, simplicity). If it's baroque, describe ornate richness. Match your prompt to the style's core principles.

OUTPUT: One detailed, continuous prompt. No explanations. 150-250 words.${tealAccentInstruction}`
            }]
          }],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 400,
          },
        }),
      }
    );

    const promptResponseText = await promptCraftingRequest.text();

    if (!promptCraftingRequest.ok) {
      console.error('Prompt crafting error:', promptResponseText);
      throw new Error(`Failed to craft prompt: ${promptResponseText}`);
    }

    let promptData;
    try {
      promptData = JSON.parse(promptResponseText);
    } catch (parseError) {
      console.error('Failed to parse prompt response. Status:', promptCraftingRequest.status);
      console.error('Response text (first 500 chars):', promptResponseText.substring(0, 500));
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Prompt crafting failed', details: promptResponseText.substring(0, 200) },
        { status: 500 }
      );
    }
    const craftedPrompt = promptData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!craftedPrompt) {
      throw new Error('No prompt generated');
    }

    console.log('Crafted prompt:', craftedPrompt);
    console.log('Starting image generation...');

    // Step 2: Generate image with Gemini 3 Pro Image
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: craftedPrompt,
            }],
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
        { error: 'Failed to generate image', details: responseText },
        { status: response.status }
      );
    }

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('Failed to parse image response. Status:', response.status);
      console.error('Response text (first 500 chars):', responseText.substring(0, 500));
      console.error('Parse error:', parseError);
      return NextResponse.json(
        { error: 'Image generation failed', details: responseText.substring(0, 200) },
        { status: 500 }
      );
    }

    // Extract image from Gemini 3 Pro Image response
    const parts = data.candidates?.[0]?.content?.parts || [];
    const imagePart = parts.find((part: { inlineData?: { data: string } }) => part.inlineData?.data);
    const imageBase64 = imagePart?.inlineData?.data;

    if (!imageBase64) {
      console.error('No image in response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: 'No image generated', details: 'Model did not return an image' },
        { status: 500 }
      );
    }

    // Process image with Sharp
    const imageBuffer = Buffer.from(imageBase64, 'base64');
    const metadata = await sharp(imageBuffer).metadata();
    console.log(`📐 Original image dimensions: ${metadata.width}×${metadata.height} pixels`);

    // Resize to exactly 3840×2160 (4K 16:9)
    const TARGET_WIDTH = 3840;
    const TARGET_HEIGHT = 2160;

    const resizedBuffer = await sharp(imageBuffer)
      .resize(TARGET_WIDTH, TARGET_HEIGHT, {
        fit: 'cover',
        position: 'center',
      })
      .png()
      .toBuffer();

    console.log(`✅ Resized to: ${TARGET_WIDTH}×${TARGET_HEIGHT} pixels (4K)`);
    console.log(`📦 Resized buffer size: ${resizedBuffer.length} bytes`);

    // Save directly to Vercel Blob (avoid round-trip with large base64)
    const id = crypto.randomUUID().slice(0, 8);
    const timestamp = Date.now();
    const safeStyle = (style || 'artwork').replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase();
    const filename = `frame-art/${id}_${safeStyle}_${timestamp}.png`;

    console.log(`💾 Saving to blob storage: ${filename}`);
    const blob = await put(filename, resizedBuffer, {
      access: 'public',
      contentType: 'image/png',
    });
    console.log(`✅ Saved successfully: ${blob.url}`);

    return NextResponse.json({
      image: {
        id,
        url: blob.url,
        prompt: craftedPrompt,
        style: style,
        createdAt: new Date(timestamp).toISOString(),
      },
      prompt: craftedPrompt,
      dimensions: { width: TARGET_WIDTH, height: TARGET_HEIGHT },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('Generate error:', errorMessage);
    console.error('Full error:', error);

    // Provide more specific error messages
    let userMessage = 'Failed to generate image';
    if (errorMessage.includes('Request En')) {
      userMessage = 'Request timed out or was interrupted. Please try again.';
    } else if (errorMessage.includes('rate') || errorMessage.includes('quota')) {
      userMessage = 'API rate limit reached. Please wait a moment and try again.';
    }

    return NextResponse.json(
      { error: userMessage, details: errorMessage },
      { status: 500 }
    );
  }
}
