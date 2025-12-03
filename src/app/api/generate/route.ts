import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { style, userPrompt } = await request.json();

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

    // Build a vivid, cinematic prompt for stunning artwork
    const subject = userPrompt?.trim() || 'a breathtaking natural landscape at golden hour';

    // Craft an evocative, detailed prompt that inspires stunning imagery
    const detailedPrompt = `${style}

Scene: ${subject}

Render this as a breathtaking, museum-quality artwork with extraordinary attention to detail.
The composition should be cinematic and sweeping, making full use of the wide frame.
Include rich atmospheric depth, dramatic interplay of light and shadow, and vivid yet harmonious colors.
Every element should feel intentional and masterfully executed, worthy of display in a prestigious gallery.
The mood should be captivating and emotionally resonant, drawing the viewer into the scene.`;

    // Try Imagen 4 first, fallback to Gemini if it fails
    let response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances: [{ prompt: detailedPrompt }],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            personGeneration: 'allow_adult',
          },
        }),
      }
    );

    // If Imagen 4 fails, try Gemini 2.0 Flash
    if (!response.ok) {
      console.log('Imagen 4 failed, trying Gemini 2.0 Flash...');
      response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: `Generate a 16:9 widescreen image: ${detailedPrompt}` }],
              },
            ],
            generationConfig: {
              responseModalities: ['IMAGE', 'TEXT'],
            },
          }),
        }
      );
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate image', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract image from response (handle both Imagen 4 and Gemini formats)
    let imageBase64: string | undefined;

    // Imagen 4 format: generated_images[0].image.imageBytes
    if (data.generated_images && data.generated_images[0]?.image?.imageBytes) {
      imageBase64 = data.generated_images[0].image.imageBytes;
    }
    // Gemini format: candidates[0].content.parts[].inlineData.data
    else if (data.candidates && data.candidates[0]?.content?.parts) {
      for (const part of data.candidates[0].content.parts) {
        if (part.inlineData?.data) {
          imageBase64 = part.inlineData.data;
          break;
        }
      }
    }

    if (!imageBase64) {
      console.error('No image in response:', JSON.stringify(data, null, 2));
      return NextResponse.json(
        { error: 'No image generated', details: 'Model did not return an image' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      imageBase64,
      prompt: `${style} - ${subject}`,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
