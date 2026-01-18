// Output schema for Overshoot to ensure strict JSON output
export const ROOM_OBSERVATION_OUTPUT_SCHEMA = {
  type: 'object',
  properties: {
    room_type: {
      type: 'string',
      enum: ['bedroom', 'living_room', 'bathroom', 'kitchen', 'office', 'hallway', 'unknown'],
    },
    fixed_elements: {
      type: 'object',
      properties: {
        major_furniture: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              count: { type: 'number' },
              attributes: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['name', 'count', 'attributes'],
          },
        },
        surfaces: {
          type: 'object',
          properties: {
            floor: {
              type: 'object',
              properties: {
                material: { type: 'string' },
                color: { type: 'string' },
                pattern: { type: 'string' },
              },
              required: ['material', 'color', 'pattern'],
            },
            walls: {
              type: 'object',
              properties: {
                color: { type: 'string' },
                pattern: { type: 'string' },
              },
              required: ['color', 'pattern'],
            },
            ceiling: {
              type: 'object',
              properties: {
                color: { type: 'string' },
              },
              required: ['color'],
            },
          },
          required: ['floor', 'walls', 'ceiling'],
        },
        lighting: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              type: { type: 'string' },
              count: { type: 'number' },
              attributes: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['type', 'count', 'attributes'],
          },
        },
        large_decor: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              attributes: {
                type: 'array',
                items: { type: 'string' },
              },
            },
            required: ['name', 'attributes'],
          },
        },
      },
      required: ['major_furniture', 'surfaces', 'lighting', 'large_decor'],
    },
    distinctive_markers: {
      type: 'array',
      items: { type: 'string' },
    },
    summary: { type: 'string' },
  },
  required: ['room_type', 'fixed_elements', 'distinctive_markers', 'summary'],
};

export const ROOM_OBSERVATION_PROMPT = `You are extracting a room fingerprint for recognition. Only include FIXED or semi-fixed items: floors, walls, ceiling, major furniture, built-ins, large decor, and lighting fixtures. Ignore temporary items: people, faces, phones, laptops, cups, clothing piles, pets. Prefer stable, consistent labels; keep attributes short; colors should be basic words (e.g. "blue", "wood", "white"). Provide counts when possible. Return ONLY valid JSON matching this exact schema:

{
  "room_type": "bedroom" | "living_room" | "bathroom" | "kitchen" | "office" | "hallway" | "unknown",
  "fixed_elements": {
    "major_furniture": [{"name": string, "count": number, "attributes": string[]}],
    "surfaces": {
      "floor": {"material": string, "color": string, "pattern": string},
      "walls": {"color": string, "pattern": string},
      "ceiling": {"color": string}
    },
    "lighting": [{"type": string, "count": number, "attributes": string[]}],
    "large_decor": [{"name": string, "attributes": string[]}]
  },
  "distinctive_markers": string[],
  "summary": string
}

Do not include any text before or after the JSON. Return only the JSON object.`;
