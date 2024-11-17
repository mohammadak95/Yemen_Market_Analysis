// src/utils/CacheManager.js

import { backgroundMonitor } from './backgroundMonitor-cancelled';
import { spatialDebugUtils } from './spatialDebugUtils';

export class CacheManager {
    constructor() {
        this.cache = new Map();
        this.config = {
            maxSize: 50,
            maxAge: 30 * 60 * 1000, // 30 minutes
            cleanupInterval: 5 * 60 * 1000 // 5 minutes
        };

        this.metrics = {
            hits: 0,
            misses: 0,
            evictions: 0
        };

        // Start cleanup interval
        this.startCleanupInterval();
    }

    /**
     * Initialize cache storage
     */
    async init() {
        this.cache = new Map();
        return true;
    }

    /**
     * Get item from cache
     */
    async get(key) {
        const entry = this.cache.get(key);
        
        if (!entry) {
            this.metrics.misses++;
            return null;
        }

        // Check if entry has expired
        if (Date.now() - entry.timestamp > this.config.maxAge) {
            this.cache.delete(key);
            this.metrics.evictions++;
            return null;
        }

        // Update access time and count
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        this.metrics.hits++;

        spatialDebugUtils.log('Cache hit:', { key, accessCount: entry.accessCount });
        return entry.data;
    }

    /**
     * Set item in cache
     */
    async set(key, data) {
        const metric = backgroundMonitor.startMetric('cache-set');

        try {
            // Enforce cache size limit
            if (this.cache.size >= this.config.maxSize) {
                this.evictEntries();
            }

            this.cache.set(key, {
                data,
                timestamp: Date.now(),
                lastAccessed: Date.now(),
                accessCount: 0
            });

            metric.finish({ status: 'success' });
            return true;

        } catch (error) {
            metric.finish({ status: 'error', error: error.message });
            spatialDebugUtils.error('Cache set error:', error);
            return false;
        }
    }

    /**
     * Clear entire cache
     */
    clear() {
        this.cache.clear();
        spatialDebugUtils.log('Cache cleared');
    }

    /**
     * Evict old entries
     */
    evictEntries() {
        // Sort entries by last accessed time
        const entries = Array.from(this.cache.entries())
            .sort(([, a], [, b]) => a.lastAccessed - b.lastAccessed);

        // Remove oldest entries until we're under the limit
        while (this.cache.size >= this.config.maxSize) {
            const [oldestKey] = entries.shift();
            this.cache.delete(oldestKey);
            this.metrics.evictions++;
        }
    }

    /**
     * Start cleanup interval
     */
    startCleanupInterval() {
        setInterval(() => {
            const now = Date.now();
            
            for (const [key, entry] of this.cache.entries()) {
                if (now - entry.timestamp > this.config.maxAge) {
                    this.cache.delete(key);
                    this.metrics.evictions++;
                }
            }
        }, this.config.cleanupInterval);
    }

    /**
     * Get cache metrics
     */
    getMetrics() {
        return {
            size: this.cache.size,
            maxSize: this.config.maxSize,
            hits: this.metrics.hits,
            misses: this.metrics.misses,
            evictions: this.metrics.evictions,
            hitRate: this.calculateHitRate()
        };
    }

    /**
     * Calculate cache hit rate
     */
    calculateHitRate() {
        const total = this.metrics.hits + this.metrics.misses;
        return total > 0 ? 
            (this.metrics.hits / total) * 100 : 0;
    }
}