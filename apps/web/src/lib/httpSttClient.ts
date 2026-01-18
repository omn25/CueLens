/**
 * HTTP-based STT client (fallback for when Realtime WebSocket is unreliable)
 * 
 * Uses MediaRecorder API to record audio in chunks (2-3 seconds)
 * Uploads each chunk to POST /stt/chunk for transcription
 * Treats each HTTP response as FINAL transcript for suggestion engine
 */

export interface HTTPSTTConfig {
  onTranscript?: (text: string) => void;
  onError?: (error: Error) => void;
  chunkDurationMs?: number; // Default: 2500ms (2.5 seconds)
}

export class HTTPSTTClient {
  private mediaRecorder: MediaRecorder | null = null;
  private mediaStream: MediaStream | null = null;
  private config: HTTPSTTConfig;
  private isRecording = false;
  private chunkDuration: number;
  private apiBaseUrl: string;
  private captureFrameCallback?: () => string | null | undefined; // Callback to capture webcam frame
  
  // Burst recording: collect parts from ondataavailable, create blob on stop
  private parts: BlobPart[] = [];
  private mimeType: string = '';
  private burstTimer: ReturnType<typeof setInterval> | null = null;

  constructor(config: HTTPSTTConfig) {
    this.config = config;
    this.chunkDuration = config.chunkDurationMs || 2500; // 2.5 seconds default
    this.apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
  }

  /**
   * Set callback for capturing webcam frames (for evidence.frameAssetId)
   */
  setFrameCaptureCallback(callback: () => string | null) {
    this.captureFrameCallback = callback;
  }

  /**
   * Start HTTP-based transcription
   */
  async start(audioStream: MediaStream): Promise<void> {
    if (this.isRecording) {
      console.warn('⚠️ HTTP STT already recording');
      return;
    }

    this.mediaStream = audioStream;

    // Check MediaRecorder support
    if (!window.MediaRecorder) {
      throw new Error('MediaRecorder API not supported in this browser');
    }

    // Get supported MIME types (Chrome usually supports audio/webm)
    const supportedTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/wav',
    ];

    this.mimeType = supportedTypes.find(type => MediaRecorder.isTypeSupported(type)) || '';
    if (!this.mimeType) {
      console.warn('⚠️ No preferred MIME type found, using browser default');
    }

    console.log(`🎤 Starting HTTP STT with MediaRecorder (burst recording)`);
    console.log(`   MIME type: ${this.mimeType || 'browser default'}`);
    console.log(`   Burst duration: ${this.chunkDuration}ms`);

    try {
      // Create MediaRecorder
      const options: MediaRecorderOptions = {
        mimeType: this.mimeType || undefined,
        audioBitsPerSecond: 128000, // Good quality for speech
      };

      this.mediaRecorder = new MediaRecorder(audioStream, options);

      // Collect all data parts from ondataavailable
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          this.parts.push(event.data);
          console.log(`🎵 Data part collected: ${event.data.size} bytes (total parts: ${this.parts.length})`);
        }
      };

      // On stop: create complete blob and upload, then restart
      this.mediaRecorder.onstop = async () => {
        if (this.parts.length === 0) {
          console.warn('⚠️ No data parts collected on stop');
          // Restart if still recording
          if (this.isRecording && this.mediaRecorder && this.mediaStream) {
            this.parts = [];
            this.mediaRecorder.start();
          }
          return;
        }

        // Create complete container blob from all parts
        const actualMimeType = (this.mediaRecorder?.mimeType) || this.mimeType || 'audio/webm';
        const blob = new Blob(this.parts, { type: actualMimeType });
        
        console.log(`📦 Burst complete: ${this.parts.length} parts, ${blob.size} bytes total`);
        console.log(`   Blob type: ${blob.type}`);
        
        // Clear parts for next burst
        this.parts = [];

        // Upload the complete blob
        await this.processAudioChunk(blob, actualMimeType);

        // Restart recording if still active
        if (this.isRecording && this.mediaRecorder && this.mediaStream) {
          try {
            this.mediaRecorder.start();
            console.log('🔄 Burst recording restarted');
          } catch (err) {
            console.error('❌ Failed to restart recording:', err);
            this.config.onError?.(new Error('Failed to restart recording'));
          }
        }
      };

      // Handle errors
      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event);
        this.config.onError?.(new Error('MediaRecorder error'));
      };

      // Start recording WITHOUT timeslice - we'll stop/restart for bursts
      this.mediaRecorder.start();
      this.isRecording = true;
      this.parts = [];

      // Set up burst timer: stop recorder every chunkDurationMs
      this.burstTimer = setInterval(() => {
        if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
          console.log(`⏱️ Burst timer: stopping recorder to create complete file...`);
          this.mediaRecorder.stop();
        }
      }, this.chunkDuration);

      console.log('✅ HTTP STT burst recording started');
    } catch (error) {
      console.error('❌ Failed to start HTTP STT:', error);
      this.config.onError?.(error instanceof Error ? error : new Error('Failed to start recording'));
      throw error;
    }
  }


  /**
   * Process an audio chunk: send Blob via multipart/form-data to /stt/chunk, handle transcript
   */
  private async processAudioChunk(audioBlob: Blob, mimeType: string): Promise<void> {
    try {
      // Log blob details for debugging
      const blobType = audioBlob.type || mimeType;
      console.log(`📤 Sending audio chunk to /stt/chunk:`);
      console.log(`   Size: ${audioBlob.size} bytes`);
      console.log(`   Type: ${blobType}`);

      // Create FormData and append the Blob directly
      const formData = new FormData();
      // Determine filename extension from mimeType
      let extension = 'webm';
      if (blobType.includes('webm')) {
        extension = 'webm';
      } else if (blobType.includes('wav')) {
        extension = 'wav';
      } else if (blobType.includes('ogg')) {
        extension = 'ogg';
      } else if (blobType.includes('mp3')) {
        extension = 'mp3';
      }
      formData.append('file', audioBlob, `chunk.${extension}`);

      // Send to backend STT endpoint via multipart/form-data
      const response = await fetch(`${this.apiBaseUrl}/stt/chunk`, {
        method: 'POST',
        body: formData, // Don't set Content-Type header - browser will set it with boundary
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`❌ STT chunk transcription failed: ${response.status} ${errorText}`);
        this.config.onError?.(new Error(`STT transcription failed: ${errorText}`));
        return;
      }

      const result = await response.json();
      const transcriptText = result.text || '';

      if (transcriptText.trim()) {
        console.log(`✅ HTTP STT transcript: "${transcriptText}"`);

        // Call transcript callback
        if (this.config.onTranscript) {
          this.config.onTranscript(transcriptText);
        }

        // Send to suggestion engine via /transcript endpoint
        await this.sendToSuggestionEngine(transcriptText);
      }
    } catch (error) {
      console.error('❌ Error processing audio chunk:', error);
      this.config.onError?.(error instanceof Error ? error : new Error('Chunk processing error'));
    }
  }

  /**
   * Send transcript to suggestion engine (/transcript endpoint)
   */
  private async sendToSuggestionEngine(transcript: string): Promise<void> {
    try {
      // Capture webcam frame if callback is available
      let frameAssetId: string | undefined = undefined;
      if (this.captureFrameCallback) {
        const frameBase64 = this.captureFrameCallback();
        if (frameBase64) {
          // Upload frame to get frameAssetId
          try {
            const frameResponse = await fetch(`${this.apiBaseUrl}/frames`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                image: frameBase64,
              }),
            });

            if (frameResponse.ok) {
              const frameData = await frameResponse.json();
              frameAssetId = frameData.frameAssetId;
            }
          } catch (err) {
            console.warn('⚠️ Failed to upload frame, continuing without it:', err);
          }
        }
      }

      // Send transcript to suggestion engine
      const response = await fetch(`${this.apiBaseUrl}/transcript`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcript,
          visionEventId: `http_stt_${Date.now()}`,
          frameAssetId,
        }),
      });

      if (response.ok) {
        const suggestions = await response.json();
        if (suggestions.length > 0) {
          console.log(`✅ Backend created ${suggestions.length} suggestion(s) from HTTP STT transcript`);
        }
      } else {
        const errorText = await response.text();
        console.error('❌ Failed to process transcript:', response.status, errorText);
      }
    } catch (err) {
      console.error('❌ Error sending transcript to suggestion engine:', err);
    }
  }


  /**
   * Stop recording
   */
  stop(): void {
    // Clear burst timer
    if (this.burstTimer) {
      clearInterval(this.burstTimer);
      this.burstTimer = null;
    }
    
    // Stop recorder (this will trigger onstop and upload final blob)
    if (this.mediaRecorder && this.isRecording) {
      if (this.mediaRecorder.state === 'recording') {
        console.log('🛑 Stopping recorder - will upload final burst...');
        this.mediaRecorder.stop();
      }
      this.isRecording = false;
    }

    if (this.mediaStream) {
      // Don't stop tracks - they might be used by other components
      // this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    
    // Reset state
    this.parts = [];
    this.mimeType = '';
    
    console.log('🛑 HTTP STT recording stopped');
  }

  /**
   * Check if currently recording
   */
  isActive(): boolean {
    return this.isRecording;
  }
}
