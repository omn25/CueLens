import express, { type Router } from "express";
import { SuggestionCreateSchema } from "@cuelens/shared";
import {
  createSuggestion,
  listSuggestions,
  getSuggestion,
  approveSuggestion,
  rejectSuggestion,
} from "../store/suggestionsStore.js";

const router: Router = express.Router();

/**
 * POST /suggestions
 * Create a new suggestion
 */
router.post("/", (req, res) => {
  try {
    const input = SuggestionCreateSchema.parse(req.body);
    const suggestion = createSuggestion(input);
    res.status(201).json(suggestion);
  } catch (error) {
    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
    } else {
      res.status(400).json({ error: "Invalid request" });
    }
  }
});

/**
 * GET /suggestions
 * List suggestions, optionally filtered by status
 */
router.get("/", (req, res) => {
  const status = req.query.status as "pending" | "approved" | "rejected" | undefined;
  const suggestions = listSuggestions(status);
  res.json(suggestions);
});

/**
 * GET /suggestions/:id
 * Get a single suggestion by ID
 */
router.get("/:id", (req, res) => {
  const suggestion = getSuggestion(req.params.id);

  if (!suggestion) {
    res.status(404).json({ error: "Suggestion not found" });
    return;
  }

  res.json(suggestion);
});

/**
 * POST /suggestions/:id/approve
 * Approve a suggestion
 */
router.post("/:id/approve", (req, res) => {
  try {
    const suggestion = approveSuggestion(req.params.id);
    res.json(suggestion);
  } catch (error) {
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  }
});

/**
 * POST /suggestions/:id/reject
 * Reject a suggestion
 */
router.post("/:id/reject", (req, res) => {
  try {
    const suggestion = rejectSuggestion(req.params.id);
    res.json(suggestion);
  } catch (error) {
    if (error instanceof Error) {
      res.status(404).json({ error: error.message });
    } else {
      res.status(404).json({ error: "Suggestion not found" });
    }
  }
});

export default router;
