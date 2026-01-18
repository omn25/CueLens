import type { Request, Response } from "express";
import { z } from "zod";
import { randomUUID } from "crypto";

// In-memory frame storage (base64 images)
const frames = new Map<string, string>();

const FrameUploadSchema = z.object({
  image: z.string(), // base64 image
});

/**
 * POST /frames
 * Upload a frame image (base64) and get a frameAssetId
 */
export function uploadFrameHandler(req: Request, res: Response) {
  const validation = FrameUploadSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: "Invalid request data",
      details: validation.error.errors,
    });
    return;
  }

  const { image } = validation.data;

  // Generate frame asset ID
  const frameAssetId = randomUUID();

  // Store base64 image in memory
  frames.set(frameAssetId, image);

  res.json({ frameAssetId });
}

/**
 * GET /frames/:id
 * Retrieve a frame by frameAssetId
 */
export function getFrameHandler(req: Request, res: Response) {
  const { id } = req.params;

  if (!id) {
    res.status(400).json({ error: "Frame ID is required" });
    return;
  }

  const frame = frames.get(id);
  if (!frame) {
    res.status(404).json({ error: "Frame not found" });
    return;
  }

  // Return base64 image
  res.json({ frameAssetId: id, image: frame });
}
