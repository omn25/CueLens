import type { SuggestionCreateInput } from "@cuelens/shared";

/**
 * Context for generating suggestions from transcript
 */
export interface TranscriptContext {
  visionEventId?: string;
}

/**
 * Generate suggestions from transcript text
 */
export function generateSuggestionsFromTranscript(
  transcript: string,
  context?: TranscriptContext
): SuggestionCreateInput[] {
  const suggestions: SuggestionCreateInput[] = [];
  const lowerTranscript = transcript.toLowerCase();

  // Relationship detection patterns (case-insensitive)
  const patterns: Array<{
    keyword: string | string[];
    relationship: string;
  }> = [
    { keyword: "mom", relationship: "mom" },
    { keyword: "dad", relationship: "dad" },
    { keyword: ["son", "my son"], relationship: "son" },
    { keyword: ["daughter", "my daughter"], relationship: "daughter" },
    { keyword: "aunt", relationship: "aunt" },
    { keyword: "uncle", relationship: "uncle" },
    { keyword: "brother", relationship: "brother" },
    { keyword: "sister", relationship: "sister" },
  ];

  for (const pattern of patterns) {
    const keywords = Array.isArray(pattern.keyword)
      ? pattern.keyword
      : [pattern.keyword];

    const found = keywords.some((kw) => lowerTranscript.includes(kw.toLowerCase()));

    if (found) {
      suggestions.push({
        type: "relationship_suggestion",
        text: `Possible relationship: this person may be ${pattern.relationship}. Approve?`,
        related: {
          visionEventId: context?.visionEventId,
        },
        proposed: {
          relationship: pattern.relationship,
        },
        evidence: {
          transcriptSnippet: transcript,
        },
      });
    }
  }

  return suggestions;
}
