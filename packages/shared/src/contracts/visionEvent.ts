import { z } from "zod";

/**
 * VisionEvent contract
 * Represents an event detected from vision analysis (camera feed)
 */
export const VisionEventSchema = z.object({
  id: z.string(),
  type: z.enum(["person_candidate", "place_candidate", "scene_hint"]),
  timestamp: z.number(), // unix timestamp in milliseconds
  confidence: z.number().min(0).max(1),
  labels: z.array(z.string()),
  evidence: z.object({
    frameAssetId: z.string().optional(),
    transcriptSnippet: z.string().optional(),
    raw: z.unknown().optional(), // for storing raw provider output if needed
  }),
  source: z.enum(["overshoot", "manual", "other"]),
});

export type VisionEvent = z.infer<typeof VisionEventSchema>;
