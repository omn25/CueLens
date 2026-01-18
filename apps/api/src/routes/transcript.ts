import type { Request, Response } from "express";
import { z } from "zod";
import { generateSuggestionsFromTranscript } from "../engine/suggestionEngine.js";
import { createSuggestion } from "../store/suggestionsStore.js";

const TranscriptRequestSchema = z.object({
  transcript: z.string(),
  visionEventId: z.string().optional(),
  frameAssetId: z.string().optional(),
});

/**
 * POST /transcript
 * Process a transcript and generate suggestions
 */
export function transcriptHandler(req: Request, res: Response) {
  console.log('📥 POST /transcript received:', {
    transcript: req.body.transcript?.substring(0, 50) + '...',
    hasVisionEventId: !!req.body.visionEventId,
    hasFrameAssetId: !!req.body.frameAssetId,
  });

  const validation = TranscriptRequestSchema.safeParse(req.body);
  if (!validation.success) {
    console.error('❌ Invalid transcript request:', validation.error.errors);
    res.status(400).json({
      error: "Invalid request data",
      details: validation.error.errors,
    });
    return;
  }

  const { transcript, visionEventId, frameAssetId } = validation.data;

  console.log('🔍 Processing transcript:', transcript);

  // Generate suggestions from transcript
  const suggestionInputs = generateSuggestionsFromTranscript(transcript, {
    visionEventId,
    frameAssetId,
  });

  console.log(`💡 Generated ${suggestionInputs.length} suggestion(s) from transcript`);

  // Create all suggestions in the store
  const created = suggestionInputs.map((input) => createSuggestion(input));

  console.log('✅ Created suggestions:', created.map(s => ({ id: s.id, type: s.type, text: s.text.substring(0, 50) })));

  res.json(created);
}