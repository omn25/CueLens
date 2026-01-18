import type { Request, Response } from "express";
import { z } from "zod";
import {
  listPeople,
  getPerson,
  createPerson,
  updatePerson,
  upsertPerson,
  deletePerson,
} from "../store/peopleStore.js";

/**
 * GET /people
 * List all people
 */
export function listPeopleHandler(_req: Request, res: Response) {
  const people = listPeople();
  res.json(people);
}

/**
 * GET /people/:id
 * Get a person by ID
 */
export function getPersonHandler(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Person ID is required" });
    return;
  }
  const person = getPerson(id);

  if (!person) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  res.json(person);
}

/**
 * POST /people
 * Create a new person
 */
export function createPersonHandler(req: Request, res: Response) {
  const schema = z.object({
    displayName: z.string().min(1),
    relationship: z.string().optional(),
    notes: z.string().optional(),
    photoAssetId: z.string().optional(),
    embeddingId: z.string().optional(),
    remindersEnabled: z.boolean().optional(),
  }).passthrough(); // Allow additional fields for future extensibility

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: "Invalid request data",
      details: validation.error.errors,
    });
    return;
  }

  const person = createPerson(validation.data);
  res.status(201).json(person);
}

/**
 * POST /people/upsert
 * Create or update a person by displayName
 */
export function upsertPersonHandler(req: Request, res: Response) {
  const schema = z.object({
    displayName: z.string().min(1),
    relationship: z.string().optional(),
    notes: z.string().optional(),
    photoAssetId: z.string().optional(),
    embeddingId: z.string().optional(),
    remindersEnabled: z.boolean().optional(),
  }).passthrough(); // Allow additional fields for future extensibility

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: "Invalid request data",
      details: validation.error.errors,
    });
    return;
  }

  const person = upsertPerson(validation.data);
  res.json(person);
}

/**
 * PATCH /people/:id
 * Update a person
 */
export function updatePersonHandler(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Person ID is required" });
    return;
  }
  const schema = z.object({
    displayName: z.string().min(1).optional(),
    relationship: z.string().optional(),
    notes: z.string().optional(),
    photoAssetId: z.string().optional(),
    embeddingId: z.string().optional(),
    remindersEnabled: z.boolean().optional(),
  });

  const validation = schema.safeParse(req.body);
  if (!validation.success) {
    res.status(400).json({
      error: "Invalid request data",
      details: validation.error.errors,
    });
    return;
  }

  try {
    const person = updatePerson(id, validation.data);
    res.json(person);
  } catch (error) {
    res.status(404).json({
      error: error instanceof Error ? error.message : "Person not found",
    });
  }
}

/**
 * DELETE /people/:id
 * Delete a person
 */
export function deletePersonHandler(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Person ID is required" });
    return;
  }
  const deleted = deletePerson(id);

  if (!deleted) {
    res.status(404).json({ error: "Person not found" });
    return;
  }

  res.json({ success: true });
}
