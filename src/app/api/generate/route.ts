import { NextRequest, NextResponse } from 'next/server';

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

6. TECHNICAL QUALITY - Resolution, clarity, professional finish. "4K, masterfully executed, gallery quality"

CRITICAL: Your prompt must HONOR THE CHOSEN STYLE. If the style is minimalist, describe how to achieve minimalism (negative space, restraint, simplicity). If it's baroque, describe ornate richness. Match your prompt to the style's core principles.

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

    if (!promptCraftingRequest.ok) {
      const errorText = await promptCraftingRequest.text();
      console.error('Prompt crafting error:', errorText);
      throw new Error(`Failed to craft prompt: ${errorText}`);
    }

    const promptData = await promptCraftingRequest.json();
    const craftedPrompt = promptData.candidates?.[0]?.content?.parts?.[0]?.text?.trim();

    if (!craftedPrompt) {
      throw new Error('No prompt generated');
    }

    console.log('Crafted prompt:', craftedPrompt);

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

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      return NextResponse.json(
        { error: 'Failed to generate image', details: errorText },
        { status: response.status }
      );
    }

    const data = await response.json();

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
