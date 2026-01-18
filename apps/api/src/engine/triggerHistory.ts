/**
 * Track recent triggers to prevent duplicates within cooldown period
 * Used to implement 45-second cooldown for same trigger (name:X or rel:Y)
 */

interface TriggerEntry {
  key: string; // "name:John" or "rel:mom"
  timestamp: number;
}

const triggerHistory: TriggerEntry[] = [];
const COOLDOWN_MS = 45 * 1000; // 45 seconds

/**
 * Check if a transcript has been seen recently (within last 20 seconds)
 * Used for confidence scoring
 */
const recentTranscripts: Array<{ text: string; timestamp: number }> = [];
const RECENT_WINDOW_MS = 20 * 1000; // 20 seconds

/**
 * Check if trigger should be processed (not in cooldown)
 */
export function shouldProcessTrigger(key: string): boolean {
  const now = Date.now();
  
  // Cleanup old entries
  const recentTriggers = triggerHistory.filter(entry => now - entry.timestamp < COOLDOWN_MS);
  triggerHistory.length = 0;
  triggerHistory.push(...recentTriggers);
  
  // Check if this exact trigger was seen recently
  const existing = triggerHistory.find(entry => entry.key === key);
  if (existing) {
    return false; // In cooldown period
  }
  
  // Record this trigger
  triggerHistory.push({ key, timestamp: now });
  return true;
}

/**
 * Check if transcript was repeated in last 20 seconds (for confidence scoring)
 */
export function wasRepeatedRecently(transcript: string): boolean {
  const now = Date.now();
  
  // Cleanup old transcripts
  const recent = recentTranscripts.filter(entry => now - entry.timestamp < RECENT_WINDOW_MS);
  recentTranscripts.length = 0;
  recentTranscripts.push(...recent);
  
  // Check if similar transcript exists (normalize for comparison)
  const normalized = transcript.toLowerCase().trim();
  const found = recentTranscripts.some(
    entry => entry.text.toLowerCase().trim() === normalized
  );
  
  // Record this transcript
  recentTranscripts.push({ text: transcript, timestamp: now });
  
  return found;
}

/**
 * Generate trigger key for de-duplication
 */
export function generateTriggerKey(type: "name" | "rel", value: string): string {
  return `${type}:${value.toLowerCase()}`;
}
