import express, { type Router } from "express";
import { z } from "zod";
import { generateSuggestionsFromTranscript } from "../engine/suggestionEngine.js";
import { createSuggestion } from "../store/suggestionsStore.js";

const router: Router = express.Router();

const TranscriptRequestSchema = z.object({
  transcript: z.string().min(1),
  visionEventId: z.string().optional(),
});

/**
 * POST /transcript
 * Process transcript and generate suggestions
 */
router.post("/", (req, res) => {
  try {
    const body = TranscriptRequestSchema.parse(req.body);
    const context = body.visionEventId ? { visionEventId: body.visionEventId } : undefined;

    const suggestionInputs = generateSuggestionsFromTranscript(
      body.transcript,
      context
    );

    const suggestions = suggestionInputs.map((input) =>
      createSuggestion(input)
    );

    res.json(suggestions);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: "Invalid request" });
    }
  }
});

export default router;
