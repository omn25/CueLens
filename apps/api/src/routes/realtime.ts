import type { IncomingMessage } from "http";
import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "http";

/**
 * WebSocket proxy for OpenAI Real-Time API
 * This securely handles API key authentication on the backend
 * and proxies WebSocket connections to OpenAI
 */

let wss: WebSocketServer | null = null;

export function setupRealtimeProxy(server: Server) {
  // Get OpenAI API key from environment (backend only - secure)
  const openaiApiKey = process.env.OPENAI_API_KEY;
  
  if (!openaiApiKey) {
    console.error("❌ OPENAI_API_KEY not found in environment. Realtime proxy will not work.");
    console.error("⚠️ Please add OPENAI_API_KEY=sk-... to apps/api/.env file");
    return;
  }
  
  // Validate API key format
  if (!openaiApiKey.startsWith('sk-')) {
    console.warn("⚠️ Warning: OPENAI_API_KEY doesn't start with 'sk-' - this might be invalid");
  }
  
  console.log(`✅ OPENAI_API_KEY found (${openaiApiKey.substring(0, 7)}...)`);

  wss = new WebSocketServer({
    server,
    path: "/realtime/connect",
  });

  wss.on("connection", async (clientWs: WebSocket, req: IncomingMessage) => {
    console.log("🔌 Client WebSocket connected to proxy");
    console.log("   Client IP:", req.socket.remoteAddress);
    console.log("   Request URL:", req.url);

    // Extract model from query params (optional)
    // For transcription, use gpt-4o-realtime-preview (no date suffix needed)
    const url = new URL(req.url || "", `http://${req.headers.host || "localhost"}`);
    const model = url.searchParams.get("model") || "gpt-4o-realtime-preview";

    // Queue for messages that arrive before OpenAI connection is ready
    const messageQueue: Buffer[] = [];
    let openaiWsReady = false;
    
    // Diagnostic tracking
    let audioChunkCount = 0;
    let totalAudioBytes = 0;
    let configMessageSent = false;
    let lastConfigMessage: any = null;
    let receivedEventTypes: string[] = [];
    let micPermissionStatus = 'unknown'; // Will be logged by client
    let detectedSampleRate: number | null = null;

    // For Realtime Transcription sessions, we use API key directly
    // Ephemeral tokens are optional and can cause issues with transcription sessions
    // CRITICAL: For Realtime Transcription, connect to:
    // wss://api.openai.com/v1/realtime?intent=transcription
    // Reference: https://platform.openai.com/docs/guides/speech-to-text#streaming-the-transcription-of-an-ongoing-audio-recording
    //
    // IMPORTANT:
    // - Include required headers: Authorization (Bearer token) and OpenAI-Beta: realtime=v1
    // - DON'T include model in URL - it's specified in transcription_session.update instead
    // - Transcription model must be: gpt-4o-mini-transcribe, gpt-4o-transcribe, or whisper-1
    
    const openaiWsUrl = `wss://api.openai.com/v1/realtime?intent=transcription`;
    
    console.log('🔌 Connecting to OpenAI Realtime Transcription API...');
    console.log('   URL:', openaiWsUrl);
    console.log('   Using API key directly (required for transcription sessions)');
    
    // For Node.js 'ws' library, headers are passed in options
    // Try with OpenAI-Beta header first - if we get api_version_mismatch, 
    // it might mean transcription sessions use a different API version
    // According to docs, OpenAI-Beta: realtime=v1 should work, but some endpoints may differ
    // CRITICAL: Verify required headers for OpenAI Realtime API
    const openaiHeaders = {
      'Authorization': `Bearer ${openaiApiKey}`,
      'OpenAI-Beta': 'realtime=v1',
    };
    
    // Log the exact headers being sent (for debugging)
    console.log('   Required headers:');
    console.log('     Authorization: Bearer', openaiApiKey.substring(0, 10) + '...');
    console.log('     OpenAI-Beta: realtime=v1');
    console.log('   ✅ All required headers present');
    
    const openaiWs = new WebSocket(openaiWsUrl, {
      headers: openaiHeaders,
    });

    // Forward messages from client to OpenAI
    clientWs.on("message", (data) => {
      // Log ALL client messages for debugging
      try {
        if (typeof data === 'string') {
          const parsed = JSON.parse(data);
          const messageType = parsed.type || 'unknown';
          
          // Track audio chunks
          if (messageType === 'input_audio_buffer.append') {
            audioChunkCount++;
            const base64Audio = parsed.audio || '';
            const audioBytes = base64Audio.length * 0.75; // Base64 is ~4/3 the size of binary
            totalAudioBytes += audioBytes;
            
            if (audioChunkCount === 1) {
              console.log('🎵 First audio chunk received from client');
              console.log('   Base64 length:', base64Audio.length, 'characters');
              console.log('   Estimated binary size:', Math.round(audioBytes), 'bytes');
            } else if (audioChunkCount % 50 === 0) {
              const avgChunkSize = totalAudioBytes / audioChunkCount;
              console.log(`📊 Audio stats: ${audioChunkCount} chunks received, avg ${avgChunkSize.toFixed(0)} bytes/chunk`);
            }
          }
          
          console.log('📤 Client -> OpenAI:', messageType, messageType === 'input_audio_buffer.append' ? `(chunk #${audioChunkCount}, ${data.length} bytes JSON)` : '');
          
          // Log transcription_session.update fully for debugging (required)
          if (messageType === 'transcription_session.update') {
            configMessageSent = true;
            lastConfigMessage = parsed;
            console.log('📋 Client sent transcription_session.update - exact config:');
            console.log(JSON.stringify(parsed, null, 2));
            
            // Validate config structure matches docs
            // NOTE: For transcription sessions, config is at TOP LEVEL (NOT wrapped in "session")
            const config = parsed.session ? parsed.session : parsed; // Support both formats for now
            if (parsed.session) {
              console.warn('⚠️ WARNING: Config wrapped in "session" key - transcription_session.update should have fields at top level');
            }
            
            if (!config.input_audio_transcription?.model) {
              console.warn('⚠️ WARNING: transcription_session.update missing input_audio_transcription.model');
            } else {
              const model = config.input_audio_transcription.model;
              const validModels = ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'];
              if (!validModels.includes(model)) {
                console.error(`❌ ERROR: Invalid transcription model "${model}" - must be one of:`, validModels.join(', '));
                console.error(`   "${model}" is for realtime conversations, not transcription sessions`);
                console.error(`   Use one of the transcription models: ${validModels.join(', ')}`);
              } else {
                console.log(`✅ Valid transcription model: ${model}`);
              }
            }
          }
        } else {
          console.log('📤 Client -> OpenAI: (binary data,', data.length, 'bytes)');
        }
      } catch (e) {
        // Not JSON, probably binary - log it
        console.log('📤 Client -> OpenAI: (non-JSON,', data.length, 'bytes)');
      }

      if (openaiWsReady && openaiWs.readyState === WebSocket.OPEN) {
        // For transcription sessions (?intent=transcription), all messages can be sent immediately
        // No need to wait for session.created - transcription sessions don't send it
        try {
          openaiWs.send(data);
        } catch (err) {
          console.error('❌ Error forwarding message to OpenAI:', err);
        }
      } else {
        // Queue message until OpenAI connection is ready
        messageQueue.push(data);
        if (!openaiWsReady) {
          console.log('⏳ Queuing message (OpenAI WebSocket connecting..., queue size:', messageQueue.length, ')');
        } else {
          console.warn('⚠️ OpenAI WebSocket not in OPEN state:', openaiWs.readyState, '- queuing message');
        }
      }
    });

    // Track if we've received session.created from OpenAI
    let sessionCreatedReceived = false;
    
    // Forward messages from OpenAI to client
    openaiWs.on("message", (data: Buffer | string, isBinary: boolean) => {
      // CRITICAL: Decode binary messages - OpenAI sends JSON as binary
      // Convert Buffer to string and parse JSON to reveal actual error messages
      let textData: string;
      let parsed: any = null;
      
      try {
        if (Buffer.isBuffer(data)) {
          // Binary data - convert to string
          textData = data.toString('utf8');
        } else if (typeof data === 'string') {
          textData = data;
        } else {
          // Unknown type - try to convert
          textData = String(data);
        }
        
        // Log the raw text first (before parsing)
        console.log('\n📨 OpenAI -> Client: RAW message text:');
        console.log(textData);
        
        // Try to parse as JSON
        parsed = JSON.parse(textData);
        
        if (parsed.type) {
          const eventType = parsed.type;
          receivedEventTypes.push(eventType);
          
          // Log RAW JSON for all events (as required)
          console.log('📨 OpenAI -> Client: DECODED event JSON:');
          console.log(JSON.stringify(parsed, null, 2));
          
          const hasError = !!parsed.error;
          const hasTranscript = !!parsed.transcript || !!parsed.item?.input_audio_transcription?.transcript;
          
          // Extract transcript if available
          let transcriptText: string | null = null;
          if (parsed.transcript) {
            transcriptText = parsed.transcript;
          } else if (parsed.item?.input_audio_transcription?.transcript) {
            transcriptText = parsed.item.input_audio_transcription.transcript;
          }
          
          // Log summary line
          console.log(`\n📌 Event type: ${eventType}`);
          if (hasError) {
            console.error('❌ ERROR DETECTED in event:');
            console.error('   Error code:', parsed.error?.code);
            console.error('   Error type:', parsed.error?.type);
            console.error('   Error message:', parsed.error?.message);
            console.error('   Error param:', parsed.error?.param);
          }
          if (transcriptText) {
            console.log(`📝 Transcript: "${transcriptText}"`);
          }
          
          // Log transcript to terminal if final
          if (transcriptText && (eventType.includes('completed') || eventType.includes('done'))) {
            console.log('\n✅ FINAL TRANSCRIPT RECEIVED:');
            console.log('   "' + transcriptText + '"');
            console.log('   Event type:', eventType);
            console.log('');
          }
          
          // If there's an error, always log it fully
          if (hasError) {
            console.error('\n❌ OPENAI ERROR EVENT (FULL):');
            console.error(JSON.stringify(parsed, null, 2));
            console.error('');
          }
            
            // Track when session.created arrives (may not happen for transcription sessions)
            if (eventType === 'session.created') {
              sessionCreatedReceived = true;
              console.log('✅ Received session.created from OpenAI - now safe to send queued messages');
              
              // Clear timeout since we got session.created
              if ((openaiWs as any)._sessionCreatedTimeout) {
                clearTimeout((openaiWs as any)._sessionCreatedTimeout);
              }
              
              // Now send any queued messages (like session.update from client)
              while (messageQueue.length > 0 && openaiWs.readyState === WebSocket.OPEN) {
                const queuedMsg = messageQueue.shift();
                if (queuedMsg) {
                  try {
                    if (typeof queuedMsg === 'string') {
                      try {
                        const parsedMsg = JSON.parse(queuedMsg);
                        console.log('📤 Sending queued message:', parsedMsg.type || 'unknown');
                      } catch (e) {
                        // Not JSON
                      }
                    }
                    openaiWs.send(queuedMsg);
                  } catch (err) {
                    console.error('Error sending queued message:', err);
                  }
                }
              }
            }
          } else {
            // Message without type field
            console.log('📨 OpenAI -> Client: (message without type)');
            console.log(JSON.stringify(parsed, null, 2));
          }
      } catch (e) {
        // Failed to parse as JSON - log raw text
        console.error('❌ Failed to parse OpenAI message as JSON:');
        console.error('   Error:', e instanceof Error ? e.message : e);
        if (Buffer.isBuffer(data)) {
          textData = data.toString('utf8');
          console.error('   Raw buffer length:', data.length, 'bytes');
          console.error('   First 200 chars as text:', textData.substring(0, 200));
        } else if (typeof data === 'string') {
          textData = data;
          console.error('   Raw data type: string');
          console.error('   Raw data:', textData.substring(0, 200));
        } else {
          textData = String(data);
          console.error('   Raw data type:', typeof data);
          console.error('   Raw data:', textData.substring(0, 200));
        }
      }

      // Forward decoded text data to client (not binary buffer)
      if (clientWs.readyState === WebSocket.OPEN) {
        try {
          // Forward the decoded text, not the binary buffer
          if (textData) {
            clientWs.send(textData);
          } else {
            // Fallback to original data if textData is not available
            clientWs.send(data);
          }
        } catch (err) {
          console.error('❌ Error forwarding message to client:', err);
        }
      } else {
        console.warn('⚠️ Client WebSocket not open (state:', clientWs.readyState, '), cannot forward message');
      }
    });

    openaiWs.on("open", () => {
      console.log("✅ Connected to OpenAI Real-Time API via proxy");
      console.log("   WebSocket readyState:", openaiWs.readyState, "(1 = OPEN)");
      console.log("   Headers sent: Authorization: Bearer <token>, OpenAI-Beta: realtime=v1");
      openaiWsReady = true;
      
      // CRITICAL: For transcription sessions (?intent=transcription), send config immediately
      // Do NOT wait for session.created - transcription sessions don't send it
      // Send any queued messages immediately (this should include transcription_session.update from client)
      const queueLength = messageQueue.length;
      if (queueLength > 0) {
        console.log(`\n📤 Sending ${queueLength} queued message(s) immediately (transcription sessions don't require session.created)`);
        while (messageQueue.length > 0 && openaiWs.readyState === WebSocket.OPEN) {
          const queuedMsg = messageQueue.shift();
          if (queuedMsg) {
            try {
              // Log what we're sending
              if (typeof queuedMsg === 'string') {
                try {
                  const parsed = JSON.parse(queuedMsg);
                  console.log(`   Sending queued message: ${parsed.type || 'unknown'}`);
                  if (parsed.type === 'transcription_session.update') {
                    console.log('   📋 Config message being sent:');
                    console.log(JSON.stringify(parsed, null, 2));
                    configMessageSent = true;
                    lastConfigMessage = parsed;
                  }
                } catch (e) {
                  // Not JSON
                }
              }
              openaiWs.send(queuedMsg);
            } catch (err) {
              console.error('❌ Error sending queued message:', err);
            }
          }
        }
        console.log('');
      } else {
        console.warn('⚠️ No queued messages to send on open');
        console.warn('   Config message should be queued before OpenAI connection opens');
      }
    });

    openaiWs.on("error", (error: Error) => {
      console.error("❌ OpenAI WebSocket error:", error);
      console.error("   Error message:", error.message || error);
      console.error("   Error stack:", error.stack);
      console.error("   WebSocket state:", openaiWs.readyState);
      console.error("   URL used:", openaiWsUrl);
      console.error("⚠️ Troubleshooting:");
      console.error("   1) Check OPENAI_API_KEY is set in apps/api/.env");
      console.error("   2) Verify API key is valid and has Real-Time API access");
      console.error("   3) API key format should start with 'sk-'");
      console.error("   4) Check if headers are being sent correctly (authorization, openai-beta)");
      
      // Only close client if OpenAI connection fails - don't close on normal errors
      if (openaiWs.readyState !== WebSocket.OPEN && openaiWs.readyState !== WebSocket.CLOSING) {
        console.error("   Closing client connection due to OpenAI error");
        clientWs.close(1011, "OpenAI connection error");
      }
    });

    openaiWs.on("close", (code, reason) => {
      const reasonStr = reason?.toString() || '';
      const reasonBuffer = Buffer.isBuffer(reason) ? reason.toString('utf8') : reasonStr;
      console.log(`\n🔴 OpenAI WebSocket closed:`);
      console.log(`   Close code: ${code}`);
      console.log(`   Reason: "${reasonBuffer || '(no reason)'}"`);
      console.log(`   wasClean: ${code === 1000 || code === 1001}`);
      console.log(`   Queue length at close: ${messageQueue.length}`);
      console.log(`   openaiWsReady: ${openaiWsReady}`);
      
      // Diagnostic report (as required)
      console.log('\n📊 DIAGNOSTIC REPORT:');
      console.log('   OpenAI WS close code:', code);
      console.log('   Close reason:', reasonBuffer || '(no reason)');
      console.log('   Config message sent:', configMessageSent);
      if (lastConfigMessage) {
        console.log('   Last config message:', JSON.stringify(lastConfigMessage, null, 2));
      }
      console.log('   Audio chunks appended:', audioChunkCount);
      console.log('   Total audio bytes:', Math.round(totalAudioBytes));
      console.log('   Average chunk size:', audioChunkCount > 0 ? Math.round(totalAudioBytes / audioChunkCount) : 0, 'bytes');
      console.log('   OpenAI server events received:', receivedEventTypes.length);
      console.log('   Event types:', receivedEventTypes.join(', ') || '(none)');
      console.log('   Mic permission status:', micPermissionStatus, '(logged by client)');
      console.log('   Detected sample rate:', detectedSampleRate || 'unknown', 'Hz');
      console.log('');
      
      // Clear session timeout if still pending
      if ((openaiWs as any)._sessionCreatedTimeout) {
        clearTimeout((openaiWs as any)._sessionCreatedTimeout);
      }
      
      // Log specific close codes for debugging
      if (code === 1000) {
        console.error("⚠️ Normal closure (1000) - OpenAI closed the connection cleanly");
        console.error("   This usually means the connection was closed intentionally.");
        console.error("   Check if client is closing the connection or if there's an error before this.");
      } else if (code === 1001) {
        console.error("⚠️ Going away (1001) - OpenAI endpoint is going away");
      } else if (code === 1006) {
        console.error("❌ Abnormal closure (1006) - connection was lost unexpectedly (no close frame)");
      } else if (code === 4003) {
        console.error("❌ Invalid API key or authentication failed (code 4003)");
        console.error("   Check OPENAI_API_KEY in apps/api/.env");
      } else if (code === 4004) {
        console.error("❌ Rate limit exceeded (code 4004)");
      } else if (code >= 4000 && code < 5000) {
        console.error(`❌ Client error (code ${code}) - ${reasonBuffer}`);
        if (reasonBuffer.includes('invalid_model') || reasonBuffer.includes('invalid_mode')) {
          console.error('🔍 INVALID_MODEL or INVALID_MODE detected!');
          console.error('   This usually means:');
          console.error('   1) Wrong event type (should be "transcription_session.update", NOT "session.update")');
          console.error('   2) Invalid model name in transcription_session.update');
          console.error('   3) Model in wrong location (should be in input_audio_transcription.model)');
          console.error('   4) Included "mode" field (should NOT be included in transcription sessions)');
        }
        if (reasonBuffer.includes('api_version_mismatch')) {
          console.error('🔍 API_VERSION_MISMATCH detected!');
          console.error('   This usually means:');
          console.error('   1) OpenAI-Beta header value is incorrect');
          console.error('   2) API endpoint version mismatch');
          console.error('   3) Try without OpenAI-Beta header for transcription sessions');
        }
      }
      
      openaiWsReady = false;
      if (clientWs.readyState === WebSocket.OPEN) {
        console.log(`   Forwarding close to client (code ${code})`);
        clientWs.close(code, reason);
      } else {
        console.log(`   Client already closed (state: ${clientWs.readyState}), not forwarding`);
      }
    });

    clientWs.on("error", (error) => {
      console.error("Client WebSocket error:", error);
      if (openaiWs.readyState === WebSocket.OPEN || openaiWs.readyState === WebSocket.CONNECTING) {
        openaiWs.close(1011, "Client error");
      }
    });

    clientWs.on("close", (code, reason) => {
      const reasonStr = reason?.toString() || '';
      const reasonBuffer = Buffer.isBuffer(reason) ? reason.toString('utf8') : reasonStr;
      console.log(`🔴 Client WebSocket closed: code=${code}, reason="${reasonBuffer || '(no reason)'}"`);
      console.log(`   OpenAI WebSocket state: ${openaiWs.readyState} (OPEN=1, CLOSING=2, CLOSED=3)`);
      
      // Only close OpenAI connection if it's still open or connecting
      // Don't close if it's already closed or closing - that could cause issues
      if (openaiWs.readyState === WebSocket.OPEN) {
        console.log(`   Closing OpenAI connection (clean close)`);
        openaiWs.close(code, reason);
      } else if (openaiWs.readyState === WebSocket.CONNECTING) {
        console.log(`   Closing OpenAI connection (still connecting)`);
        openaiWs.close(code, reason);
      } else {
        console.log(`   OpenAI connection already closed/closing (state: ${openaiWs.readyState}), not closing again`);
      }
    });
  });

  console.log("Realtime WebSocket proxy server ready at /realtime/connect");
}
