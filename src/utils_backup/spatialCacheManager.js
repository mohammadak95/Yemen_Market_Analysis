// src/utils/spatialCacheManager.js

import LZString from 'lz-string';
import { backgroundMonitor } from './backgroundMonitor';

class SpatialCacheManager {
  constructor() {
    this.cache = new Map();
    this.cacheTimeout = 30 * 60 * 1000; // 30 minutes
    this.maxCacheSize = 50; // Maximum number of entries
  }

  /**
   * Gets data from cache with validation
   */
  get(key) {
    const metric = backgroundMonitor.startMetric('cache-get');
    
    try {
      const cached = this.cache.get(key);
      if (!cached) {
        metric.finish({ status: 'miss' });
        return null;
      }

      if (Date.now() - cached.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        metric.finish({ status: 'expired' });
        return null;
      }

      // Decompress if necessary
      const data = cached.compressed 
        ? JSON.parse(LZString.decompressFromUTF16(cached.data))
        : cached.data;

      metric.finish({ status: 'hit', size: JSON.stringify(data).length });
      return data;
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return null;
    }
  }

  /**
   * Sets data in cache with compression for large objects
   */
  set(key, data) {
    const metric = backgroundMonitor.startMetric('cache-set');
    
    try {
      const serialized = JSON.stringify(data);
      const shouldCompress = serialized.length > 100000; // Compress if > 100KB

      const cacheEntry = {
        data: shouldCompress 
          ? LZString.compressToUTF16(serialized)
          : data,
        timestamp: Date.now(),
        compressed: shouldCompress
      };

      this.cache.set(key, cacheEntry);
      this.enforceMaxSize();

      metric.finish({ 
        status: 'success', 
        compressed: shouldCompress,
        originalSize: serialized.length,
        finalSize: shouldCompress ? cacheEntry.data.length : serialized.length
      });
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      throw error;
    }
  }

  /**
   * Enforces maximum cache size
   */
  enforceMaxSize() {
    if (this.cache.size <= this.maxCacheSize) return;

    // Remove oldest entries
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    const entriesToRemove = entries.slice(0, entries.length - this.maxCacheSize);
    entriesToRemove.forEach(([key]) => this.cache.delete(key));
  }

  /**
   * Clears expired entries
   */
  clearExpired() {
    const metric = backgroundMonitor.startMetric('cache-cleanup');
    const now = Date.now();
    let cleared = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.cacheTimeout) {
        this.cache.delete(key);
        cleared++;
      }
    }

    metric.finish({ status: 'success', entriesCleared: cleared });
  }

  /**
   * Clears all cache entries
   */
  clear() {
    const metric = backgroundMonitor.startMetric('cache-clear');
    const size = this.cache.size;
    
    this.cache.clear();
    
    metric.finish({ status: 'success', entriesCleared: size });
  }

  /**
   * Gets cache statistics
   */
  getStats() {
    const stats = {
      size: this.cache.size,
      totalSize: 0,
      compressedCount: 0,
      oldestEntry: null,
      newestEntry: null
    };

    for (const [_, value] of this.cache.entries()) {
      if (value.compressed) {
        stats.compressedCount++;
      }
      stats.totalSize += value.data.length;
      
      if (!stats.oldestEntry || value.timestamp < stats.oldestEntry) {
        stats.oldestEntry = value.timestamp;
      }
      if (!stats.newestEntry || value.timestamp > stats.newestEntry) {
        stats.newestEntry = value.timestamp;
      }
    }

    return stats;
  }
}

export const spatialCacheManager = new SpatialCacheManager();