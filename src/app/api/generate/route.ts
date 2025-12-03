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

    // Step 1: Use Gemini to craft a unique, detailed prompt
    const subject = userPrompt?.trim() || 'a stunning scene perfect for display as wall art';

    // Detect if this is a minimalist/simple style
    const isMinimalist = style.toLowerCase().includes('minimal') ||
                         style.toLowerCase().includes('simple') ||
                         style.toLowerCase().includes('clean');

    const promptInstructions = isMinimalist
      ? `You are creating a prompt for Imagen 4 AI in a MINIMALIST style.

STYLE: ${style}
SUBJECT: ${subject}

MINIMALIST PRINCIPLES - Your prompt MUST emphasize:
- Vast negative space and emptiness
- Single focal point or very few elements
- Clean, uncluttered composition
- Subtle, muted color palette (or monochromatic)
- Geometric simplicity
- Zen-like calm and restraint
- "Less is more" - every element must be essential

DO NOT include: busy backgrounds, multiple subjects, intricate details, complex textures, dust particles, or visual clutter.

OUTPUT: Write a SHORT, restrained prompt (50-80 words max). Simple. Clean. Breathe.`

      : `You are a world-class cinematographer creating a prompt for Imagen 4 AI. Create an EXTRAORDINARY, BREATHTAKING image.

STYLE: ${style}
SUBJECT: ${subject}

SPECIFY:
1. COMPOSITION - Foreground/midground/background, leading lines, rule of thirds
2. LIGHTING - Golden hour, volumetric rays, rim lighting, dramatic shadows, light temperature
3. ATMOSPHERE - Fog, mist, weather, time of day, emotional tone
4. CAMERA - Lens (35mm, 85mm), aperture (f/1.4), depth of field, bokeh
5. TEXTURE - Surface details, material qualities
6. COLOR - Specific palette, color grading

OUTPUT: ONE vivid, continuous prompt. NO explanations. Be SPECIFIC. 150-200 words.`;

    const promptCraftingRequest = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: promptInstructions
            }]
          }],
          generationConfig: {
            temperature: isMinimalist ? 0.7 : 1.2,
            maxOutputTokens: isMinimalist ? 150 : 400,
          },
        }),
      }
    );

    if (!promptCraftingRequest.ok) {
      throw new Error('Failed to craft prompt');
    }

    const promptData = await promptCraftingRequest.json();
    const craftedPrompt = promptData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!craftedPrompt) {
      throw new Error('No prompt generated');
    }

    console.log('Crafted prompt:', craftedPrompt);

    // Step 2: Generate image with Imagen 4
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
              prompt: craftedPrompt,
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
      prompt: craftedPrompt,
    });
  } catch (error) {
    console.error('Generate error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
