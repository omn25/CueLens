import { z } from "zod";

/**
 * Suggestion contract
 * Represents a memory suggestion that can be approved or rejected by a caregiver
 */
export const SuggestionSchema = z.object({
  id: z.string(),
  status: z.enum(["pending", "approved", "rejected"]),
  type: z.enum(["identify_person", "identify_place", "relationship_suggestion"]),
  createdAt: z.number(), // unix timestamp in milliseconds
  updatedAt: z.number(), // unix timestamp in milliseconds
  text: z.string(), // human-readable description
  related: z.object({
    personId: z.string().optional(),
    placeId: z.string().optional(),
    visionEventId: z.string().optional(),
  }),
  proposed: z.object({
    displayName: z.string().optional(),
    relationship: z.string().optional(),
  }),
  evidence: z.object({
    transcriptSnippet: z.string().optional(),
    frameAssetId: z.string().optional(),
    confidence: z.number().optional(),
  }),
});

export type Suggestion = z.infer<typeof SuggestionSchema>;
