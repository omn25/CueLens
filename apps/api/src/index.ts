import express from "express";
import suggestionsRouter from "./routes/suggestions.js";
import transcriptRouter from "./routes/transcript.js";

const app = express();

// Middleware
app.use(express.json());

// CORS for development (permissive for MVP)
app.use((_req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept"
  );
  next();
});

// Routes
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/suggestions", suggestionsRouter);
app.use("/transcript", transcriptRouter);

const start = () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "0.0.0.0";

    app.listen(port, host, () => {
      console.log(`API server listening on http://${host}:${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
