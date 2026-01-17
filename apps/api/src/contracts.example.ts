/**
 * Example: Using shared contracts for validation
 *
 * This file demonstrates how to use contracts from @cuelens/shared
 * to validate data at API boundaries. This is NOT used in runtime routes,
 * it's just a reference example.
 */

import { PersonSchema, type Person } from "@cuelens/shared";

// Example: Validate incoming person data
export function validatePersonExample(incomingData: unknown): Person {
  // Using safeParse for error handling
  const result = PersonSchema.safeParse(incomingData);

  if (!result.success) {
    throw new Error(`Invalid person data: ${result.error.message}`);
  }

  return result.data; // Typed as Person
}

// Example: Validate a sample object
const samplePersonData = {
  id: "person-123",
  displayName: "John Doe",
  relationship: "friend",
  createdAt: Date.now(),
  updatedAt: Date.now(),
};

// This would be called during API route validation in the future
const validatedPerson = validatePersonExample(samplePersonData);
console.log("Validated person:", validatedPerson.displayName);
