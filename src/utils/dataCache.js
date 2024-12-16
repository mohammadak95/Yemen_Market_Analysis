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

  get(commodity, date) {
    const metric = backgroundMonitor.startMetric('cache-get');
    const key = this._getKey(commodity, date);
    
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

  set(commodity, date, data) {
    const metric = backgroundMonitor.startMetric('cache-set');
    const key = this._getKey(commodity, date);
    
    try {
      // Implement LRU if cache is full
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }

      this.cache.set(key, {
        data,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 0,
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

  _getKey(commodity, date) {
    return `${commodity}_${date}`;
  }

  _estimateSize(data) {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  evictLRU() {
    let oldestAccess = Date.now();
    let keyToRemove = null;

    for (const [key, value] of this.cache.entries()) {
      if (value.lastAccessed < oldestAccess) {
        oldestAccess = value.lastAccessed;
        keyToRemove = key;
      }
    }

    if (keyToRemove) {
      this.cache.delete(keyToRemove);
      backgroundMonitor.logMetric('cache-eviction', {
        key: keyToRemove,
        reason: 'LRU'
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
        size: value.size || 0
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