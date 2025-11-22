import { ref, uploadBytesResumable, UploadTask, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

interface RetryConfig {
  maxAttempts?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffFactor?: number;
}

interface UploadCallbacks {
  onProgress?: (progress: number) => void;
  onSuccess?: (downloadURL: string) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000,    // 10 seconds
  backoffFactor: 2    // Double delay each retry
};

export class RetryableUpload {
  private attempt: number = 0;
  private task: UploadTask | null = null;
  private timeout: NodeJS.Timeout | null = null;

  constructor(
    private file: File,
    private path: string,
    private metadata: { [key: string]: string },
    private config: RetryConfig = {},
    private callbacks: UploadCallbacks = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  start() {
    this.attempt = 0;
    this.upload();
  }

  private upload() {
    if (this.attempt >= (this.config.maxAttempts || DEFAULT_CONFIG.maxAttempts)) {
      this.callbacks.onError?.(new Error(`Upload failed after ${this.attempt} attempts`));
      return;
    }

    // Clear any existing timeout
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }

    // Create upload task
    const storageRef = ref(storage, this.path);
    this.task = uploadBytesResumable(storageRef, this.file, {
      contentType: this.file.type,
      customMetadata: this.metadata
    });

    // Monitor upload
    this.task.on('state_changed',
      // Progress handler
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        this.callbacks.onProgress?.(progress);
      },
      // Error handler
      (error) => {
        console.error(`Upload attempt ${this.attempt + 1} failed:`, error);
        
        // Calculate delay for next retry
        const delay = Math.min(
          (this.config.initialDelay || DEFAULT_CONFIG.initialDelay) * 
          Math.pow(this.config.backoffFactor || DEFAULT_CONFIG.backoffFactor, this.attempt),
          this.config.maxDelay || DEFAULT_CONFIG.maxDelay
        );

        this.attempt++;
        
        if (this.attempt < (this.config.maxAttempts || DEFAULT_CONFIG.maxAttempts)) {
          console.log(`Retrying in ${delay}ms...`);
          this.timeout = setTimeout(() => this.upload(), delay);
        } else {
          this.callbacks.onError?.(error);
        }
      },
      // Success handler
      () => {
        if (this.task) {
          getDownloadURL(this.task.snapshot.ref).then(url => {
            this.callbacks.onSuccess?.(url);
          });
        }
      }
    );
  }

  cancel() {
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
    if (this.task) {
      this.task.cancel();
      this.task = null;
    }
  }
}

export function createRetryableUpload(
  file: File,
  userId: string,
  trackId: string,
  config?: RetryConfig,
  callbacks?: UploadCallbacks
) {
  return new RetryableUpload(
    file,
    `tracks/${userId}/${file.name}`,
    {
      uploadedBy: userId,
      originalName: file.name,
      trackId
    },
    config,
    callbacks
  );
}