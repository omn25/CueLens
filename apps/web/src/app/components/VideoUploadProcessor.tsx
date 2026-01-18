'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { aggregateObservations } from '@/lib/roomAggregation';
import { analyzeFrameWithOpenAI } from '@/lib/openaiVision';
import OpenAIKeyInput from './OpenAIKeyInput';
import type { RoomObservation } from '@/types/room';

interface VideoUploadProcessorProps {
  onComplete: (observations: RoomObservation[], aggregated: RoomObservation) => void;
  onCancel: () => void;
}

export default function VideoUploadProcessor({ onComplete, onCancel }: VideoUploadProcessorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [openAIKey, setOpenAIKey] = useState<string>('');
  const [showKeyInput, setShowKeyInput] = useState(false);

  // Load API key from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('OPENAI_API_KEY');
      if (savedKey) {
        setOpenAIKey(savedKey);
        setShowKeyInput(false);
      } else {
        // Show key input if no key is saved
        setShowKeyInput(true);
      }
    }
  }, []);

  // Update openAIKey when it's saved
  const handleSaveAPIKey = (key: string) => {
    setOpenAIKey(key);
    setShowKeyInput(false);
    setError(null); // Clear any errors
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file (JPEG, PNG, etc.)');
      return;
    }

    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    setError(null);
  };

  const loadImageToCanvas = useCallback(async (
    imageUrl: string,
    canvas: HTMLCanvasElement
  ): Promise<void> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      
      img.onload = () => {
        // Set canvas dimensions to match image
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Draw image to canvas
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }
        
        ctx.drawImage(img, 0, 0);
        resolve();
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageUrl;
    });
  }, []);

  const getOpenAIKey = useCallback((): string => {
    // Check localStorage first (most reliable)
    if (typeof window !== 'undefined') {
      const savedKey = localStorage.getItem('OPENAI_API_KEY');
      if (savedKey && savedKey.trim()) {
        return savedKey.trim();
      }
    }
    // Check window variable (for current session)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (typeof window !== 'undefined' && (window as any).__OPENAI_API_KEY__) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const windowKey = (window as any).__OPENAI_API_KEY__;
      if (windowKey && windowKey.trim()) {
        return windowKey.trim();
      }
    }
    // Fall back to state
    if (openAIKey && openAIKey.trim()) {
      return openAIKey.trim();
    }
    return '';
  }, [openAIKey]);

  const processImageWithOpenAI = useCallback(async (
    canvas: HTMLCanvasElement
  ): Promise<RoomObservation> => {
    console.log('[VideoUploadProcessor] Processing image with OpenAI...');

    // Get OpenAI API key
    const apiKey = getOpenAIKey();
    if (!apiKey || apiKey.trim() === '') {
      throw new Error('OpenAI API key not configured. Please enter your API key above.');
    }

    // Convert canvas to base64 image
    const imageBase64 = canvas.toDataURL('image/jpeg', 0.95);
    console.log('[VideoUploadProcessor] Image converted to base64:', Math.round(imageBase64.length / 1024), 'KB');

    // Analyze image with OpenAI
    console.log('[VideoUploadProcessor] Sending to OpenAI Vision API...');
    setCurrentStep('Analyzing image with OpenAI...');
    
    const observation = await analyzeFrameWithOpenAI(imageBase64, apiKey);
    
    console.log('[VideoUploadProcessor] ✅ Got observation from OpenAI:', {
      room_type: observation.room_type,
      furniture_count: observation.fixed_elements.major_furniture.length,
      markers_count: observation.distinctive_markers.length,
    });

    return observation;
  }, [getOpenAIKey]);

  const processImage = async () => {
    console.log('[VideoUploadProcessor] ========== processImage() called ==========');
    console.log('[VideoUploadProcessor] State check:', {
      hasImageFile: !!imageFile,
      hasImageUrl: !!imageUrl,
      hasCanvasRef: !!canvasRef.current,
    });

    if (!imageFile || !imageUrl || !canvasRef.current) {
      const errorMsg = 'Missing image file or elements. Please select an image and try again.';
      console.error('[VideoUploadProcessor] Missing elements:', {
        imageFile: !!imageFile,
        imageUrl: !!imageUrl,
        canvasRef: !!canvasRef.current,
      });
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    try {
      setIsProcessing(true);
      setError(null);
      setProgress(0);

      // Check for API key
      const apiKey = getOpenAIKey();
      if (!apiKey || apiKey.trim() === '') {
        const errorMsg = 'Please enter your OpenAI API key above before processing.';
        console.error('[VideoUploadProcessor] No API key');
        setError(errorMsg);
        setIsProcessing(false);
        setShowKeyInput(true);
        throw new Error(errorMsg);
      }

      console.log('[VideoUploadProcessor] ✅ Starting image processing with OpenAI...');
      console.log('[VideoUploadProcessor] Image file:', {
        name: imageFile.name,
        size: imageFile.size,
        type: imageFile.type,
      });

      setProgress(10);
      setCurrentStep('Loading image to canvas...');
      
      const canvas = canvasRef.current;
      
      // Load image to canvas
      console.log('[VideoUploadProcessor] Loading image to canvas...');
      await loadImageToCanvas(imageUrl, canvas);
      console.log('[VideoUploadProcessor] ✅ Image loaded to canvas');
      
      setProgress(30);
      setCurrentStep('Analyzing image with OpenAI...');
      
      // Process image with OpenAI (single observation)
      const observation = await processImageWithOpenAI(canvas);
      
      if (!observation) {
        throw new Error('Failed to get observation from OpenAI');
      }
      
      // Wrap single observation in an array (since onComplete expects an array)
      const observations: RoomObservation[] = [observation];
      
      console.log('[VideoUploadProcessor] ========== Finished processing ==========');
      console.log('[VideoUploadProcessor] Observation:', {
        room_type: observation.room_type,
        furniture_count: observation.fixed_elements.major_furniture.length,
        markers_count: observation.distinctive_markers.length,
      });

      setProgress(90);
      setCurrentStep('Preparing data...');
      
      // Aggregate observations (even though we only have one, this ensures consistency)
      const aggregated = aggregateObservations(observations);
      console.log('[VideoUploadProcessor] ========== ✅ AGGREGATED JSON ==========');
      console.log(JSON.stringify(aggregated, null, 2));
      console.log('[VideoUploadProcessor] ========================================');

      setProgress(100);
      setCurrentStep('Complete! Navigating to review page...');
      
      // Small delay to show completion message
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      // CRITICAL: Navigate to review page by calling onComplete
      console.log('[VideoUploadProcessor] ✅ Processing complete! Calling onComplete callback...');
      console.log('[VideoUploadProcessor] Observations count:', observations.length);
      console.log('[VideoUploadProcessor] Aggregated room type:', aggregated.room_type);
      
      try {
        // Call the onComplete callback - this should trigger navigation to review page
        onComplete(observations, aggregated);
        console.log('[VideoUploadProcessor] ✅ onComplete callback called successfully');
        
        // Set processing to false AFTER calling onComplete
        setIsProcessing(false);
      } catch (callbackError) {
        console.error('[VideoUploadProcessor] ❌ Error calling onComplete:', callbackError);
        setError(`Failed to navigate to review page: ${callbackError instanceof Error ? callbackError.message : 'Unknown error'}`);
        setIsProcessing(false);
      }
    } catch (err) {
      console.error('[VideoUploadProcessor] Error processing image:', err);
      setError(err instanceof Error ? err.message : 'Failed to process image');
      setIsProcessing(false);
    }
  };

  const handleReset = () => {
    if (imageUrl) {
      URL.revokeObjectURL(imageUrl);
      setImageUrl(null);
    }
    setImageFile(null);
    setError(null);
    setProgress(0);
    setCurrentStep('');
  };


  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center p-8">
      {/* Hidden canvas for processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Upload/Processing UI */}
      <div className="max-w-2xl w-full space-y-6">
        {/* OpenAI API Key Input */}
        {(showKeyInput || !openAIKey) && !isProcessing && (
          <div className="bg-white dark:bg-slate-800 rounded-xl p-6 border border-slate-200 dark:border-slate-700 shadow-lg">
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">
              OpenAI API Key
            </h3>
            <OpenAIKeyInput 
              onSave={handleSaveAPIKey} 
              initialKey={openAIKey}
            />
            <button
              onClick={() => setShowKeyInput(false)}
              className="mt-4 text-sm text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300"
            >
              I&apos;ll enter it later
            </button>
          </div>
        )}

        {/* API Key Status */}
        {openAIKey && !showKeyInput && !isProcessing && (
          <div className="flex items-center justify-between bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-emerald-500 text-lg">check_circle</span>
              <span className="text-sm text-slate-700 dark:text-slate-300">
                OpenAI API key configured
              </span>
            </div>
            <button
              onClick={() => setShowKeyInput(true)}
              className="text-xs text-primary hover:text-primary/80 font-semibold"
            >
              Change
            </button>
          </div>
        )}

        {/* File Upload */}
        {!imageFile && !isProcessing && (
          <div className="border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-12 text-center hover:border-primary/50 transition-colors">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <div className="flex flex-col items-center gap-4">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="material-symbols-outlined text-primary text-4xl">image</span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                  Upload Room Image
                </h3>
                <p className="text-slate-600 dark:text-slate-400 mb-4">
                  Upload an image of the room. We&apos;ll analyze it with OpenAI Vision API.
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-primary hover:bg-primary/90 text-white font-semibold rounded-lg transition-all"
                >
                  Choose Image File
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Image Preview */}
        {imageFile && imageUrl && !isProcessing && (
          <div className="space-y-4">
            <div className="relative rounded-xl overflow-hidden bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Room preview"
                className="w-full max-h-96 object-contain"
                onLoad={() => {
                  console.log('[VideoUploadProcessor] Image loaded successfully');
                  setError(null);
                }}
                onError={() => {
                  console.error('[VideoUploadProcessor] Image failed to load');
                  setError('Failed to load image. Please try a different file.');
                }}
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-4">
                <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
              </div>
            )}

            <div className="flex items-center gap-3">
              <button
                onClick={handleReset}
                className="px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-all"
              >
                    Choose Different Image
              </button>
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  console.log('[VideoUploadProcessor] ========== Process Image Button Clicked ==========');
                  
                  // Check for API key before processing
                  const apiKey = getOpenAIKey();
                  console.log('[VideoUploadProcessor] API key check:', {
                    hasKey: !!apiKey,
                    keyLength: apiKey?.length || 0,
                    keyPrefix: apiKey?.substring(0, 7) || 'none',
                  });
                  
                  if (!apiKey || apiKey.trim() === '') {
                    const errorMsg = 'Please enter your OpenAI API key above before processing.';
                    console.error('[VideoUploadProcessor] Missing API key');
                    setError(errorMsg);
                    setShowKeyInput(true);
                    alert(errorMsg);
                    return;
                  }
                  
                  // Check image file
                  if (!imageFile || !imageUrl) {
                    const errorMsg = 'Please select an image file first.';
                    console.error('[VideoUploadProcessor] No image file selected');
                    setError(errorMsg);
                    alert(errorMsg);
                    return;
                  }
                  
                  console.log('[VideoUploadProcessor] ✅ All checks passed! Starting processImage...');
                  
                  try {
                    await processImage();
                    console.log('[VideoUploadProcessor] ✅ processImage completed successfully');
                  } catch (err) {
                    console.error('[VideoUploadProcessor] ❌ Error in processImage:', err);
                    const errorMsg = err instanceof Error ? err.message : 'Failed to process image';
                    setError(errorMsg);
                    alert(`Error: ${errorMsg}`);
                  }
                }}
                disabled={(() => {
                  // Don't disable if currently processing - user should be able to see the processing state
                  if (isProcessing) {
                    return true;
                  }
                  
                  const apiKey = getOpenAIKey();
                  const hasApiKey = !!apiKey && apiKey.trim().length > 0;
                  const hasImage = !!imageFile && !!imageUrl;
                  
                  const disabled = !hasImage || !hasApiKey;
                  
                  // Always log the state
                  console.log('[VideoUploadProcessor] Process button state:', {
                    isProcessing,
                    hasApiKey,
                    hasImage,
                    imageFile: !!imageFile,
                    imageUrl: !!imageUrl,
                    disabled,
                  });
                  
                  return disabled;
                })()}
                className="flex-1 px-6 py-3 rounded-lg bg-primary hover:bg-primary/90 disabled:bg-slate-200 disabled:dark:bg-slate-700 disabled:text-slate-400 disabled:dark:text-slate-500 text-white font-bold transition-all disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <span className="material-symbols-outlined">play_arrow</span>
                {isProcessing ? 'Processing...' : 'Process Image'}
              </button>
            </div>
          </div>
        )}

        {/* Navigation to review page happens automatically via onComplete callback */}

        {/* Processing State */}
        {isProcessing && (
          <div className="space-y-4">
            <div className="bg-slate-50 dark:bg-card-dark/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700">
              <div className="flex items-center gap-4 mb-4">
                <div className="size-12 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white mb-1">
                    Processing Image...
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">{currentStep}</p>
                </div>
                <span className="text-primary font-bold">{Math.round(progress)}%</span>
              </div>

              {/* Progress Bar */}
              <div className="h-2 w-full bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden mb-4">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>

            <button
              onClick={() => {
                handleReset();
                setIsProcessing(false);
              }}
              className="w-full px-6 py-3 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold transition-all"
            >
              Cancel Processing
            </button>
          </div>
        )}

        {/* Cancel Button */}
        {!isProcessing && imageFile && (
          <button
            onClick={onCancel}
            className="w-full px-6 py-3 rounded-lg bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 font-semibold transition-all"
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
