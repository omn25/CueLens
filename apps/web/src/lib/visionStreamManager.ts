/**
 * Global Vision Stream Manager
 * Enforces a maximum of 1 concurrent Overshoot vision stream
 */
class VisionStreamManager {
  private activeStreams = new Set<string>();
  private readonly MAX_STREAMS = 1; // Maximum 1 concurrent stream
  private waitQueue: Array<{ id: string; resolve: () => void }> = [];

  /**
   * Request permission to start a vision stream
   * @param streamId Unique identifier for the stream
   * @returns Promise that resolves when the stream can start
   */
  async requestStream(streamId: string): Promise<void> {
    console.log(`[VisionStreamManager] Requesting stream: ${streamId}. Active: ${this.activeStreams.size}/${this.MAX_STREAMS}`);

    // If we're under capacity, allow immediately
    if (this.activeStreams.size < this.MAX_STREAMS) {
      this.activeStreams.add(streamId);
      console.log(`[VisionStreamManager] ✅ Stream ${streamId} approved. Active: ${this.activeStreams.size}/${this.MAX_STREAMS}`);
      return;
    }

    // Otherwise, wait in queue
    console.log(`[VisionStreamManager] ⏳ Stream ${streamId} queued. Active: ${this.activeStreams.size}/${this.MAX_STREAMS}`);
    
    return new Promise<void>((resolve) => {
      this.waitQueue.push({ id: streamId, resolve });
      this.processQueue();
    });
  }

  /**
   * Release a vision stream
   * @param streamId Unique identifier for the stream
   */
  releaseStream(streamId: string): void {
    if (this.activeStreams.has(streamId)) {
      this.activeStreams.delete(streamId);
      console.log(`[VisionStreamManager] 🚪 Stream ${streamId} released. Active: ${this.activeStreams.size}/${this.MAX_STREAMS}`);
      
      // Process queue when a slot becomes available
      this.processQueue();
    } else {
      console.warn(`[VisionStreamManager] Attempted to release unknown stream: ${streamId}`);
    }
  }

  /**
   * Process the wait queue and approve streams when capacity is available
   */
  private processQueue(): void {
    while (this.activeStreams.size < this.MAX_STREAMS && this.waitQueue.length > 0) {
      const next = this.waitQueue.shift();
      if (next) {
        this.activeStreams.add(next.id);
        console.log(`[VisionStreamManager] ✅ Stream ${next.id} approved from queue. Active: ${this.activeStreams.size}/${this.MAX_STREAMS}`);
        next.resolve();
      }
    }
  }

  /**
   * Get current stream count and queue status
   */
  getStatus(): { active: number; max: number; queued: number; activeIds: string[] } {
    return {
      active: this.activeStreams.size,
      max: this.MAX_STREAMS,
      queued: this.waitQueue.length,
      activeIds: Array.from(this.activeStreams),
    };
  }

  /**
   * Force clear all streams (emergency cleanup)
   */
  clearAll(): void {
    console.warn(`[VisionStreamManager] 🚨 Force clearing all streams. Active: ${this.activeStreams.size}`);
    this.activeStreams.clear();
    this.waitQueue.forEach((item) => {
      console.warn(`[VisionStreamManager] Rejecting queued stream: ${item.id}`);
    });
    this.waitQueue = [];
    this.processQueue();
  }
}

// Singleton instance
export const visionStreamManager = new VisionStreamManager();
