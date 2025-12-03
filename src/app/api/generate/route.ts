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

    // Build a detailed, comprehensive prompt for high-quality 16:9 artwork
    const subject = userPrompt?.trim() || 'a serene natural landscape with dramatic lighting';

    const detailedPrompt = `Create a stunning 16:9 widescreen artwork in the following style:

ARTISTIC STYLE: ${style}

SUBJECT MATTER: ${subject}

TECHNICAL REQUIREMENTS:
- Aspect ratio: Exactly 16:9 widescreen horizontal format (like a TV screen)
- Resolution: High definition, sharp details throughout
- Composition: Well-balanced, with clear focal points and visual flow across the wide format

QUALITY SPECIFICATIONS:
- Professional gallery-quality artwork suitable for display on a Samsung Frame TV
- Rich color depth with nuanced tonal gradations
- Masterful use of light and shadow to create depth and atmosphere
- Fine textural details that reward close inspection
- Harmonious color palette that creates visual cohesion

ARTISTIC ELEMENTS:
- Strong compositional structure utilizing the wide 16:9 format
- Atmospheric perspective and depth of field where appropriate
- Careful attention to edges, transitions, and the interplay of forms
- A sense of mood and emotional resonance

The final image must be horizontally oriented in exact 16:9 widescreen proportions, museum-quality, and visually captivating when displayed as wall art.`;

    // Use Gemini's image generation model
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: detailedPrompt }],
            },
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
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

    // Extract image from Gemini response
    let imageBase64: string | undefined;

    if (data.candidates && data.candidates[0]?.content?.parts) {
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
