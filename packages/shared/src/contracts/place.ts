import { z } from "zod";

/**
 * Place contract
 * Represents a place in the memory aid system
 */
export const PlaceSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  notes: z.string().optional(),
  photoAssetId: z.string().optional(),
  embeddingId: z.string().optional(),
  createdAt: z.number(), // unix timestamp in milliseconds
  updatedAt: z.number(), // unix timestamp in milliseconds
});

export type Place = z.infer<typeof PlaceSchema>;
