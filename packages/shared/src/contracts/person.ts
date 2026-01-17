import { z } from "zod";

/**
 * Person contract
 * Represents a person in the memory aid system
 */
export const PersonSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  relationship: z.string().optional(),
  notes: z.string().optional(),
  photoAssetId: z.string().optional(),
  embeddingId: z.string().optional(),
  createdAt: z.number(), // unix timestamp in milliseconds
  updatedAt: z.number(), // unix timestamp in milliseconds
});

export type Person = z.infer<typeof PersonSchema>;
