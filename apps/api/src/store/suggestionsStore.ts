import type { Suggestion, SuggestionCreateInput } from "@cuelens/shared";
import { randomUUID } from "crypto";

/**
 * In-memory suggestions store
 */
const suggestions = new Map<string, Suggestion>();

/**
 * Create a new suggestion
 */
export function createSuggestion(input: SuggestionCreateInput): Suggestion {
  const now = Date.now();
  const suggestion: Suggestion = {
    id: randomUUID(),
    status: "pending",
    createdAt: now,
    updatedAt: now,
    ...input,
  };

  suggestions.set(suggestion.id, suggestion);
  return suggestion;
}

/**
 * List suggestions, optionally filtered by status
 */
export function listSuggestions(
  status?: Suggestion["status"]
): Suggestion[] {
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
    throw new Error(`Suggestion not found: ${id}`);
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
    throw new Error(`Suggestion not found: ${id}`);
  }

  const updated: Suggestion = {
    ...suggestion,
    status: "rejected",
    updatedAt: Date.now(),
  };

  suggestions.set(id, updated);
  return updated;
}
