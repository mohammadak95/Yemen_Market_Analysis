/**
 * Enhanced caching system for spatial data
 */
class EnhancedCache {
    constructor(options = {}) {
      this.cache = new Map();
      this.maxSize = options.maxSize || 50;
      this.maxAge = options.maxAge || 30 * 60 * 1000; // 30 minutes
      this.compressionThreshold = options.compressionThreshold || 100000; // 100KB
      this.metrics = {
        hits: 0,
        misses: 0,
        evictions: 0
      };
    }
  
    async set(key, data, metadata = {}) {
      const size = this.getDataSize(data);
      const shouldCompress = size > this.compressionThreshold;
      
      const entry = {
        data: shouldCompress ? await this.compress(data) : data,
        timestamp: Date.now(),
        size,
        compressed: shouldCompress,
        metadata: {
          ...metadata,
          lastAccessed: Date.now(),
          accessCount: 0
        }
      };
  
      if (this.cache.size >= this.maxSize) {
        this.evictEntries();
      }
  
      this.cache.set(key, entry);
      return true;
    }
  
    async get(key) {
      const entry = this.cache.get(key);
      
      if (!entry) {
        this.metrics.misses++;
        return null;
      }
  
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.metrics.evictions++;
        return null;
      }
  
      // Update metadata
      entry.metadata.lastAccessed = Date.now();
      entry.metadata.accessCount++;
      this.metrics.hits++;
  
      return entry.compressed ? 
        await this.decompress(entry.data) : 
        entry.data;
    }
  
    async compress(data) {
      try {
        const serialized = JSON.stringify(data);
        // Using LZ-string or similar compression library
        return await compressString(serialized);
      } catch (error) {
        console.error('Compression failed:', error);
        return data;
      }
    }
  
    async decompress(data) {
      try {
        const decompressed = await decompressString(data);
        return JSON.parse(decompressed);
      } catch (error) {
        console.error('Decompression failed:', error);
        return data;
      }
    }
  
    isExpired(entry) {
      return Date.now() - entry.timestamp > this.maxAge;
    }
  
    evictEntries() {
      // LRU eviction based on lastAccessed timestamp
      const entries = Array.from(this.cache.entries())
        .sort((a, b) => a[1].metadata.lastAccessed - b[1].metadata.lastAccessed);
  
      while (this.cache.size >= this.maxSize) {
        const [key] = entries.shift();
        this.cache.delete(key);
        this.metrics.evictions++;
      }
    }
  
    getDataSize(data) {
      try {
        return new Blob([JSON.stringify(data)]).size;
      } catch {
        return 0;
      }
    }
  
    getCacheStats() {
      const totalSize = Array.from(this.cache.values())
        .reduce((sum, entry) => sum + entry.size, 0);
  
      return {
        ...this.metrics,
        size: this.cache.size,
        maxSize: this.maxSize,
        totalSize,
        hitRate: this.metrics.hits / (this.metrics.hits + this.metrics.misses)
      };
    }
  
    clear() {
      this.cache.clear();
      this.metrics = { hits: 0, misses: 0, evictions: 0 };
    }
  }
  
  // Usage and Integration
  
  // src/utils/spatialDataManager.js
  
  class SpatialDataManager {
    constructor() {
      this.cache = new EnhancedCache({
        maxSize: 100,
        maxAge: 60 * 60 * 1000, // 1 hour
        compressionThreshold: 50000 // 50KB
      });
      this.transformer = spatialTransformUtils;
    }
  
    async getVisualizationData(commodity, date, vizType, options = {}) {
      const cacheKey = `viz_${commodity}_${date}_${vizType}`;
      
      // Try cache first
      const cachedData = await this.cache.get(cacheKey);
      if (cachedData) {
        return cachedData;
      }
  
      // Get raw data
      const rawData = await this.loadRawData(commodity, date);
      
      // Transform based on visualization type
      let transformedData;
      switch (vizType) {
        case 'timeSeries':
          transformedData = this.transformer.transformTimeSeriesForViz(
            rawData.timeSeriesData,
            options
          );
          break;
        case 'choropleth':
          transformedData = this.transformer.transformForChoropleth(
            rawData,
            options.metric
          );
          break;
        case 'network':
          transformedData = this.transformer.transformFlowsForNetwork(
            rawData.flowAnalysis,
            options
          );
          break;
        case 'clusters':
          transformedData = this.transformer.transformClustersForViz(
            rawData.marketClusters,
            options
          );
          break;
        default:
          throw new Error(`Unsupported visualization type: ${vizType}`);
      }
  
      // Cache the transformed data
      await this.cache.set(cacheKey, transformedData, {
        vizType,
        commodity,
        date
      });
  
      return transformedData;
    }
  
    // ... additional methods for data management
  }
  
  export {
    spatialTransformUtils,
    EnhancedCache,
    SpatialDataManager
  };