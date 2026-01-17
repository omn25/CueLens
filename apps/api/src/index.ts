import express from "express";

const app = express();

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

const start = () => {
  try {
    const port = Number(process.env.PORT) || 3001;
    const host = process.env.HOST || "0.0.0.0";

    app.listen(port, host, () => {
      console.log(`API server listening on ${host}:${port}`);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

start();
