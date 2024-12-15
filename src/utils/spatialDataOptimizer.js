// src/utils/spatialDataOptimizer.js

import { backgroundMonitor } from './backgroundMonitor';
import { workerManager } from './workerManager';

class SpatialDataOptimizer {
    constructor() {
        this.pendingRequests = new Map();
        this.dataCache = new Map();
        this.abortControllers = new Map();
        this.worker = workerManager.getWorker('spatial');
    }

    // Request deduplication and caching
    async deduplicateRequest(key, requestFn) {
        // Check for pending request
        if (this.pendingRequests.has(key)) {
            return this.pendingRequests.get(key);
        }

        // Check cache
        const cached = this.dataCache.get(key);
        if (cached && Date.now() - cached.timestamp < 300000) { // 5 minute cache
            return cached.data;
        }

        // Cancel any existing request
        if (this.abortControllers.has(key)) {
            this.abortControllers.get(key).abort();
            this.abortControllers.delete(key);
        }

        // Create new abort controller
        const controller = new AbortController();
        this.abortControllers.set(key, controller);

        // Create and store the request promise
        const promise = (async () => {
            try {
                const data = await requestFn(controller.signal);
                this.dataCache.set(key, {
                    data,
                    timestamp: Date.now()
                });
                return data;
            } finally {
                this.pendingRequests.delete(key);
                this.abortControllers.delete(key);
            }
        })();

        this.pendingRequests.set(key, promise);
        return promise;
    }

    // Batch process data using web worker
    async batchProcessData(data, options = {}) {
        const metric = backgroundMonitor.startMetric('batch-process');
        
        try {
            const result = await this.worker.processData({
                data,
                options,
                type: 'batch-process'
            });
            
            metric.finish({ status: 'success' });
            return result;
        } catch (error) {
            metric.finish({ status: 'error', error: error.message });
            throw error;
        }
    }

    // Optimize data loading sequence
    async optimizeDataLoading(requests) {
        const metric = backgroundMonitor.startMetric('optimize-loading');

        try {
            // Group similar requests
            const groupedRequests = this.groupRequests(requests);

            // Process groups in parallel where possible
            const results = await Promise.all(
                groupedRequests.map(group => 
                    this.processBatchGroup(group)
                )
            );

            metric.finish({ status: 'success' });
            return this.mergeResults(results);
        } catch (error) {
            metric.finish({ status: 'error', error: error.message });
            throw error;
        }
    }

    // Group similar requests for batch processing
    groupRequests(requests) {
        return Object.values(
            requests.reduce((groups, request) => {
                const key = this.getGroupKey(request);
                if (!groups[key]) {
                    groups[key] = [];
                }
                groups[key].push(request);
                return groups;
            }, {})
        );
    }

    // Get group key for request batching
    getGroupKey(request) {
        return `${request.type}_${request.commodity}_${request.date || 'all'}`;
    }

    // Process a group of similar requests
    async processBatchGroup(group) {
        const metric = backgroundMonitor.startMetric('process-group');

        try {
            const batchData = await this.batchProcessData(group);
            metric.finish({ status: 'success' });
            return batchData;
        } catch (error) {
            metric.finish({ status: 'error', error: error.message });
            throw error;
        }
    }

    // Merge results from different batches
    mergeResults(results) {
        return results.reduce((merged, result) => {
            Object.entries(result).forEach(([key, value]) => {
                if (!merged[key]) {
                    merged[key] = Array.isArray(value) ? [] : {};
                }
                if (Array.isArray(value)) {
                    merged[key].push(...value);
                } else {
                    Object.assign(merged[key], value);
                }
            });
            return merged;
        }, {});
    }

    // Clear all caches
    clearCaches() {
        this.dataCache.clear();
        this.pendingRequests.clear();
        this.abortControllers.forEach(controller => controller.abort());
        this.abortControllers.clear();
    }
}

export const spatialOptimizer = new SpatialDataOptimizer();
