//src/utils/pathResolver.js

import Papa from 'papaparse';

class PathResolver {
    constructor() {
      // Get the public URL from environment or default to GitHub Pages path
      const publicUrl = process.env.PUBLIC_URL || '/Yemen_Market_Analysis';
      
      this.basePaths = [
        `${publicUrl}/data`,
        `${publicUrl}/results`
      ];
    }
  
    async resolveDataFile(category, filename) {
      // Try exact paths first
      const exactPaths = this.basePaths.map(base => `${base}/${category}/${filename}`);
      const fallbackPaths = this.basePaths.map(base => `${base}/${filename}`);
      const allPaths = [...exactPaths, ...fallbackPaths];
      
      // Log attempt paths in dev mode
      if (process.env.NODE_ENV === 'development') {
        console.log('[PathResolver] Trying paths:', allPaths);
      }
  
      // Try each path
      for (const path of allPaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            // Cache successful path for future use
            this.successPath = path;
            return response;
          }
        } catch (e) {
          continue;
        }
      }
  
      // Try with the last known success path base
      if (this.successPath) {
        const successBase = this.successPath.split('/').slice(0, -2).join('/');
        const newPath = `${successBase}/${category}/${filename}`;
        try {
          const response = await fetch(newPath);
          if (response.ok) return response;
        } catch (e) {
          // Ignore error and continue
        }
      }
  
      throw new Error(`Cannot find file ${filename} in any known location`);
    }
  
    async loadFile(category, filename, options = {}) {
      const response = await this.resolveDataFile(category, filename);
      
      if (options.contentType === 'csv') {
        const text = await response.text();
        return new Promise((resolve, reject) => {
          Papa.parse(text, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: results => resolve(results.data),
            error: error => reject(error)
          });
        });
      }
      
      return response.json();
    }
  
    getCommodityPath(commodityName) {
      const sanitized = this.sanitizeCommodityName(commodityName);
      const filename = `preprocessed_yemen_market_data_${sanitized}.json`;
      const category = 'preprocessed_by_commodity';
      return { category, filename };
    }
  
    sanitizeCommodityName(name) {
      return name
        .toLowerCase()
        .trim()
        .replace(/[()]/g, '')        // Remove parentheses
        .replace(/\s+/g, '_')       // Multiple spaces to underscore
        .replace(/[^a-z0-9_]/g, '') // Remove special chars
        .replace(/_+/g, '_')        // Multiple underscores to one
        .replace(/^_|_$/g, '');     // Remove leading/trailing underscores
    }
  }
  
  // Initialize singleton
  export const pathResolver = new PathResolver();
