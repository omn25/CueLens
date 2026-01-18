import type { Person } from "@cuelens/shared";
import { PersonSchema } from "@cuelens/shared";
import { randomUUID } from "crypto";

const people = new Map<string, Person>();

/**
 * Create a new person
 */
export function createPerson(input: {
  displayName: string;
  relationship?: string;
  notes?: string;
  photoAssetId?: string;
  embeddingId?: string;
  remindersEnabled?: boolean;
}): Person {
  const now = Date.now();
  const person: Person = {
    id: randomUUID(),
    displayName: input.displayName,
    relationship: input.relationship,
    notes: input.notes,
    photoAssetId: input.photoAssetId,
    embeddingId: input.embeddingId,
    remindersEnabled: input.remindersEnabled,
    createdAt: now,
    updatedAt: now,
  };

  // Validate with schema
  const validated = PersonSchema.parse(person);
  people.set(validated.id, validated);
  return validated;
}

/**
 * Update an existing person or create if not exists
 */
export function upsertPerson(input: {
  displayName: string;
  relationship?: string;
  notes?: string;
  photoAssetId?: string;
  embeddingId?: string;
  remindersEnabled?: boolean;
}): Person {
  // Check if person with same displayName exists
  const existing = Array.from(people.values()).find(
    (p) => p.displayName.toLowerCase() === input.displayName.toLowerCase()
  );

  if (existing) {
    // Update existing person
    const updated: Person = {
      ...existing,
      displayName: input.displayName,
      relationship: input.relationship ?? existing.relationship,
      notes: input.notes ?? existing.notes,
      photoAssetId: input.photoAssetId ?? existing.photoAssetId,
      embeddingId: input.embeddingId ?? existing.embeddingId,
      remindersEnabled: input.remindersEnabled ?? existing.remindersEnabled,
      updatedAt: Date.now(),
    };
    const validated = PersonSchema.parse(updated);
    people.set(existing.id, validated);
    return validated;
  }

  // Create new person
  return createPerson(input);
}

/**
 * List all people
 */
export function listPeople(): Person[] {
  return Array.from(people.values());
}

/**
 * Get a person by ID
 */
export function getPerson(id: string): Person | undefined {
  return people.get(id);
}

/**
 * Get a person by display name (case-insensitive)
 */
export function getPersonByName(displayName: string): Person | undefined {
  return Array.from(people.values()).find(
    (p) => p.displayName.toLowerCase() === displayName.toLowerCase()
  );
}

/**
 * Update a person
 */
export function updatePerson(
  id: string,
  updates: Partial<Omit<Person, "id" | "createdAt">>
): Person {
  const person = people.get(id);
  if (!person) {
    throw new Error("Person not found");
  }

  const updated: Person = {
    ...person,
    ...updates,
    updatedAt: Date.now(),
  };

  const validated = PersonSchema.parse(updated);
  people.set(id, validated);
  return validated;
}

/**
 * Delete a person
 */
export function deletePerson(id: string): boolean {
  return people.delete(id);
}
