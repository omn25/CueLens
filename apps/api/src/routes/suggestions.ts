import type { Request, Response } from "express";
import { z } from "zod";
import { SuggestionCreateSchema } from "@cuelens/shared";
import {
  createSuggestion,
  listSuggestions,
  approveSuggestion,
  rejectSuggestion,
  getSuggestion,
} from "../store/suggestionsStore.js";
import { upsertPerson } from "../store/peopleStore.js";

// Helper function to convert string to title case
function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * POST /suggestions
 * Create a new suggestion
 */
export function createSuggestionHandler(req: Request, res: Response) {
  const validation = SuggestionCreateSchema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: "Invalid suggestion data",
      details: validation.error.errors,
    });
    return;
  }

  const suggestion = createSuggestion(validation.data);
  res.status(201).json(suggestion);
}

/**
 * GET /suggestions?status=pending|approved|rejected
 * List suggestions, optionally filtered by status
 */
export function listSuggestionsHandler(req: Request, res: Response) {
  const status = req.query.status as "pending" | "approved" | "rejected" | undefined;
  
  // Validate status if provided
  if (status && !["pending", "approved", "rejected"].includes(status)) {
    res.status(400).json({
      error: "Invalid status. Must be 'pending', 'approved', or 'rejected'",
    });
    return;
  }

  const suggestions = listSuggestions(status);
  res.json(suggestions);
}

const ApproveSuggestionSchema = z.object({
  remindersEnabled: z.boolean().optional(),
  displayName: z.string().optional(), // Allow caregiver to edit name
});

/**
 * POST /suggestions/:id/approve
 * Approve a suggestion
 * For identify_person suggestions, creates/updates the person in the people store
 */
export function approveSuggestionHandler(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Suggestion ID is required" });
    return;
  }
  
  const existing = getSuggestion(id);
  if (!existing) {
    res.status(404).json({ error: "Suggestion not found" });
    return;
  }

  // Validate optional body params
  const bodyValidation = ApproveSuggestionSchema.safeParse(req.body);
  if (!bodyValidation.success) {
    res.status(400).json({
      error: "Invalid request body",
      details: bodyValidation.error.errors,
    });
    return;
  }

  const { remindersEnabled, displayName } = bodyValidation.data || {};

  // Approve the suggestion
  const updated = approveSuggestion(id);

  // If it's an identify_person suggestion, create/update the person
  if (updated.type === "identify_person" && updated.proposed.displayName) {
    const personName = displayName || updated.proposed.displayName;
    if (personName) {
      try {
        const createdPerson = upsertPerson({
          displayName: personName,
          relationship: updated.proposed.relationship,
          photoAssetId: updated.evidence.frameAssetId,
          remindersEnabled: remindersEnabled ?? false,
          notes: `Added via suggestion approval from transcript: "${updated.evidence.transcriptSnippet}"`,
        });
        console.log(`[suggestions] ✅ Created/updated person from identify_person suggestion:`, {
          personId: createdPerson.id,
          displayName: createdPerson.displayName,
          suggestionId: id,
        });
      } catch (error) {
        console.error(`[suggestions] ❌ Error creating person from identify_person suggestion:`, error);
        // Continue even if person creation fails - we still approved the suggestion
      }
    }
  }

  // If it's a relationship_suggestion, create/update the person
  if (updated.type === "relationship_suggestion" && updated.proposed.relationship) {
    // For relationship suggestions, we need a display name - use the relationship as default
    // or allow the caregiver to provide one (could be enhanced in future)
    const personName = displayName || toTitleCase(updated.proposed.relationship);
    if (personName) {
      try {
        const createdPerson = upsertPerson({
          displayName: personName,
          relationship: updated.proposed.relationship,
          photoAssetId: updated.evidence.frameAssetId,
          remindersEnabled: remindersEnabled ?? false,
          notes: `Added via relationship suggestion approval from transcript: "${updated.evidence.transcriptSnippet}"`,
        });
        console.log(`[suggestions] ✅ Created/updated person from relationship_suggestion:`, {
          personId: createdPerson.id,
          displayName: createdPerson.displayName,
          relationship: createdPerson.relationship,
          suggestionId: id,
        });
      } catch (error) {
        console.error(`[suggestions] ❌ Error creating person from relationship_suggestion:`, error);
        // Continue even if person creation fails - we still approved the suggestion
      }
    }
  }

  res.json(updated);
}

/**
 * POST /suggestions/:id/reject
 * Reject a suggestion
 */
export function rejectSuggestionHandler(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Suggestion ID is required" });
    return;
  }
  
  const existing = getSuggestion(id);
  if (!existing) {
    res.status(404).json({ error: "Suggestion not found" });
    return;
  }

  const updated = rejectSuggestion(id);
  res.json(updated);
}