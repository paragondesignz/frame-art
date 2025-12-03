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
              text: `You are an expert art director creating prompts for AI image generation. Create a single, vivid, detailed image prompt for a stunning 16:9 widescreen artwork.

Style: ${style}
Subject: ${subject}

Requirements:
- Create a unique, imaginative scene that would look breathtaking on a Samsung Frame TV
- Include specific details: lighting conditions, atmosphere, textures, colors, mood
- Use cinematic composition techniques for the wide 16:9 format
- Make it visually striking and emotionally evocative
- Include quality modifiers like "4K, HDR, masterfully detailed"

Respond with ONLY the image prompt, no explanations or quotes. Keep it under 200 words.`
            }]
          }],
          generationConfig: {
            temperature: 1.0,
            maxOutputTokens: 300,
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
