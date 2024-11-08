// src/utils/dataLoadingStrategy.js

import LZString from 'lz-string';

class DataLoadingStrategy {
  constructor() {
    this.cache = new Map();
    this.compressionThreshold = 100 * 1024; // 100KB
    this.maxCacheSize = 50 * 1024 * 1024; // 50MB
    this.currentCacheSize = 0;
  }

  async loadData(url, options = {}) {
    const cacheKey = `${url}-${JSON.stringify(options)}`;
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey).data;
    }

    try {
      const response = await fetch(url);
      
      // Handle streaming for large files
      if (response.headers.get('content-length') > this.compressionThreshold) {
        return this.handleLargeFile(response, cacheKey);
      }
      
      const data = await this.processResponse(response, url);
      this.addToCache(cacheKey, data);
      return data;
    } catch (error) {
      console.error(`Error loading data from ${url}:`, error);
      throw error;
    }
  }

  async handleLargeFile(response, cacheKey) {
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      size += value.length;
      
      // Check if file is getting too large
      if (size > this.maxCacheSize) {
        console.warn('File too large for caching');
        return this.processChunks(chunks, response.url, false);
      }
    }
    
    const data = await this.processChunks(chunks, response.url);
    if (size <= this.maxCacheSize) {
      this.addToCache(cacheKey, data, size);
    }
    return data;
  }

  addToCache(key, data, size = 0) {
    // Clean cache if needed
    while (this.currentCacheSize + size > this.maxCacheSize) {
      const oldestKey = this.cache.keys().next().value;
      const oldSize = this.cache.get(oldestKey).size;
      this.cache.delete(oldestKey);
      this.currentCacheSize -= oldSize;
    }

    // Add new data to cache
    this.cache.set(key, {
      data,
      size,
      timestamp: Date.now()
    });
    this.currentCacheSize += size;
  }

  async processChunks(chunks, url) {
    const concatenated = new Uint8Array(
      chunks.reduce((acc, chunk) => acc + chunk.length, 0)
    );
    let offset = 0;
    
    for (const chunk of chunks) {
      concatenated.set(chunk, offset);
      offset += chunk.length;
    }

    const text = new TextDecoder().decode(concatenated);
    return this.parseData(text, url);
  }

  async processResponse(response, url) {
    const text = await response.text();
    return this.parseData(text, url);
  }

  parseData(text, url) {
    // Determine file type from URL
    if (url.endsWith('.geojson')) {
      const data = JSON.parse(text);
      return this.optimizeGeoJSON(data);
    } else if (url.endsWith('.json')) {
      return JSON.parse(text);
    } else if (url.endsWith('.csv')) {
      return this.parseCSV(text);
    }
    return text;
  }

  optimizeGeoJSON(data) {
    // Round coordinates to 5 decimal places
    const processCoordinates = (coords) => {
      if (Array.isArray(coords[0])) {
        return coords.map(processCoordinates);
      }
      return coords.map(c => Math.round(c * 100000) / 100000);
    };

    return {
      ...data,
      features: data.features.map(feature => ({
        ...feature,
        geometry: {
          ...feature.geometry,
          coordinates: processCoordinates(feature.geometry.coordinates)
        }
      }))
    };
  }

  parseCSV(text) {
    // Simple CSV parser
    const lines = text.split('\n');
    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      return headers.reduce((obj, header, index) => {
        obj[header.trim()] = values[index]?.trim();
        return obj;
      }, {});
    });
  }

  clearCache() {
    this.cache.clear();
  }
}

export const dataLoadingStrategy = new DataLoadingStrategy();