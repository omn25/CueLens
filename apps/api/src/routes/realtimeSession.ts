import type { Request, Response } from "express";

/**
 * POST /realtime/session
 * Creates a transcription session and returns an ephemeral client_secret token
 * for browser/client connections to OpenAI Real-Time API
 */
export async function createRealtimeSessionHandler(_req: Request, res: Response) {
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    res.status(500).json({ error: "OPENAI_API_KEY not configured on server" });
    return;
  }

  try {
    // Create ephemeral client_secret token via OpenAI API
    // This returns a short-lived token that can be used securely from browsers
    const response = await fetch("https://api.openai.com/v1/realtime/client_secrets", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1",
      },
      body: JSON.stringify({
        // Optional: configure session at creation time
        session: {
          model: "gpt-4o-realtime-preview",
        },
        // Token expires after 60 seconds by default
        expires_after: {
          anchor: "created_at",
          seconds: 600, // 10 minutes
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Failed to create ephemeral token:", response.status, errorText);
      res.status(response.status).json({ 
        error: "Failed to create ephemeral token",
        details: errorText 
      });
      return;
    }

    const tokenData = await response.json() as {
      value: string;
      expires_at: number;
      session?: unknown;
    };
    
    // Return the ephemeral token (value field) to the frontend
    // This token expires quickly, so it's safe for browser use
    res.json({
      client_secret: tokenData.value, // The ephemeral token
      expires_at: tokenData.expires_at,
      session: tokenData.session,
    });
    
    console.log(`✅ Created ephemeral token (expires at ${new Date(tokenData.expires_at * 1000).toISOString()})`);
  } catch (error) {
    console.error("Error creating transcription session:", error);
    res.status(500).json({ 
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    });
  }
}
