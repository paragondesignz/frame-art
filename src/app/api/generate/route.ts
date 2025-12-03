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

    // Build a stunning prompt following Imagen 4 best practices
    // Structure: Subject + Context + Style + Quality modifiers
    const subject = userPrompt?.trim() || 'majestic mountain peaks reflected in a crystal-clear alpine lake at golden hour';

    // Craft prompt with vivid descriptive language and technical excellence
    const detailedPrompt = `${subject}, ${style}, sweeping widescreen cinematic composition, extraordinary detail and clarity, dramatic volumetric lighting with rich shadows and luminous highlights, deep atmospheric perspective, vibrant yet sophisticated color palette, 4K ultra high definition, photorealistic quality, award-winning professional artwork, masterful execution`;

    // Imagen 4 API
    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify({
          instances: [
            {
              prompt: detailedPrompt,
            },
          ],
          parameters: {
            sampleCount: 1,
            aspectRatio: '16:9',
            personGeneration: 'allow_adult',
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate image', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

    // Extract image from Imagen 4 response
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded
      || data.generated_images?.[0]?.image?.imageBytes;

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
