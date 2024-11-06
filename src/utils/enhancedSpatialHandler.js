// src/utils/enhancedSpatialHandler.js

import { backgroundMonitor } from './backgroundMonitor';
import { processDataWithWorker } from '../workers/workerLoader';
import { errorHandler } from '../../server/middleware/errorHandler';
import LZString from 'lz-string';

// Cache configuration
const CACHE_CONFIG = {
  maxSize: 50, // Maximum number of items in cache
  ttl: 1000 * 60 * 30, // 30 minutes TTL
  cleanupInterval: 1000 * 60 * 5 // Cleanup every 5 minutes
};

// Circuit breaker configuration
const CIRCUIT_BREAKER_CONFIG = {
  failureThreshold: 5,
  resetTimeout: 30000,
  monitorInterval: 5000
};

class EnhancedSpatialHandler {
  constructor() {
    this.cache = new Map();
    this.circuitBreakers = new Map();
    this.pendingRequests = new Map();
    this.retryQueue = new Map();
    
    // Initialize cleanup interval
    this.cleanupInterval = setInterval(
      () => this.cleanupCache(),
      CACHE_CONFIG.cleanupInterval
    );

    // Initialize monitoring
    this.monitor = backgroundMonitor;
    this.monitor.init();
  }

  // Cache Management
  async getCachedData(key) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > CACHE_CONFIG.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Decompress data if needed
    if (cached.compressed) {
      return JSON.parse(LZString.decompressFromUTF16(cached.data));
    }
    return cached.data;
  }

  setCachedData(key, data, compress = false) {
    // Compress large data before caching
    const shouldCompress = compress || JSON.stringify(data).length > 100000;
    const cachedData = {
      data: shouldCompress ? 
        LZString.compressToUTF16(JSON.stringify(data)) : data,
      timestamp: Date.now(),
      compressed: shouldCompress
    };

    this.cache.set(key, cachedData);
    this.cleanupCacheIfNeeded();
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > CACHE_CONFIG.ttl) {
        this.cache.delete(key);
      }
    }
  }

  cleanupCacheIfNeeded() {
    if (this.cache.size > CACHE_CONFIG.maxSize) {
      // Remove oldest entries
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      while (this.cache.size > CACHE_CONFIG.maxSize) {
        const [oldestKey] = entries.shift();
        this.cache.delete(oldestKey);
      }
    }
  }

  // Circuit Breaker Implementation
  async withCircuitBreaker(key, operation) {
    const breaker = this.getCircuitBreaker(key);
    
    if (breaker.isOpen) {
      if (Date.now() - breaker.lastFailure > CIRCUIT_BREAKER_CONFIG.resetTimeout) {
        breaker.reset();
      } else {
        throw new Error(`Circuit breaker open for ${key}`);
      }
    }

    try {
      const result = await operation();
      breaker.success();
      return result;
    } catch (error) {
      breaker.failure();
      throw error;
    }
  }

  getCircuitBreaker(key) {
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, {
        failures: 0,
        lastFailure: null,
        isOpen: false,
        
        success() {
          this.failures = 0;
          this.isOpen = false;
        },
        
        failure() {
          this.failures++;
          this.lastFailure = Date.now();
          if (this.failures >= CIRCUIT_BREAKER_CONFIG.failureThreshold) {
            this.isOpen = true;
          }
        },
        
        reset() {
          this.failures = 0;
          this.isOpen = false;
          this.lastFailure = null;
        }
      });
    }
    return this.circuitBreakers.get(key);
  }

  // Request Deduplication
  async withDeduplication(key, operation) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = operation();
    this.pendingRequests.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  // Retry Logic
  async withRetry(key, operation, maxRetries = 3, backoffMs = 1000) {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        lastError = error;
        await new Promise(resolve => 
          setTimeout(resolve, backoffMs * Math.pow(2, attempt))
        );
      }
    }
    
    // Add to retry queue for background retry
    this.retryQueue.set(key, {
      operation,
      error: lastError,
      timestamp: Date.now()
    });
    
    throw lastError;
  }

  // Main Processing Function
  async processSpatialData(data, options = {}) {
    const {
      cacheKey,
      compress = false,
      useCache = true,
      maxRetries = 3
    } = options;

    // Start monitoring
    const monitoring = this.monitor.logMetric('spatial-processing', {
      dataSize: JSON.stringify(data).length,
      options
    });

    try {
      // Try cache first
      if (useCache && cacheKey) {
        const cached = await this.getCachedData(cacheKey);
        if (cached) return cached;
      }

      // Process with circuit breaker and retry logic
      const result = await this.withCircuitBreaker(
        cacheKey,
        async () => this.withRetry(
          cacheKey,
          async () => {
            const processed = await processDataWithWorker(data);
            
            if (cacheKey) {
              this.setCachedData(cacheKey, processed, compress);
            }
            
            return processed;
          },
          maxRetries
        )
      );

      return result;
    } catch (error) {
      const enhancedError = errorHandler(error);
      this.monitor.logError('spatial-processing', enhancedError);
      throw enhancedError;
    } finally {
      monitoring.finish();
    }
  }

  // Cleanup
  destroy() {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
    this.circuitBreakers.clear();
    this.pendingRequests.clear();
    this.retryQueue.clear();
  }
}

// Export singleton instance
export const spatialHandler = new EnhancedSpatialHandler();

// Export constants if needed
export {
    CACHE_CONFIG,
    CIRCUIT_BREAKER_CONFIG
  };