/**
 * Minimal "known-good" backend-only reproduction for OpenAI Realtime Transcription
 * 
 * This file tests the OpenAI Realtime Transcription API connection directly
 * without the browser/frontend layer to isolate issues.
 * 
 * Usage:
 *   tsx src/openaiTranscribeDebug.ts
 * 
 * Make sure OPENAI_API_KEY is set in apps/api/.env
 */

import "dotenv/config";
import { WebSocket } from "ws";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY not found in environment");
  console.error("   Please add OPENAI_API_KEY=sk-... to apps/api/.env");
  process.exit(1);
}

if (!OPENAI_API_KEY.startsWith('sk-')) {
  console.warn("⚠️ Warning: OPENAI_API_KEY doesn't start with 'sk-' - might be invalid");
}

console.log(`✅ OPENAI_API_KEY found (${OPENAI_API_KEY.substring(0, 7)}...)`);
console.log('🔌 Connecting to OpenAI Realtime Transcription API...');

const OPENAI_WS_URL = 'wss://api.openai.com/v1/realtime?intent=transcription';

console.log('   URL:', OPENAI_WS_URL);
console.log('   Headers:');
console.log('     Authorization: Bearer', OPENAI_API_KEY.substring(0, 10) + '...');
console.log('     OpenAI-Beta: realtime=v1');

// Create WebSocket connection to OpenAI
const ws = new WebSocket(OPENAI_WS_URL, {
  headers: {
    'Authorization': `Bearer ${OPENAI_API_KEY}`,
    'OpenAI-Beta': 'realtime=v1',
  },
});

let configSent = false;
const audioChunkCount = 0;
const totalAudioBytes = 0;
const receivedEvents: string[] = [];

ws.on('open', () => {
  console.log('✅ Connected to OpenAI WebSocket');
  console.log('   WebSocket readyState:', ws.readyState, '(1 = OPEN)');
  
  // Send EXACT config as specified in requirements
  // CRITICAL: transcription_session.update requires a "session" key wrapping all config
  const config = {
    type: "transcription_session.update",
    session: {
      input_audio_format: "pcm16",
      input_audio_transcription: {
        model: "gpt-4o-mini-transcribe",
        prompt: "",
        language: "en"
      },
      turn_detection: {
        type: "server_vad",
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      input_audio_noise_reduction: { type: "near_field" },
      include: ["item.input_audio_transcription.logprobs"]
    }
  };
  
  console.log('\n📋 Sending EXACT transcription_session.update config:');
  console.log(JSON.stringify(config, null, 2));
  
  try {
    ws.send(JSON.stringify(config));
    configSent = true;
    console.log('✅ transcription_session.update sent successfully\n');
  } catch (err) {
    console.error('❌ Error sending config:', err);
  }
});

ws.on('message', (data: Buffer | string) => {
  // Log every incoming message raw
  try {
    const text = typeof data === 'string' ? data : data.toString('utf8');
    const parsed = JSON.parse(text);
    
    // Log raw JSON for debugging
    console.log('\n📨 RAW OpenAI message received:');
    console.log(JSON.stringify(parsed, null, 2));
    
    // Track event types
    if (parsed.type) {
      receivedEvents.push(parsed.type);
      console.log(`📌 Event type: ${parsed.type}`);
      
      // Log specific event details
      if (parsed.type === 'transcription_session.updated' || parsed.type === 'transcription_session.update') {
        console.log('✅ Transcription session updated confirmed by OpenAI');
      } else if (parsed.type === 'error') {
        console.error('❌ ERROR EVENT RECEIVED');
        console.error('   Error code:', parsed.error?.code);
        console.error('   Error type:', parsed.error?.type);
        console.error('   Error message:', parsed.error?.message);
      } else if (parsed.type.includes('transcription') && parsed.transcript) {
        console.log('📝 TRANSCRIPT RECEIVED:', parsed.transcript);
      } else if (parsed.type.includes('transcription') && parsed.item?.input_audio_transcription?.transcript) {
        console.log('📝 TRANSCRIPT RECEIVED:', parsed.item.input_audio_transcription.transcript);
      }
    } else {
      console.log('⚠️ Message received without type field');
    }
  } catch (err) {
    console.error('❌ Error parsing message:', err);
    console.error('   Raw data (first 100 chars):', typeof data === 'string' ? data.substring(0, 100) : data.toString('utf8').substring(0, 100));
  }
});

ws.on('error', (error: Error) => {
  console.error('\n❌ WebSocket error:');
  console.error('   Error message:', error.message);
  console.error('   Error stack:', error.stack);
  console.error('   WebSocket state:', ws.readyState);
});

ws.on('close', (code: number, reason: Buffer) => {
  const reasonStr = reason.toString('utf8');
  console.log('\n🔴 WebSocket closed:');
  console.log('   Close code:', code);
  console.log('   Reason:', reasonStr || '(no reason)');
  console.log('   wasClean:', code === 1000 || code === 1001);
  
  // Diagnostic report
  console.log('\n📊 DIAGNOSTIC REPORT:');
  console.log('   Config sent:', configSent);
  console.log('   Audio chunks appended:', audioChunkCount);
  console.log('   Total audio bytes:', totalAudioBytes);
  console.log('   Average chunk size:', audioChunkCount > 0 ? (totalAudioBytes / audioChunkCount).toFixed(0) : 0, 'bytes');
  console.log('   OpenAI server events received:', receivedEvents.length);
  console.log('   Event types:', receivedEvents.join(', ') || '(none)');
  
  // Close code analysis
  if (code === 1000) {
    console.log('\n⚠️ Normal closure (1000) - connection closed cleanly');
    console.log('   This usually means the connection was intentionally closed');
  } else if (code === 1001) {
    console.log('\n⚠️ Going away (1001)');
  } else if (code === 1006) {
    console.log('\n❌ Abnormal closure (1006) - connection lost unexpectedly');
  } else if (code === 4003) {
    console.log('\n❌ Authentication failed (4003) - check OPENAI_API_KEY');
  } else if (code === 4004) {
    console.log('\n❌ Rate limit exceeded (4004)');
  } else if (code >= 4000 && code < 5000) {
    console.log(`\n❌ Client error (code ${code})`);
    if (reasonStr.includes('invalid_model') || reasonStr.includes('invalid_mode')) {
      console.log('   This indicates a configuration error - check model name and config structure');
    }
  }
  
  process.exit(0);
});

// Keep process alive and allow manual testing
console.log('\n💡 Connection established. Waiting for OpenAI events...');
console.log('   This script only tests the connection and config.');
console.log('   For audio streaming, use the full implementation.\n');

// Auto-close after 30 seconds if no activity (for testing)
setTimeout(() => {
  if (ws.readyState === WebSocket.OPEN) {
    console.log('\n⏰ 30 seconds elapsed, closing connection...');
    ws.close(1000, 'Test completed');
  }
}, 30000);
