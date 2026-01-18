import type { SuggestionCreate } from "@cuelens/shared";
import {
  shouldProcessTrigger,
  wasRepeatedRecently,
  generateTriggerKey,
} from "./triggerHistory.js";

/**
 * Relationship keywords to detect in transcripts
 */
const RELATIONSHIP_KEYWORDS = [
  "mom",
  "dad",
  "son",
  "daughter",
  "aunt",
  "uncle",
  "brother",
  "sister",
  "grandma",
  "grandpa",
] as const;

/**
 * Extract name candidates using specific patterns
 * Patterns: "hi|hey|hello NAME", "this is NAME", "meet NAME", "my name is NAME", "NAME,"
 */
function extractNameCandidates(transcript: string): string[] {
  const candidates: string[] = [];
  const lowerTranscript = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/);
  const lowerWords = lowerTranscript.trim().split(/\s+/);
  
  // Pattern 1: "hi|hey|hello NAME" - token(s) after greeting
  const greetingPattern = /^(hi|hey|hello)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const greetingMatch = transcript.match(greetingPattern);
  if (greetingMatch && greetingMatch[2]) {
    const name = greetingMatch[2].trim();
    // Allow 1-2 tokens (first + last)
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(name);
    }
  }
  
  // Pattern 2: "this is NAME" - token(s) after "this is"
  const thisIsPattern = /this\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const thisIsMatch = transcript.match(thisIsPattern);
  if (thisIsMatch && thisIsMatch[1]) {
    const name = thisIsMatch[1].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(name);
    }
  }
  
  // Pattern 3: "meet NAME" - token(s) after "meet"
  const meetPattern = /meet\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const meetMatch = transcript.match(meetPattern);
  if (meetMatch && meetMatch[1]) {
    const name = meetMatch[1].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(name);
    }
  }
  
  // Pattern 4: "my name is NAME" - token(s) after "my name is"
  const myNameIsPattern = /my\s+name\s+is\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i;
  const myNameIsMatch = transcript.match(myNameIsPattern);
  if (myNameIsMatch && myNameIsMatch[1]) {
    const name = myNameIsMatch[1].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(name);
    }
  }
  
  // Pattern 5: "NAME," - name followed by comma (position-based extraction)
  // Extract capitalized word(s) before comma
  for (let i = 0; i < words.length - 1; i++) {
    const word = words[i].replace(/[^\w]/g, '');
    const nextWord = words[i + 1];
    
    // Check if current word is capitalized and next word starts with comma
    if (word.length > 1 && word[0] === word[0].toUpperCase() && nextWord.startsWith(',')) {
      // Try to get 1-2 tokens before the comma
      let name = word;
      if (i > 0) {
        const prevWord = words[i - 1].replace(/[^\w]/g, '');
        if (prevWord.length > 1 && prevWord[0] === prevWord[0].toUpperCase()) {
          name = `${prevWord} ${word}`;
        }
      }
      
      const nameParts = name.split(/\s+/);
      if (nameParts.length <= 2) {
        candidates.push(name.trim());
      }
    }
  }
  
  // Fallback: if no patterns matched but we have capitalized words, extract by position after common phrases
  if (candidates.length === 0) {
    // Look for capitalized word after "hi", "hey", "hello"
    for (let i = 0; i < lowerWords.length - 1; i++) {
      if (['hi', 'hey', 'hello'].includes(lowerWords[i])) {
        const nextWord = words[i + 1];
        if (nextWord && nextWord[0] === nextWord[0].toUpperCase()) {
          const name = nextWord.replace(/[^\w]/g, '');
          if (name.length > 1) {
            candidates.push(name);
          }
        }
      }
    }
  }
  
  // Remove duplicates and filter out relationship keywords
  const unique = candidates.filter((c, idx, arr) => {
    const lower = c.toLowerCase();
    const isRelationship = RELATIONSHIP_KEYWORDS.includes(lower as any);
    const isUnique = arr.indexOf(c) === idx;
    return !isRelationship && isUnique;
  });
  
  return unique;
}

/**
 * Check if transcript contains greeting pattern
 */
function hasGreetingPattern(transcript: string): boolean {
  const lower = transcript.toLowerCase();
  return /^(hi|hey|hello)\s+/i.test(lower.trim());
}

/**
 * Check if transcript contains "this is NAME" or "my name is NAME"
 */
function hasNameIntroductionPattern(transcript: string): boolean {
  const lower = transcript.toLowerCase();
  return /this\s+is\s+[A-Z]/i.test(transcript) || /my\s+name\s+is\s+[A-Z]/i.test(transcript);
}

/**
 * Calculate confidence score based on new heuristic rules
 */
function calculateConfidence(
  transcript: string,
  hasFrame: boolean,
  isGreetingPattern: boolean,
  isNameIntroductionPattern: boolean
): number {
  let confidence = 0.55; // Base confidence
  
  if (isGreetingPattern) {
    confidence += 0.15; // +0.15 if greeting pattern
  }
  
  if (isNameIntroductionPattern) {
    confidence += 0.10; // +0.10 if "this is NAME" / "my name is NAME"
  }
  
  if (wasRepeatedRecently(transcript)) {
    confidence += 0.10; // +0.10 if repeated in last 20s window
  }
  
  // Clamp to [0.35, 0.95]
  return Math.max(0.35, Math.min(0.95, confidence));
}

/**
 * Convert a word to Title Case
 */
function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

/**
 * Generate suggestions from a transcript
 * IMPORTANT: Only processes FINAL transcript segments (caller must filter out partials)
 * This function should only be called with complete, final transcript chunks
 */
export function generateSuggestionsFromTranscript(
  transcript: string,
  ctx?: { visionEventId?: string; frameAssetId?: string }
): SuggestionCreate[] {
  const results: SuggestionCreate[] = [];
  const lowerTranscript = transcript.toLowerCase();
  const hasFrame = !!ctx?.frameAssetId;
  const isGreetingPatternMatch = hasGreetingPattern(transcript);
  const isNameIntroductionPatternMatch = hasNameIntroductionPattern(transcript);

  // Detect relationship keywords with de-dupe/cooldown
  for (const keyword of RELATIONSHIP_KEYWORDS) {
    if (lowerTranscript.includes(keyword.toLowerCase())) {
      const triggerKey = generateTriggerKey("rel", keyword);
      
      // Check cooldown before processing
      if (!shouldProcessTrigger(triggerKey)) {
        continue; // Skip - in cooldown period
      }
      
      const confidence = calculateConfidence(
        transcript,
        hasFrame,
        isGreetingPatternMatch,
        isNameIntroductionPatternMatch
      );
      
      results.push({
        type: "relationship_suggestion",
        text: `Possible relationship: this person may be ${toTitleCase(keyword)}. Approve?`,
        related: {
          visionEventId: ctx?.visionEventId,
        },
        proposed: {
          relationship: keyword,
        },
        evidence: {
          transcriptSnippet: transcript,
          frameAssetId: ctx?.frameAssetId,
          confidence,
        },
      });
    }
  }

  // Detect name candidates with de-dupe/cooldown
  const nameCandidates = extractNameCandidates(transcript);
  for (const name of nameCandidates) {
    const triggerKey = generateTriggerKey("name", name);
    
    // Check cooldown before processing
    if (!shouldProcessTrigger(triggerKey)) {
      continue; // Skip - in cooldown period
    }
    
    const confidence = calculateConfidence(
      transcript,
      hasFrame,
      isGreetingPatternMatch,
      isNameIntroductionPatternMatch
    );
    
    results.push({
      type: "identify_person",
      text: `Possible person: "${name}". Approve to add as a person?`,
      related: {
        visionEventId: ctx?.visionEventId,
      },
      proposed: {
        displayName: name,
      },
      evidence: {
        transcriptSnippet: transcript,
        frameAssetId: ctx?.frameAssetId,
        confidence,
      },
    });
  }

  return results;
}