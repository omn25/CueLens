import type { Suggestion, SuggestionCreate } from "@cuelens/shared";
import { SuggestionSchema } from "@cuelens/shared";
import { randomUUID } from "crypto";

const suggestions = new Map<string, Suggestion>();

/**
 * Create a new suggestion from input data
 */
export function createSuggestion(input: SuggestionCreate): Suggestion {
  const now = Date.now();
  const suggestion: Suggestion = {
    id: randomUUID(),
    status: "pending",
    type: input.type,
    text: input.text,
    related: input.related,
    proposed: input.proposed,
    evidence: input.evidence,
    createdAt: now,
    updatedAt: now,
  };

  // Validate with schema
  const validated = SuggestionSchema.parse(suggestion);
  suggestions.set(validated.id, validated);
  return validated;
}

/**
 * List suggestions, optionally filtered by status
 */
export function listSuggestions(status?: Suggestion["status"]): Suggestion[] {
  const all = Array.from(suggestions.values());
  if (status) {
    return all.filter((s) => s.status === status);
  }
  return all;
}

/**
 * Get a suggestion by ID
 */
export function getSuggestion(id: string): Suggestion | undefined {
  return suggestions.get(id);
}

/**
 * Approve a suggestion
 */
export function approveSuggestion(id: string): Suggestion {
  const suggestion = suggestions.get(id);
  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  const updated: Suggestion = {
    ...suggestion,
    status: "approved",
    updatedAt: Date.now(),
  };

  suggestions.set(id, updated);
  return updated;
}

/**
 * Reject a suggestion
 */
export function rejectSuggestion(id: string): Suggestion {
  const suggestion = suggestions.get(id);
  if (!suggestion) {
    throw new Error("Suggestion not found");
  }

  const updated: Suggestion = {
    ...suggestion,
    status: "rejected",
    updatedAt: Date.now(),
  };

  suggestions.set(id, updated);
  return updated;
}