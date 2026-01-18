import type { Request, Response } from "express";
import multer from "multer";
import { createReadStream, unlinkSync, existsSync, readFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { execFile } from "child_process";
import { promisify } from "util";
import OpenAI from "openai";

const execFileAsync = promisify(execFile);

/**
 * POST /stt/chunk
 * HTTP STT endpoint using OpenAI Audio Transcriptions API
 * 
 * Accepts audio file upload via multipart/form-data with 'file' field
 * Returns transcribed text: { text: string }
 * Then frontend calls /transcript to create suggestions
 */

/**
 * Get file extension from mimetype
 */
function getExtensionFromMimeType(mimetype: string): string {
  if (mimetype.includes('webm')) return 'webm';
  if (mimetype.includes('wav')) return 'wav';
  if (mimetype.includes('ogg')) return 'ogg';
  if (mimetype.includes('mp3')) return 'mp3';
  if (mimetype.includes('mpeg')) return 'mp3';
  if (mimetype.includes('mp4')) return 'm4a';
  if (mimetype.includes('m4a')) return 'm4a';
  return 'webm'; // default
}

// Configure multer for disk storage (avoids memory spikes with larger files)
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, tmpdir());
    },
    filename: (_req, file, cb) => {
      const extension = getExtensionFromMimeType(file.mimetype);
      const filename = `stt_${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
      cb(null, filename);
    },
  }),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max (reasonable for audio chunks)
  },
  fileFilter: (_req, file, cb) => {
    // Accept audio files
    if (file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only audio files are allowed'));
    }
  },
});

// Store last chunk for debug endpoint
let lastChunkPath: string | null = null;

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Validate WebM/Matroska file has EBML header
 * Returns true if valid, false otherwise
 */
function validateWebmHeader(filePath: string): boolean {
  try {
    const header = readFileSync(filePath).subarray(0, 4);
    // Valid EBML header: 1A 45 DF A3
    const isEbml = header[0] === 0x1a && header[1] === 0x45 && header[2] === 0xdf && header[3] === 0xa3;
    
    // Log first 16 bytes as hex for debugging
    const first16 = readFileSync(filePath).subarray(0, 16);
    const hexString = Array.from(first16).map(b => b.toString(16).padStart(2, '0')).join(' ');
    console.log(`   First 16 bytes (hex): ${hexString}`);
    
    return isEbml;
  } catch (error) {
    console.error('❌ Error reading file header:', error);
    return false;
  }
}

/**
 * Convert audio file to WAV format using ffmpeg
 * Returns path to converted WAV file, or throws error if conversion fails
 */
async function convertToWav(inputPath: string, outputPath: string, timeoutMs: number = 10000): Promise<string> {
  // Check if ffmpeg is available
  try {
    await execFileAsync('ffmpeg', ['-version'], { timeout: 2000 });
  } catch {
    throw new Error('ffmpeg not found in PATH');
  }

  // Convert to WAV: 16kHz mono PCM16
  // -y: overwrite output file
  // -hide_banner: suppress banner output
  // -loglevel error: only show errors
  // -fflags +genpts: generate presentation timestamps
  // -i: input file
  // -vn: no video
  // -ac 1: mono (1 audio channel)
  // -ar 16000: sample rate 16kHz
  // -c:a pcm_s16le: PCM signed 16-bit little-endian audio codec
  // -f wav: output format WAV
  try {
    await execFileAsync(
      'ffmpeg',
      [
        '-y',
        '-hide_banner',
        '-loglevel', 'error',
        '-fflags', '+genpts',
        '-i', inputPath,
        '-vn',
        '-ac', '1',
        '-ar', '16000',
        '-c:a', 'pcm_s16le',
        '-f', 'wav',
        outputPath
      ],
      { timeout: timeoutMs }
    );

    // Verify output file exists and has content
    if (existsSync(outputPath)) {
      const fs = await import('fs');
      const stats = fs.statSync(outputPath);
      if (stats.size > 0) {
        console.log(`✅ Converted to WAV: ${stats.size} bytes`);
        return outputPath;
      }
    }

    throw new Error('ffmpeg conversion produced empty file');
  } catch (error: any) {
    // Log stderr if available
    if (error.stderr) {
      console.error('❌ ffmpeg stderr:', error.stderr.toString());
    }
    throw new Error(`ffmpeg conversion failed: ${error.message || error}`);
  }
}

/**
 * Main STT chunk handler
 */
export async function sttChunkHandler(req: Request, res: Response) {
  let tempFilePath: string | null = null;
  let wavFilePath: string | null = null;
  let fileToTranscribe: string | null = null;

  try {
    // Check for API key (OpenAI SDK will also check, but fail early for better error)
    if (!process.env.OPENAI_API_KEY) {
      console.error("❌ OPENAI_API_KEY not found in environment");
      res.status(500).json({ error: "OpenAI API key not configured" });
      return;
    }

    // Check if file was uploaded
    const file = (req as Request & { file?: Express.Multer.File }).file;
    if (!file) {
      console.error("❌ No audio file received");
      res.status(400).json({ 
        error: "No audio file provided. Send multipart/form-data with 'file' field" 
      });
      return;
    }

    // Log file details
    console.log(`📤 Received audio file: ${file.size} bytes, type: ${file.mimetype}, originalname: ${file.originalname}`);

    // Validate file size (must be > 10KB for valid audio)
    const MIN_FILE_SIZE = 10 * 1024; // 10KB
    if (file.size === 0) {
      console.error("❌ Empty audio file received");
      res.status(400).json({ error: "Audio file is empty" });
      return;
    }
    if (file.size < MIN_FILE_SIZE) {
      console.error(`❌ Audio file too small: ${file.size} bytes (minimum: ${MIN_FILE_SIZE} bytes)`);
      res.status(400).json({ 
        error: `Audio file too small (${file.size} bytes). Minimum size: ${MIN_FILE_SIZE} bytes. Buffer more audio before sending.` 
      });
      return;
    }

    // File is already saved to disk by multer.diskStorage
    tempFilePath = file.path;
    console.log(`💾 Audio file saved to: ${tempFilePath}`);

    // Store for debug endpoint
    if (lastChunkPath) {
      try {
        unlinkSync(lastChunkPath);
      } catch (e) {
        // Ignore errors deleting old debug file
      }
    }
    lastChunkPath = tempFilePath;

    // Validate WebM/Matroska files have EBML header
    const needsConversion = file.mimetype.includes('webm') || file.mimetype.includes('ogg');
    
    if (needsConversion) {
      console.log(`🔍 Validating WebM container (EBML header check)...`);
      const isValidWebm = validateWebmHeader(tempFilePath);
      
      if (!isValidWebm) {
        console.error('❌ Invalid WebM container: missing EBML header');
        console.error('   This usually means MediaRecorder timeslice fragments were uploaded.');
        console.error('   Fix: Use stop/restart burst recording instead of timeslice chunks.');
        
        // Clean up temp file
        try {
          if (tempFilePath && existsSync(tempFilePath)) {
            unlinkSync(tempFilePath);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        
        res.status(400).json({ 
          error: "Invalid WebM container (missing EBML header). Use stop/restart chunking on MediaRecorder, not timeslice fragments." 
        });
        return;
      }
      
      console.log('✅ WebM container valid (EBML header present)');
      
      // Convert to WAV
      const wavFilename = tempFilePath.replace(/\.[^.]+$/, '.wav');
      console.log(`🔄 Converting ${file.mimetype} to WAV (16kHz mono PCM16)...`);
      
      try {
        const convertedPath = await convertToWav(tempFilePath, wavFilename, 10000);
        wavFilePath = convertedPath;
        fileToTranscribe = convertedPath;
        console.log(`✅ Using converted WAV file: ${wavFilePath}`);
      } catch (conversionError: any) {
        console.error('❌ ffmpeg conversion failed:', conversionError.message);
        
        // Clean up temp files
        try {
          if (tempFilePath && existsSync(tempFilePath)) {
            unlinkSync(tempFilePath);
          }
          if (wavFilePath && existsSync(wavFilePath)) {
            unlinkSync(wavFilePath);
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        
        res.status(400).json({ 
          error: `Audio conversion failed: ${conversionError.message}. File may be corrupted.` 
        });
        return;
      }
    } else {
      // Already WAV or other format - use as-is
      fileToTranscribe = tempFilePath;
    }

    // Call OpenAI Audio Transcriptions API using Node SDK
    const transcriptionModel = "gpt-4o-mini-transcribe";
    console.log(`🎤 Transcribing audio: ${file.size} bytes (original), model: ${transcriptionModel}`);

    try {
      // Use OpenAI SDK with createReadStream - this handles multipart correctly
      const transcription = await openai.audio.transcriptions.create({
        file: createReadStream(fileToTranscribe),
        model: transcriptionModel,
        language: "en",
        response_format: "text",
      });

      const text = typeof transcription === "string" ? transcription : transcription.text || "";
      console.log(`✅ Transcription successful: "${text}"`);
      
      // Clean up temp files
      try {
        if (tempFilePath && existsSync(tempFilePath)) {
          unlinkSync(tempFilePath);
        }
        if (wavFilePath && existsSync(wavFilePath)) {
          unlinkSync(wavFilePath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      res.json({ text });
      return;
    } catch (error: any) {
      console.error(`❌ OpenAI transcription failed:`, error);
      
      // Clean up temp files
      try {
        if (tempFilePath && existsSync(tempFilePath)) {
          unlinkSync(tempFilePath);
        }
        if (wavFilePath && existsSync(wavFilePath)) {
          unlinkSync(wavFilePath);
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      const errorMessage = error?.message || "OpenAI transcription failed";
      res.status(500).json({ error: errorMessage });
      return;
    }
  } catch (err) {
    console.error("❌ Error in STT chunk handler:", err);
    
    // Clean up temp files on error
    try {
      if (tempFilePath && existsSync(tempFilePath)) {
        unlinkSync(tempFilePath);
      }
      if (wavFilePath && existsSync(wavFilePath)) {
        unlinkSync(wavFilePath);
      }
    } catch (e) {
      // Ignore cleanup errors
    }
    
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
}

/**
 * Debug endpoint: GET /stt/debug
 * Saves the last received chunk to a known location for testing
 */
export async function sttDebugHandler(_req: Request, res: Response) {
  try {
    if (!lastChunkPath) {
      res.status(404).json({ error: "No chunk received yet" });
      return;
    }

    // Copy to a known debug location
    const debugPath = join(tmpdir(), 'stt_debug_last_chunk.webm');
    const fs = await import('fs');
    fs.copyFileSync(lastChunkPath, debugPath);

    res.json({ 
      message: "Last chunk saved to debug location",
      path: debugPath,
      size: fs.statSync(debugPath).size,
    });
  } catch (err) {
    console.error("❌ Error in STT debug handler:", err);
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    res.status(500).json({ error: errorMessage });
  }
}

// Export multer middleware for use in route registration
export const sttUploadMiddleware = upload.single('file');
