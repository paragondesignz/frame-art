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

    const promptCraftingRequest = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are a world-class cinematographer and fine art photographer creating a prompt for Imagen 4 AI. Your goal is to create an EXTRAORDINARY, BREATHTAKING image that could hang in a prestigious gallery or win photography awards.

STYLE DIRECTION: ${style}
SUBJECT/THEME: ${subject}

CREATE A DETAILED PROMPT THAT SPECIFIES:

1. EXACT SCENE COMPOSITION - Describe the precise arrangement of elements, foreground/midground/background layers, leading lines, rule of thirds placement

2. LIGHTING MASTERY - Specify exact lighting: golden hour sun rays, volumetric god rays, rim lighting, chiaroscuro, bioluminescence, dramatic shadows, light temperature (warm/cool)

3. ATMOSPHERE & MOOD - Dense atmosphere, fog, mist, dust particles in light beams, weather conditions, time of day, emotional tone

4. TECHNICAL CAMERA DETAILS - Lens type (35mm, 50mm, 85mm portrait, wide angle), aperture for bokeh (f/1.4, f/2.8), depth of field, motion blur, focus point

5. TEXTURE & DETAIL - Intricate surface details, material qualities (wet, reflective, matte, glossy), fabric textures, skin pores, environmental textures

6. COLOR PALETTE - Specific color scheme, complementary colors, color grading (teal and orange, moody blues, warm earth tones)

OUTPUT: Write ONE continuous, vivid prompt. NO explanations. NO quotes. Be SPECIFIC and SENSORY. Make every word count. 150-250 words.`
            }]
          }],
          generationConfig: {
            temperature: 1.2,
            maxOutputTokens: 400,
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
