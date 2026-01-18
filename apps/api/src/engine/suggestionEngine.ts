import type { SuggestionCreate } from "@cuelens/shared";
import {
  shouldProcessTrigger,
  wasRepeatedRecently,
  generateTriggerKey,
} from "./triggerHistory.js";
import { listPeople } from "../store/peopleStore.js";

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
 * Common names to recognize (case-insensitive)
 * Includes hardcoded names: michael, keeret, om
 */
const COMMON_NAMES = [
  "michael",
  "keeret",
  "om",
  // Add more common names as needed
  "john",
  "jane",
  "david",
  "sarah",
  "james",
  "emily",
  "robert",
  "lisa",
  "william",
  "mary",
  "richard",
  "patricia",
  "joseph",
  "jennifer",
  "thomas",
  "linda",
  "charles",
  "elizabeth",
  "christopher",
  "barbara",
  "daniel",
  "susan",
  "matthew",
  "jessica",
  "anthony",
  "sarah",
  "mark",
  "karen",
  "donald",
  "nancy",
  "steven",
  "betty",
  "paul",
  "helen",
  "andrew",
  "sandra",
  "joshua",
  "donna",
  "kenneth",
  "carol",
  "kevin",
  "ruth",
  "brian",
  "sharon",
  "george",
  "michelle",
  "edward",
  "laura",
  "ronald",
  "sarah",
  "timothy",
  "kimberly",
  "jason",
  "deborah",
  "jeffrey",
  "dorothy",
  "ryan",
  "lisa",
  "jacob",
  "nancy",
  "gary",
  "karen",
  "nicholas",
  "betty",
  "eric",
  "helen",
  "jonathan",
  "sandra",
  "stephen",
  "donna",
  "larry",
  "carol",
  "justin",
  "michelle",
  "scott",
  "emily",
  "brandon",
  "kimberly",
  "benjamin",
  "deborah",
  "samuel",
  "rachel",
  "frank",
  "cynthia",
  "gregory",
  "maria",
  "raymond",
  "stephanie",
  "alexander",
  "rebecca",
  "patrick",
  "sharon",
  "jack",
  "kathleen",
  "dennis",
  "anna",
  "jerry",
  "pamela",
  "tyler",
  "samantha",
  "aaron",
  "christine",
  "jose",
  "emma",
  "henry",
  "catherine",
  "adam",
  "frances",
  "douglas",
  "virginia",
  "nathan",
  "marie",
  "zachary",
  "janet",
  "kyle",
  "catherine",
  "noah",
  "frances",
  "alan",
  "ann",
  "juan",
  "joyce",
  "wayne",
  "diane",
  "roy",
  "alice",
  "ralph",
  "julie",
  "eugene",
  "heather",
  "louis",
  "teresa",
  "lawrence",
  "doris",
  "nicholas",
  "gloria",
  "christopher",
  "evelyn",
] as const;

/**
 * Extract name candidates using specific patterns
 * Patterns: "hi|hey|hello NAME", "this is NAME", "meet NAME", "my name is NAME", "NAME,"
 * Also checks against COMMON_NAMES list (case-insensitive)
 */
function extractNameCandidates(transcript: string): string[] {
  const candidates: string[] = [];
  const lowerTranscript = transcript.toLowerCase();
  const words = transcript.trim().split(/\s+/);
  const lowerWords = lowerTranscript.trim().split(/\s+/);
  
  // Pattern 1: "hi|hey|hello NAME" - token(s) after greeting (case-insensitive)
  const greetingPattern = /(?:^|\s)(hi|hey|hello)\s+([a-z]+(?:\s+[a-z]+)?)/i;
  const greetingMatch = transcript.match(greetingPattern);
  if (greetingMatch && greetingMatch[2]) {
    const name = greetingMatch[2].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(toTitleCase(name));
    }
  }
  
  // Pattern 2: "this is NAME" - token(s) after "this is" (case-insensitive)
  const thisIsPattern = /this\s+is\s+([a-z]+(?:\s+[a-z]+)?)/i;
  const thisIsMatch = transcript.match(thisIsPattern);
  if (thisIsMatch && thisIsMatch[1]) {
    const name = thisIsMatch[1].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(toTitleCase(name));
    }
  }
  
  // Pattern 3: "meet NAME" - token(s) after "meet" (case-insensitive)
  const meetPattern = /meet\s+([a-z]+(?:\s+[a-z]+)?)/i;
  const meetMatch = transcript.match(meetPattern);
  if (meetMatch && meetMatch[1]) {
    const name = meetMatch[1].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(toTitleCase(name));
    }
  }
  
  // Pattern 4: "my name is NAME" - token(s) after "my name is" (case-insensitive)
  const myNameIsPattern = /my\s+name\s+is\s+([a-z]+(?:\s+[a-z]+)?)/i;
  const myNameIsMatch = transcript.match(myNameIsPattern);
  if (myNameIsMatch && myNameIsMatch[1]) {
    const name = myNameIsMatch[1].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(toTitleCase(name));
    }
  }
  
  // Pattern 5: "NAME," - name followed by comma (position-based extraction)
  // Extract capitalized word(s) before comma
  for (let i = 0; i < words.length - 1; i++) {
    const currentWord = words[i];
    const nextWord = words[i + 1];
    if (!currentWord || !nextWord) continue;
    
    const word = currentWord.replace(/[^\w]/g, '');
    
    // Check if current word is capitalized and next word starts with comma
    if (word.length > 1 && word[0] && word[0] === word[0].toUpperCase() && nextWord && nextWord.startsWith(',')) {
      // Try to get 1-2 tokens before the comma
      let name = word;
      if (i > 0) {
        const prevWordRaw = words[i - 1];
        if (prevWordRaw) {
          const prevWord = prevWordRaw.replace(/[^\w]/g, '');
          if (prevWord.length > 1 && prevWord[0] && prevWord[0] === prevWord[0].toUpperCase()) {
            name = `${prevWord} ${word}`;
          }
        }
      }
      
      const nameParts = name.split(/\s+/);
      if (nameParts.length <= 2) {
        candidates.push(name.trim());
      }
    }
  }
  
  // Pattern 6: Check for common names in transcript (case-insensitive)
  // Look for common names as standalone words (not part of other words)
  for (const commonName of COMMON_NAMES) {
    // Use word boundary regex to match whole words only
    const namePattern = new RegExp(`\\b${commonName}\\b`, 'i');
    if (namePattern.test(transcript)) {
      // Check if it's not already in candidates
      const titleCaseName = toTitleCase(commonName);
      if (!candidates.some(c => c.toLowerCase() === commonName.toLowerCase())) {
        candidates.push(titleCaseName);
      }
    }
  }
  
  // Pattern 7: Look for capitalized words that might be names (after greetings, etc.)
  // This catches names even if they're not in the common names list
  for (let i = 0; i < lowerWords.length - 1; i++) {
    const lowerWord = lowerWords[i];
    if (lowerWord && ['hi', 'hey', 'hello', 'meet', 'call', 'named'].includes(lowerWord)) {
      const nextWord = words[i + 1];
      if (nextWord) {
        const cleanWord = nextWord.replace(/[^\w]/g, '');
        // If it's capitalized and looks like a name (2+ chars, starts with letter)
        if (cleanWord.length >= 2 && 
            cleanWord[0] && 
            cleanWord[0] === cleanWord[0].toUpperCase() &&
            /^[a-z]/i.test(cleanWord)) {
          // Check it's not a relationship keyword
          const lowerClean = cleanWord.toLowerCase();
          if (!(RELATIONSHIP_KEYWORDS as readonly string[]).includes(lowerClean)) {
            candidates.push(cleanWord);
          }
        }
      }
    }
  }
  
  // Pattern 8: "I'm NAME" or "I am NAME"
  const imPattern = /(?:^|\s)(?:i'?m|i\s+am)\s+([a-z]+(?:\s+[a-z]+)?)/i;
  const imMatch = transcript.match(imPattern);
  if (imMatch && imMatch[1]) {
    const name = imMatch[1].trim();
    const nameParts = name.split(/\s+/);
    if (nameParts.length <= 2) {
      candidates.push(toTitleCase(name));
    }
  }
  
  // Remove duplicates and filter out relationship keywords
  const unique = candidates.filter((c, idx, arr) => {
    const lower = c.toLowerCase();
    const isRelationship = (RELATIONSHIP_KEYWORDS as readonly string[]).includes(lower);
    const isUnique = arr.findIndex(item => item.toLowerCase() === lower) === idx;
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
  return /this\s+is\s+[A-Z]/i.test(transcript) || /my\s+name\s+is\s+[A-Z]/i.test(transcript);
}

/**
 * Calculate confidence score using heuristic (MVP-friendly)
 * 
 * MVP CONFIDENCE HEURISTIC:
 * - Base range: 0.75-0.90 (higher than before for MVP demo)
 * - Increases for longer/clearer transcripts
 * - Increases for strong patterns ("this is X", "my name is X", "hi mom", "hi dad")
 * - Decreases for very short or noisy fragments
 * 
 * NOTE: This is a heuristic for MVP demo purposes.
 * OpenAI transcription doesn't provide a native confidence scalar.
 */
function calculateConfidence(
  transcript: string,
  _hasFrame: boolean,
  isGreetingPattern: boolean,
  isNameIntroductionPattern: boolean
): number {
  // Base confidence in MVP range: 0.75-0.90
  let confidence = 0.75;
  
  // Increase for longer transcripts (clearer = more confident)
  const wordCount = transcript.trim().split(/\s+/).length;
  if (wordCount >= 10) {
    confidence += 0.08; // +0.08 for longer transcripts
  } else if (wordCount >= 5) {
    confidence += 0.04; // +0.04 for medium transcripts
  }
  
  // Increase for strong patterns
  if (isGreetingPattern) {
    confidence += 0.05; // +0.05 for greeting patterns ("hi mom", "hi dad")
  }
  
  if (isNameIntroductionPattern) {
    confidence += 0.06; // +0.06 for name introductions ("this is X", "my name is X")
  }
  
  // Increase if repeated recently (pattern confirmation)
  if (wasRepeatedRecently(transcript)) {
    confidence += 0.03; // +0.03 if repeated
  }
  
  // Decrease for very short fragments (likely incomplete/noisy)
  if (wordCount < 3) {
    confidence -= 0.05; // -0.05 for very short fragments
  }
  
  // Clamp to MVP range [0.70, 0.95] (slightly wider than base for edge cases)
  return Math.max(0.70, Math.min(0.95, confidence));
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
  const existingPeople = listPeople(); // Get existing people for duplicate checking
  
  for (const keyword of RELATIONSHIP_KEYWORDS) {
    if (lowerTranscript.includes(keyword.toLowerCase())) {
      const triggerKey = generateTriggerKey("rel", keyword);
      
      // Check cooldown before processing
      if (!shouldProcessTrigger(triggerKey)) {
        continue; // Skip - in cooldown period
      }
      
      // Check for duplicate: if a person with this relationship already exists, skip
      const existingPersonWithRelationship = existingPeople.find(
        (p) => p.relationship?.toLowerCase() === keyword.toLowerCase()
      );
      
      if (existingPersonWithRelationship) {
        // Exact relationship match found - skip to avoid duplicates
        continue;
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
    
    // Check for duplicate: if a person with this name already exists, skip
    const existingPersonWithName = existingPeople.find(
      (p) => p.displayName.toLowerCase() === name.toLowerCase()
    );
    
    if (existingPersonWithName) {
      // Exact name match found - skip to avoid duplicates
      continue;
    }
    
                // Check if uncertain match (same name but different person - would need face comparison)
                // For now, if we have both name and frame, we could flag it, but since we're skipping exact matches,
                // this would only happen if there's ambiguity we can't resolve yet
                const duplicateFlag = false;
                // Future: Add face comparison logic here to set duplicateFlag if uncertain
    
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
        duplicateFlag: duplicateFlag || undefined, // Only include if true
      },
    });
  }

  return results;
}