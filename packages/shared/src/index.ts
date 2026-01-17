/**
 * CueLens Shared Types and Schemas
 *
 * This package contains shared TypeScript types and Zod schemas
 * that are used across the web app and API.
 */

// Placeholder types - to be expanded when implementing features
export type PersonId = string;
export type PlaceId = string;
export type RelationshipId = string;

export interface Person {
  id: PersonId;
  name: string;
  createdAt: Date;
}

export interface Place {
  id: PlaceId;
  name: string;
  createdAt: Date;
}

export interface Relationship {
  id: RelationshipId;
  personId: PersonId;
  relationshipType: string;
  createdAt: Date;
}

// Placeholder Zod schemas - to be expanded when implementing features
import { z } from "zod";

export const PersonSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.date(),
});

export const PlaceSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  createdAt: z.date(),
});

export const RelationshipSchema = z.object({
  id: z.string(),
  personId: z.string(),
  relationshipType: z.string(),
  createdAt: z.date(),
});
