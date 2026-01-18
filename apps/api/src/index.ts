import "dotenv/config";
import express from "express";
import cors from "cors";
import { healthHandler } from "./routes/health.js";
import {
  createSuggestionHandler,
  listSuggestionsHandler,
  approveSuggestionHandler,
  rejectSuggestionHandler,
} from "./routes/suggestions.js";
import { transcriptHandler } from "./routes/transcript.js";
import { createRealtimeSessionHandler } from "./routes/realtimeSession.js";
import { uploadFrameHandler, getFrameHandler } from "./routes/frames.js";
import {
  listPeopleHandler,
  getPersonHandler,
  createPersonHandler,
  upsertPersonHandler,
  updatePersonHandler,
  deletePersonHandler,
} from "./routes/people.js";

const app = express();

// Middleware
app.use(express.json());

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || "http://localhost:3000";
app.use(
  cors({
    origin: corsOrigin,
    credentials: true,
  })
);

// Routes
app.get("/health", healthHandler);

// Suggestions routes
app.post("/suggestions", createSuggestionHandler);
app.get("/suggestions", listSuggestionsHandler);
app.post("/suggestions/:id/approve", approveSuggestionHandler);
app.post("/suggestions/:id/reject", rejectSuggestionHandler);

// Transcript route
app.post("/transcript", transcriptHandler);

// Real-Time API session route (creates ephemeral token for browser connections)
app.post("/realtime/session", createRealtimeSessionHandler);

// Frame routes
app.post("/frames", uploadFrameHandler);
app.get("/frames/:id", getFrameHandler);

// People routes
app.get("/people", listPeopleHandler);
app.get("/people/:id", getPersonHandler);
app.post("/people", createPersonHandler);
app.post("/people/upsert", upsertPersonHandler);
app.patch("/people/:id", updatePersonHandler);
app.delete("/people/:id", deletePersonHandler);

const start = async () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "127.0.0.1";

    const server = app.listen(port, host, () => {
      const url = `http://${host}:${port}`;
      console.log(`API server listening on ${url}`);
      console.log(`Health check: ${url}/health`);
    });

    // Setup WebSocket proxy for OpenAI Real-Time API
    try {
      const { setupRealtimeProxy } = await import("./routes/realtime.js");
      setupRealtimeProxy(server);
    } catch (err) {
      console.warn("Failed to setup realtime proxy:", err);
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
