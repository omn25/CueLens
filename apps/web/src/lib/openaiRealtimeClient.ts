/**
 * OpenAI Realtime Transcription API Client
 * 
 * Implements streaming speech-to-text using OpenAI's Realtime Transcription API.
 * 
 * Architecture:
 * - Browser connects to backend WebSocket proxy (apps/api)
 * - Backend connects to OpenAI: wss://api.openai.com/v1/realtime?intent=transcription
 * - API key is stored in backend only (apps/api/.env) - never exposed to browser
 * 
 * Reference: https://platform.openai.com/docs/guides/speech-to-text#streaming-the-transcription-of-an-ongoing-audio-recording
 * 
 * Transcription Session Flow:
 * 1. Connect to backend WS proxy
 * 2. Backend connects to OpenAI with ?intent=transcription
 * 3. Send transcription_session.update config (NOT session.update)
 * 4. Stream PCM16 audio via input_audio_buffer.append events
 * 5. Receive final transcripts via conversation.item.input_audio_transcription.completed events
 * 
 * Audio Format:
 * - PCM16 mono, little-endian
 * - Sample rate: 16000 Hz (AudioContext automatically resamples if mic is different rate)
 * - Base64-encoded in input_audio_buffer.append messages
 * 
 * Valid Transcription Models:
 * - gpt-4o-mini-transcribe (default: fast, cheap)
 * - gpt-4o-transcribe (higher accuracy)
 * - whisper-1 (legacy)
 */

/**
 * Transcription model options for Realtime transcription sessions
 * See: https://platform.openai.com/docs/guides/speech-to-text#streaming-the-transcription-of-an-ongoing-audio-recording
 */
export const TRANSCRIPTION_MODEL = {
  MINI: 'gpt-4o-mini-transcribe', // Fast, cheap - best default for hackathon
  STANDARD: 'gpt-4o-transcribe',  // Higher accuracy if needed
  LEGACY: 'whisper-1',            // Legacy model
} as const;

export type TranscriptionModel = typeof TRANSCRIPTION_MODEL[keyof typeof TRANSCRIPTION_MODEL];

export interface OpenAIRealtimeConfig {
  apiKey?: string; // Deprecated - backend handles API key from env vars
  model?: TranscriptionModel; // Transcription model (default: gpt-4o-mini-transcribe)
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: Error) => void;
}

export class OpenAIRealtimeClient {
  private ws: WebSocket | null = null;
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private config: OpenAIRealtimeConfig;
  private isConnected = false;
  private sessionConfigSent = false;
  private configAcked = false; // CRITICAL: Only start audio after config acknowledged
  private retryCount = 0;
  private maxRetries = 5;
  private retryDelays = [300, 1000, 2000, 5000, 5000]; // ms
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(config: OpenAIRealtimeConfig) {
    this.config = config;
    // Reset retry count on new instance (decoupled from vision pipeline)
    this.retryCount = 0;
  }

  /**
   * Connect to OpenAI Real-Time API via backend proxy
   * Backend now generates ephemeral tokens automatically for each connection
   */
  async connect(audioStream: MediaStream): Promise<void> {
    try {
      // Connect via backend proxy
      // Backend automatically generates ephemeral tokens for secure connections
      // The backend connects to: wss://api.openai.com/v1/realtime?intent=transcription
      const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
      // Note: model is NOT in the URL - it's specified in transcription_session.update
      const wsUrl = `${API_BASE_URL.replace('http', 'ws')}/realtime/connect`;
      
      console.log('🔌 Connecting to backend WebSocket proxy:', wsUrl);
      console.log('   Backend will connect to: wss://api.openai.com/v1/realtime?intent=transcription');
      
      // Initialize WebSocket - backend handles ephemeral token generation
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ OpenAI Real-Time API WebSocket connected (using ephemeral token)');
        console.log('   WebSocket readyState:', this.ws?.readyState, '(should be 1 = OPEN)');
        this.isConnected = true;

        // Store audioStream immediately
        this.mediaStream = audioStream;
        
        // CRITICAL: Enforce ordering - send config, wait for ack, THEN start audio
        console.log('📤 Sending transcription_session.update immediately...');
        if (!this.sessionConfigSent && this.mediaStream && this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.sendSessionUpdate();
        // DO NOT start audio yet - wait for configAcked = true
        this.configAcked = false; // Reset ack flag
        console.log('⏳ Waiting for config acknowledgment before starting audio streaming...');
        } else {
          console.warn('⚠️ Cannot send transcription_session.update:', {
            sessionConfigSent: this.sessionConfigSent,
            hasMediaStream: !!this.mediaStream,
            wsReadyState: this.ws?.readyState
          });
        }
      };

      this.ws.onmessage = (event) => {
        try {
          // CRITICAL: Decode ALL messages, including binary Buffers
          let textData: string;
          let data: any;
          
          // Handle different data types
          if (event.data instanceof Blob) {
            // Convert Blob to text
            event.data.text().then((text) => {
              try {
                const parsed = JSON.parse(text);
                this.handleOpenAIMessage(parsed, text);
              } catch (e) {
                console.log('📨 Received binary data (Blob):', event.data.size, 'bytes (not JSON)');
              }
            }).catch((err) => {
              console.error('❌ Error reading Blob:', err);
            });
            return;
          } else if (typeof event.data === 'string') {
            textData = event.data;
          } else if (event.data instanceof ArrayBuffer) {
            // Convert ArrayBuffer to string
            textData = new TextDecoder('utf8').decode(event.data);
          } else {
            // Try to use as-is
            textData = String(event.data);
          }
          
          // Parse JSON
          try {
            data = JSON.parse(textData);
          } catch (e) {
            console.log('📨 Received non-JSON message:', textData.substring(0, 200));
            return;
          }
          
          // Handle the message (this will check config ack and handle errors)
          this.handleOpenAIMessage(data, textData);
        } catch (err) {
          console.error('Error parsing OpenAI Real-Time message:', err);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ OpenAI Real-Time WebSocket error:', error);
        console.error('   WebSocket readyState:', this.ws?.readyState);
        console.error('   Make sure OPENAI_API_KEY is set in backend .env file');
        console.error('   Check backend logs for OpenAI connection errors');
        this.config.onError?.(new Error('WebSocket connection error - check backend OPENAI_API_KEY and logs'));
      };

      this.ws.onclose = (event) => {
        const reasonStr = event.reason || '(no reason)';
        const isServerError = reasonStr.toLowerCase().includes('server') || 
                             reasonStr.toLowerCase().includes('processing');
        
        console.log('\n🔴 OpenAI Real-Time WebSocket CLOSED');
        console.log('   Close code:', event.code);
        console.log('   Close reason:', `"${reasonStr}"`);
        console.log('   wasClean:', event.wasClean);
        console.log('   Was audio streaming:', !!this.processor);
        console.log('   Config acknowledged:', this.configAcked);
        
        this.isConnected = false;
        
        // Retry on server errors (unless we've exceeded max retries)
        if (isServerError && this.retryCount < this.maxRetries && !this.reconnectTimer) {
          console.log('🔄 Server error - will retry connection');
          this.handleRetry();
          return;
        }
        
        // Don't retry on normal closure or client errors (unless it's our fault)
        if (event.code === 1000 && !this.configAcked && !this.reconnectTimer) {
          console.warn('   Normal closure before config ack - may indicate config rejection');
        }
      };

    } catch (error) {
      console.error('Error connecting to OpenAI Real-Time API:', error);
      this.config.onError?.(error instanceof Error ? error : new Error('Connection error'));
      throw error;
    }
  }

  /**
   * Send session.update configuration
   */
  private sendSessionUpdate(): void {
    if (this.sessionConfigSent) {
      return; // Don't send twice
    }
    
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn('Cannot send session.update - WebSocket not open');
      return;
    }

    console.log('Configuring OpenAI Real-Time session for transcription...');
    
    // Configure session for transcription-only
    // CRITICAL: When using ?intent=transcription, we must use transcription_session.update (NOT session.update)
    // Reference: https://platform.openai.com/docs/guides/speech-to-text#streaming-the-transcription-of-an-ongoing-audio-recording
    // 
    // Valid models for transcription sessions:
    // - "gpt-4o-mini-transcribe" (fast, cheap - default)
    // - "gpt-4o-transcribe" (higher accuracy)
    // - "whisper-1" (legacy)
    // NOTE: "gpt-4o-realtime-preview" is NOT used here - that's for realtime conversation, not transcription
    let transcriptionModel = this.config.model || TRANSCRIPTION_MODEL.MINI;
    
    // Validate model is a valid transcription model
    const validModels = [TRANSCRIPTION_MODEL.MINI, TRANSCRIPTION_MODEL.STANDARD, TRANSCRIPTION_MODEL.LEGACY];
    if (!validModels.includes(transcriptionModel)) {
      console.error(`❌ ERROR: Invalid transcription model "${transcriptionModel}"`);
      console.error(`   Must be one of: ${validModels.join(', ')}`);
      console.error(`   Using default: ${TRANSCRIPTION_MODEL.MINI}`);
      // Use default instead of invalid model
      transcriptionModel = TRANSCRIPTION_MODEL.MINI;
    } else {
      console.log(`✅ Using transcription model: ${transcriptionModel}`);
    }
    
    // CRITICAL: For transcription sessions (?intent=transcription), fields are at TOP LEVEL
    // Do NOT wrap in "session" - that's only for regular realtime sessions
    // Reference: https://platform.openai.com/docs/guides/speech-to-text#streaming-the-transcription-of-an-ongoing-audio-recording
    const sessionConfig = {
      type: 'transcription_session.update',
      input_audio_format: 'pcm16',
      input_audio_transcription: {
        model: transcriptionModel,
        prompt: '',
        language: 'en'
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 500
      },
      input_audio_noise_reduction: {
        type: 'near_field'
      },
      include: ['item.input_audio_transcription.logprobs']
    };
    
    // DEBUG: Print exact config JSON as required by debugging requirements
    console.log('📋 EXACT transcription_session.update config being sent:');
    console.log(JSON.stringify(sessionConfig, null, 2));
    console.log('📤 Sending transcription_session.update...');
    try {
      this.ws.send(JSON.stringify(sessionConfig));
      this.sessionConfigSent = true;
      console.log('✅ transcription_session.update sent successfully');
    } catch (err) {
      console.error('❌ Error sending session.update:', err);
    }
  }

  /**
   * Start streaming audio to WebSocket in PCM16 format
   */
  private startAudioStreaming(stream: MediaStream): void {
    try {
      // Don't start if already streaming
      if (this.processor) {
        console.log('Audio streaming already started, skipping...');
        return;
      }

      this.mediaStream = stream;
      
      // Log microphone permission and audio track info
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        if (track) {
          const settings = track.getSettings();
          console.log('🎤 Microphone access GRANTED');
          console.log('   Track label:', track.label);
          console.log('   Track enabled:', track.enabled);
          console.log('   Track readyState:', track.readyState);
          console.log('   Sample rate (if available):', settings.sampleRate || 'not reported');
          console.log('   Channel count:', settings.channelCount || 'not reported');
        }
      } else {
        console.error('❌ Microphone access DENIED: No audio tracks found in stream');
        throw new Error('No audio tracks available');
      }
      
      // OpenAI Realtime Transcription requires PCM16 mono audio at 16kHz
      // Create AudioContext at 16kHz - browser will resample mic input automatically
      // However, we verify the actual sample rate and log it for debugging
      this.audioContext = new AudioContext({ sampleRate: 16000 });
      
      const actualSampleRate = this.audioContext.sampleRate;
      console.log('🎤 AudioContext created');
      console.log('   Target sample rate: 16000 Hz');
      console.log('   Actual sample rate:', actualSampleRate, 'Hz');
      
      if (actualSampleRate !== 16000) {
        console.warn('⚠️ WARNING: AudioContext sample rate is', actualSampleRate, 'Hz, not 16kHz');
        console.warn('   Browser may not support 16kHz - audio will be resampled by browser or may fail');
      }
      
      const source = this.audioContext.createMediaStreamSource(stream);
      
      // Use ScriptProcessorNode (deprecated but works reliably)
      // Buffer size: 4096 samples at 16kHz = ~256ms chunks
      // Smaller buffers (2048) = ~128ms chunks for lower latency
      // Larger buffers (8192) = ~512ms chunks for better efficiency
      // We use 4096 as a balance
      const bufferSize = 4096;
      this.processor = this.audioContext.createScriptProcessor(bufferSize, 1, 1);
      
      console.log('   Buffer size:', bufferSize, 'samples');
      console.log('   Chunk duration:', (bufferSize / actualSampleRate * 1000).toFixed(1), 'ms at', actualSampleRate, 'Hz');
      
      let firstAudioChunkSent = false;
      let audioChunkCount = 0;
      let totalAudioBytes = 0;
      let streamingStartedFlag = false;

      this.processor.onaudioprocess = (e) => {
        // CRITICAL: Only send audio after config is acknowledged
        if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN || !this.configAcked) {
          if (!this.configAcked && audioChunkCount === 0) {
            console.warn('⚠️ Audio chunks ready but config not yet acknowledged - waiting...');
          }
          return;
        }

        // Mark streaming as started
        if (!streamingStartedFlag) {
          streamingStartedFlag = true;
          console.log('🎵 Streaming started flag set - audio chunks will now be sent');
        }

        const inputData = e.inputBuffer.getChannelData(0);
        const sampleRate = e.inputBuffer.sampleRate;
        
        // Verify sample rate matches expected (should be 16kHz after browser resampling)
        if (sampleRate !== 16000 && audioChunkCount === 0) {
          console.warn('⚠️ WARNING: Input buffer sample rate is', sampleRate, 'Hz, not 16kHz');
          console.warn('   Browser will need to resample this audio');
        }
        
        // Convert Float32Array (range -1.0 to 1.0) to Int16Array (PCM16, little-endian)
        // PCM16 format: signed 16-bit integers, little-endian byte order
        const int16Array = new Int16Array(inputData.length);
        for (let i = 0; i < inputData.length; i++) {
          // Clamp value to [-1, 1] range to prevent overflow
          const s = Math.max(-1, Math.min(1, inputData[i] ?? 0));
          // Convert to Int16: 
          // - Positive values: multiply by 32767 (0x7FFF)
          // - Negative values: multiply by 32768 (0x8000) but ensure it stays in range
          int16Array[i] = s < 0 ? Math.max(-32768, Math.round(s * 32768)) : Math.min(32767, Math.round(s * 32767));
        }

        // Convert Int16Array to base64-encoded string
        // OpenAI Realtime API expects: { "type": "input_audio_buffer.append", "audio": "<base64 PCM16 data>" }
        // Int16Array is little-endian by default in JavaScript
        const uint8Array = new Uint8Array(int16Array.buffer);
        
        // Convert to binary string for base64 encoding
        // This is more efficient than Array.from().map()
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          const byte = uint8Array[i];
          if (byte !== undefined) {
            binaryString += String.fromCharCode(byte);
          }
        }
        
        const base64Audio = btoa(binaryString);
        const chunkBytes = uint8Array.length;
        
        // Track statistics
        audioChunkCount++;
        totalAudioBytes += chunkBytes;
        
        // DEBUG: Log first audio chunk as required
        if (!firstAudioChunkSent) {
          console.log('\n🎵 FIRST input_audio_buffer.append SENT!');
          console.log('   Audio streaming has started');
          console.log('   Audio chunk size:', int16Array.length, 'samples');
          console.log('   Bytes in chunk:', chunkBytes, 'bytes');
          console.log('   Duration:', (int16Array.length / sampleRate * 1000).toFixed(1), 'ms at', sampleRate, 'Hz');
          console.log('   Base64 length:', base64Audio.length, 'characters');
          console.log('   Input sample rate:', sampleRate, 'Hz');
          console.log('   WS readyState:', this.ws?.readyState, '(should be 1 = OPEN)');
          console.log('   isConnected:', this.isConnected);
          console.log('');
          firstAudioChunkSent = true;
        }
        
        // Log every 50 chunks (approximately every 8.5 seconds at 24kHz with 4096 buffer)
        if (audioChunkCount % 50 === 0 && audioChunkCount > 0) {
          const avgChunkSize = totalAudioBytes / audioChunkCount;
          const totalDuration = (totalAudioBytes / 2 / sampleRate); // Total audio duration in seconds
          console.log(`📊 Audio streaming stats:`);
          console.log(`   Chunks sent: ${audioChunkCount}`);
          console.log(`   Total bytes: ${totalAudioBytes}`);
          console.log(`   Average chunk size: ${avgChunkSize.toFixed(0)} bytes`);
          console.log(`   Total audio duration: ${totalDuration.toFixed(1)}s`);
          console.log(`   WS readyState: ${this.ws?.readyState}`);
        }
        
        try {
          this.ws.send(JSON.stringify({
            type: 'input_audio_buffer.append',
            audio: base64Audio
          }));
        } catch (err) {
          console.error('❌ Error sending audio data:', err);
          console.error('   Chunk count:', audioChunkCount);
          console.error('   WS readyState:', this.ws?.readyState);
        }
      };

      source.connect(this.processor);
      // Connect processor to destination to keep the audio processing graph active
      // This is required for ScriptProcessorNode to work
      this.processor.connect(this.audioContext.destination);

      console.log('✅ OpenAI Real-Time audio streaming started');
      console.log('   Waiting for audio input...');
    } catch (error) {
      console.error('Error starting audio streaming:', error);
      this.config.onError?.(error instanceof Error ? error : new Error('Audio streaming error'));
    }
  }

  /**
   * Handle OpenAI message - decode, log, check for config ack, handle errors
   */
  private handleOpenAIMessage(data: any, _rawText: string): void {
    // Log ALL incoming messages (raw JSON)
    console.log('\n📨 RAW OpenAI message received:');
    console.log(JSON.stringify(data, null, 2));
    
    if (data.type) {
      const eventType = data.type;
      console.log(`📌 Event type: ${eventType}`);
      
      // Log session lifecycle events
      if (eventType === 'transcription_session.created') {
        console.log('✅ transcription_session.created - session is ready');
        console.log('   Session ID:', data.session_id || 'not provided');
        console.log('   input_audio_transcription:', data.input_audio_transcription ? 'configured' : 'null');
      } else if (eventType === 'transcription_session.updated') {
        console.log('✅ transcription_session.updated - config applied');
      }
      
      // Log audio buffer events
      if (eventType === 'input_audio_buffer.committed') {
        console.log('✅ input_audio_buffer.committed - audio chunk processed by server');
      } else if (eventType === 'input_audio_buffer.speech_started') {
        console.log('🎤 input_audio_buffer.speech_started - speech detected');
      } else if (eventType === 'input_audio_buffer.speech_stopped') {
        console.log('🔇 input_audio_buffer.speech_stopped - speech ended');
      }
      
      // Log transcription delta events
      if (eventType.includes('transcript') && eventType.includes('delta')) {
        const delta = data.delta || data.transcript || '';
        console.log(`📝 Transcript delta: "${delta}"`);
        if (delta && this.config.onTranscript) {
          this.config.onTranscript(delta, false);
        }
        return;
      }
      
      // CRITICAL: Check for config acknowledgment
      // Any server event after config indicates the session exists
      if (!this.configAcked && this.sessionConfigSent) {
        if (eventType === 'transcription_session.created' || 
            eventType === 'transcription_session.updated' ||
            eventType === 'session.created' ||
            eventType === 'session.updated') {
          this.configAcked = true;
          console.log('✅ Config acknowledged - safe to start audio streaming');
          
          // Now start audio streaming
          if (this.mediaStream && !this.processor && this.isConnected && this.ws?.readyState === WebSocket.OPEN) {
            console.log('🎉 Starting audio streaming (config acknowledged)...');
            this.startAudioStreaming(this.mediaStream);
          }
        }
      }
      
      // Handle errors with retry logic
      if (eventType === 'error') {
        const errorCode = data.error?.code;
        const errorType = data.error?.type;
        const errorMsg = data.error?.message || 'Unknown error';
        const errorParam = data.error?.param;
        const isServerError = errorType === 'server_error' || errorCode === 'server_error' || 
                             errorMsg.toLowerCase().includes('server') ||
                             errorMsg.toLowerCase().includes('processing');
        
        console.error('\n❌ OPENAI ERROR EVENT:');
        console.error('   Error code:', errorCode);
        console.error('   Error type:', errorType);
        console.error('   Error message:', errorMsg);
        console.error('   Error param:', errorParam);
        console.error('   Session ID:', data.session_id || 'not provided');
        console.error('   Full error object:', JSON.stringify(data, null, 2));
        console.error('');
        
        // Retry on server errors
        if (isServerError && this.retryCount < this.maxRetries) {
          console.log(`🔄 Server error detected - will retry (attempt ${this.retryCount + 1}/${this.maxRetries})`);
          this.handleRetry();
          return;
        }
        
        // Non-retryable errors
        this.config.onError?.(new Error(errorMsg));
        return;
      }
      
      // Handle transcription completion events
      let transcriptText: string | null = null;
      let isFinal = false;
      
      if (eventType === 'conversation.item.input_audio_transcription.completed') {
        transcriptText = data.transcript || data.item?.input_audio_transcription?.transcript || data.transcription?.transcript || data.text;
        isFinal = true;
        console.log('✅ FINAL transcript received (conversation.item.input_audio_transcription.completed):', transcriptText);
      } else if (eventType.includes('transcription.completed') || eventType.includes('transcription.done')) {
        transcriptText = data.transcript || data.text || data.item?.transcript;
        isFinal = true;
        console.log('✅ FINAL transcript received:', transcriptText);
      } else if (eventType === 'transcript.text.done') {
        transcriptText = data.transcript || data.text || '';
        isFinal = true;
        console.log('✅ FINAL transcript received (transcript.text.done):', transcriptText);
      }
      
      // Send final transcript to callback
      if (transcriptText && isFinal && this.config.onTranscript) {
        this.config.onTranscript(transcriptText, true);
      }
    } else {
      // Message without type field
      console.log('📨 OpenAI message without type field:', JSON.stringify(data, null, 2));
    }
  }

  /**
   * Handle retry with exponential backoff
   */
  private handleRetry(): void {
    if (this.retryCount >= this.maxRetries) {
      console.error('❌ Max retries reached - giving up');
      this.config.onError?.(new Error('Max retry attempts exceeded'));
      return;
    }
    
    const delay = this.retryDelays[this.retryCount] || this.retryDelays[this.retryDelays.length - 1];
    console.log(`⏳ Retrying in ${delay}ms... (attempt ${this.retryCount + 1}/${this.maxRetries})`);
    
    this.retryCount++;
    
    // Close current connection
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    
    // Reset state
    this.isConnected = false;
    this.configAcked = false;
    this.sessionConfigSent = false;
    
    // Reconnect after delay
    this.reconnectTimer = setTimeout(() => {
      if (this.mediaStream) {
        console.log('🔄 Reconnecting...');
        this.connect(this.mediaStream).catch((err) => {
          console.error('❌ Reconnect failed:', err);
        });
      }
    }, delay);
  }

  /**
   * Disconnect and cleanup
   * CRITICAL: Only call this on explicit "Stop" action, not on React dev lifecycle
   */
  disconnect(): void {
    console.log('\n🛑 Disconnecting OpenAI Real-Time client (explicit disconnect)...');
    console.log('   Current state:', {
      hasProcessor: !!this.processor,
      hasAudioContext: !!this.audioContext,
      hasWs: !!this.ws,
      wsReadyState: this.ws?.readyState,
      isConnected: this.isConnected
    });

    if (this.processor) {
      try {
        this.processor.disconnect();
      } catch (err) {
        console.warn('   Error disconnecting processor:', err);
      }
      this.processor = null;
    }

    if (this.audioContext) {
      try {
        this.audioContext.close();
      } catch (err) {
        console.warn('   Error closing audio context:', err);
      }
      this.audioContext = null;
    }

    if (this.ws) {
      // Only close if not already closed/closing
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        console.log('   Closing WebSocket (code 1000, normal closure)');
        this.ws.close(1000, 'Client disconnecting');
      } else {
        console.log('   WebSocket already closed/closing (state:', this.ws.readyState, ')');
      }
      this.ws = null;
    }

    this.isConnected = false;
    this.sessionConfigSent = false;
    this.configAcked = false;
    
    // Clear retry timer if active
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    console.log('✅ OpenAI Real-Time disconnected and cleaned up\n');
  }

  /**
   * Check if connected
   */
  isConnectedToService(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }
}
