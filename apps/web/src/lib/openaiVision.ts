import type { RoomObservation } from '@/types/room';
import { ROOM_OBSERVATION_PROMPT, ROOM_OBSERVATION_OUTPUT_SCHEMA } from './roomSchema';

/**
 * Analyze an image using OpenAI Vision API
 * @param imageBase64 Base64 encoded image (data URL or base64 string)
 * @param apiKey OpenAI API key
 * @returns RoomObservation JSON
 */
export async function analyzeFrameWithOpenAI(
  imageBase64: string,
  apiKey: string
): Promise<RoomObservation> {
  // Remove data URL prefix if present
  const base64Data = imageBase64.includes(',') 
    ? imageBase64.split(',')[1] 
    : imageBase64;

  const systemPrompt = `You are analyzing a room image. Extract a detailed room fingerprint for recognition.
Your task is to describe ALL fixed and permanent features of the room in detail.

IMPORTANT RULES:
1. Only include FIXED or semi-fixed items: floors, walls, ceiling, major furniture, built-ins, large decor, and lighting fixtures.
2. Ignore temporary items: people, faces, phones, laptops, cups, clothing piles, pets.
3. Prefer stable, consistent labels; keep attributes short; colors should be basic words (e.g. "blue", "wood", "white").
4. Provide counts when possible.
5. Be very detailed - describe as many features as you can see (aim for 80-100 distinct terms/features).
6. Return ONLY valid JSON matching this exact schema - no markdown, no explanation, just pure JSON:

${JSON.stringify(ROOM_OBSERVATION_OUTPUT_SCHEMA, null, 2)}`;

  const userPrompt = `${ROOM_OBSERVATION_PROMPT}

Analyze this room image in detail. Describe ALL permanent features you can see including:
- Room type
- All major furniture (name, count, color, material, attributes)
- Floor material, color, pattern
- Wall color and pattern
- Ceiling color
- All lighting fixtures (type, count, attributes)
- Large decorative items (name, attributes)
- Distinctive markers (unique features, architectural details, etc.)

Return the complete JSON object matching the schema above. Be thorough and detailed - include 80-100 terms/features if possible.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: userPrompt,
              },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${base64Data}`,
                  detail: 'high', // Use high detail for better analysis
                },
              },
            ],
          },
        ],
        response_format: { type: 'json_object' }, // Force JSON response
        max_tokens: 4000, // Increased for more detailed responses
        temperature: 0.3, // Lower temperature for more consistent, factual output
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `OpenAI API error: ${response.status} ${response.statusText}. ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      throw new Error('Invalid response format from OpenAI API');
    }

    const content = data.choices[0].message.content;
    console.log('[OpenAI Vision] Raw response content length:', content.length);
    console.log('[OpenAI Vision] Raw response preview:', content.substring(0, 200));
    
    // Parse JSON response
    let jsonString = content.trim();
    
    // Try to extract JSON if wrapped in markdown code blocks
    const jsonMatch = jsonString.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                      jsonString.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonString = jsonMatch[1] || jsonMatch[0];
    }
    
    console.log('[OpenAI Vision] Extracted JSON string length:', jsonString.length);
    
    let json: RoomObservation;
    try {
      json = JSON.parse(jsonString) as RoomObservation;
    } catch (parseError) {
      console.error('[OpenAI Vision] JSON parse error:', parseError);
      console.error('[OpenAI Vision] JSON string that failed to parse:', jsonString.substring(0, 500));
      throw new Error(`Failed to parse JSON from OpenAI response: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`);
    }
    
    console.log('[OpenAI Vision] Parsed JSON structure:', {
      hasRoomType: !!json.room_type,
      hasFixedElements: !!json.fixed_elements,
      hasDistinctiveMarkers: !!json.distinctive_markers,
      hasSummary: !!json.summary,
      furnitureCount: json.fixed_elements?.major_furniture?.length || 0,
      markersCount: json.distinctive_markers?.length || 0,
    });
    
    // Validate required fields
    if (!json.room_type || !json.fixed_elements || !json.distinctive_markers || !json.summary) {
      console.error('[OpenAI Vision] Missing required fields:', {
        room_type: !!json.room_type,
        fixed_elements: !!json.fixed_elements,
        distinctive_markers: !!json.distinctive_markers,
        summary: !!json.summary,
        fullJson: json,
      });
      throw new Error('Invalid observation structure: missing required fields');
    }
    
    console.log('[OpenAI Vision] ✅ Successfully parsed and validated JSON');
    return json;
  } catch (error) {
    console.error('[OpenAI Vision] Error analyzing frame:', error);
    throw error instanceof Error 
      ? error 
      : new Error('Failed to analyze frame with OpenAI');
  }
}
