// src/utils/dataCache.js

import { backgroundMonitor } from './backgroundMonitor';

class DataCache {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.ttl = 3600000; // 1 hour
    this.priorityLevels = {
      HIGH: new Set(['timeSeriesData', 'flowMaps']),
      MEDIUM: new Set(['marketClusters', 'spatialAutocorrelation']),
      LOW: new Set(['regressionAnalysis', 'seasonalAnalysis'])
    };
    
    // Start cleanup interval
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000); // 5 minutes
  }

  get(key, options = {}) {
    const metric = backgroundMonitor.startMetric('cache-get');
    
    try {
      const cached = this.cache.get(key);
      if (!cached) {
        metric.finish({ status: 'miss' });
        return null;
      }

      if (Date.now() - cached.timestamp > this.ttl) {
        this.cache.delete(key);
        metric.finish({ status: 'expired' });
        return null;
      }

      // Update access count and timestamp
      cached.accessCount++;
      cached.lastAccessed = Date.now();
      
      metric.finish({ status: 'hit' });
      return cached.data;
      
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
      return null;
    }
  }

  set(key, data, priority = 'MEDIUM') {
    const metric = backgroundMonitor.startMetric('cache-set');
    
    try {
      // Implement LRU if cache is full
      if (this.cache.size >= this.maxSize) {
        this.evictLRU(priority);
      }

      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
        priority,
        size: this._estimateSize(data)
      });

      metric.finish({ status: 'success' });
      
    } catch (error) {
      metric.finish({ status: 'error', error: error.message });
    }
  }

  cleanup() {
    const metric = backgroundMonitor.startMetric('cache-cleanup');
    const now = Date.now();
    let removedCount = 0;

    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.ttl) {
        this.cache.delete(key);
        removedCount++;
      }
    }

    metric.finish({ 
      status: 'success',
      removedEntries: removedCount
    });
  }

  clear() {
    this.cache.clear();
    backgroundMonitor.logMetric('cache-clear', {
      timestamp: Date.now()
    });
  }

  _estimateSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  evictLRU(newPriority) {
    // Sort entries by priority and last access time
    const entries = Array.from(this.cache.entries())
      .map(([key, value]) => ({
        key,
        priority: value.priority,
        lastAccessed: value.lastAccessed
      }))
      .sort((a, b) => {
        // First compare priority levels
        const priorityOrder = { HIGH: 3, MEDIUM: 2, LOW: 1 };
        const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
        if (priorityDiff !== 0) return priorityDiff;
        
        // Then compare last access times
        return a.lastAccessed - b.lastAccessed;
      });

    // Remove the least recently used item with lowest priority
    if (entries.length > 0) {
      const toRemove = entries[0];
      this.cache.delete(toRemove.key);
      backgroundMonitor.logMetric('cache-eviction', {
        key: toRemove.key,
        reason: 'LRU',
        priority: toRemove.priority
      });
    }
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalSize: Array.from(this.cache.values())
        .reduce((sum, item) => sum + (item.size || 0), 0),
      hitRate: this._calculateHitRate(),
      entries: Array.from(this.cache.entries()).map(([key, value]) => ({
        key,
        accessCount: value.accessCount,
        age: Date.now() - value.timestamp,
        size: value.size || 0,
        priority: value.priority
      }))
    };
  }

  _calculateHitRate() {
    const total = Array.from(this.cache.values())
      .reduce((sum, item) => sum + item.accessCount, 0);
    return total / this.cache.size || 0;
  }
}

export const dataCache = new DataCache();