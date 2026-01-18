/**
 * Capture a frame from a video element and convert to base64
 */
export function captureFrameFromVideo(videoElement: HTMLVideoElement): string | null {
  try {
    if (videoElement.readyState < 2) {
      console.warn('Video element not ready for frame capture');
      return null;
    }

    const canvas = document.createElement('canvas');
    canvas.width = videoElement.videoWidth;
    canvas.height = videoElement.videoHeight;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('Could not get canvas context');
      return null;
    }

    // Draw the video frame to canvas
    // Note: Video element is visually mirrored (scaleX(-1)), but the actual video stream is not mirrored
    // So we just draw it directly - the captured frame will be in original orientation
    ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

    // Convert to base64
    const base64 = canvas.toDataURL('image/jpeg', 0.8);
    return base64;
  } catch (error) {
    console.error('Error capturing frame:', error);
    return null;
  }
}

/**
 * Upload a frame (base64) to the backend and get frameAssetId
 */
export async function uploadFrame(
  base64Frame: string,
  apiBaseUrl: string = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001'
): Promise<string | null> {
  try {
    const response = await fetch(`${apiBaseUrl}/frames`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ image: base64Frame }),
    });

    if (!response.ok) {
      throw new Error(`Failed to upload frame: ${response.statusText}`);
    }

    const data = await response.json();
    return data.frameAssetId || null;
  } catch (error) {
    console.error('Error uploading frame:', error);
    // For MVP, return base64 as fallback if upload fails
    return base64Frame;
  }
}
