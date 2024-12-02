import Papa from 'papaparse';

class PathResolver {
  constructor() {
    const isDev = process.env.NODE_ENV === 'development';
    const publicUrl = process.env.PUBLIC_URL || '/Yemen_Market_Analysis';

    // Define base paths based on environment
    this.basePaths = isDev 
      ? ['/results', '/data']
      : [`${publicUrl}/data`];

    this.cache = new Map();
    this.successPathMap = new Map();
    this.retryAttempts = 3;
    this.retryDelay = 1000;
  }

  async resolveDataFile(category, filename, options = {}) {
    const cacheKey = `${category}/${filename}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < 3600000) {
      return cached.response;
    }

    const paths = this.generatePaths(category, filename);
    let response = null;
    let error = null;

    for (let attempt = 0; attempt < this.retryAttempts; attempt++) {
      for (const path of paths) {
        try {
          response = await fetch(path, {
            ...options,
            headers: {
              'Accept': 'application/json, text/csv',
              'Cache-Control': process.env.NODE_ENV === 'development' ? 'no-cache' : 'max-age=3600',
              ...options.headers
            }
          });

          if (response.ok) {
            this.successPathMap.set(category, path);
            this.cache.set(cacheKey, {
              response: response.clone(),
              timestamp: Date.now()
            });
            return response;
          }
        } catch (e) {
          error = e;
          console.warn(`Failed to fetch from ${path}:`, e);
          continue;
        }
      }

      if (attempt < this.retryAttempts - 1) {
        await new Promise(resolve => 
          setTimeout(resolve, this.retryDelay * Math.pow(2, attempt))
        );
      }
    }

    // Try alternative path if all attempts failed
    const altResponse = await this.tryAlternativePath(category, filename, options);
    if (altResponse) return altResponse;

    throw new Error(`Failed to load ${filename} from all paths. Last error: ${error?.message}`);
  }

  generatePaths(category, filename) {
    const exactPaths = this.basePaths.map(base => `${base}/${category}/${filename}`);
    const fallbackPaths = this.basePaths.map(base => `${base}/${filename}`);
    const previousSuccessPath = this.successPathMap.get(category);
    
    const paths = [...exactPaths, ...fallbackPaths];
    
    if (previousSuccessPath) {
      const successBase = previousSuccessPath.split('/').slice(0, -2).join('/');
      paths.unshift(`${successBase}/${category}/${filename}`);
    }

    if (process.env.NODE_ENV === 'development') {
      console.debug('[PathResolver] Trying paths:', paths);
    }

    return paths;
  }

  async tryAlternativePath(category, filename, options) {
    // Try loading from alternative location based on environment
    const isDev = process.env.NODE_ENV === 'development';
    const altCategory = isDev ? 'data' : 'results';
    const altPath = `${isDev ? '' : process.env.PUBLIC_URL}/${altCategory}/${category}/${filename}`;

    try {
      const response = await fetch(altPath, options);
      if (response.ok) {
        console.debug(`[PathResolver] Successfully loaded from alternative path: ${altPath}`);
        return response;
      }
    } catch (e) {
      console.warn(`[PathResolver] Alternative path failed: ${altPath}`, e);
    }
    return null;
  }

  async loadFile(category, filename, options = {}) {
    const response = await this.resolveDataFile(category, filename, options);
    
    if (options.contentType === 'csv') {
      const text = await response.text();
      return new Promise((resolve, reject) => {
        Papa.parse(text, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          complete: results => {
            if (!results.data || results.data.length === 0) {
              reject(new Error('CSV parsing resulted in empty data'));
              return;
            }
            resolve(results.data);
          },
          error: error => reject(new Error(`CSV parsing failed: ${error.message}`))
        });
      });
    }
    
    try {
      const text = await response.text();
      return JSON.parse(text);
    } catch (error) {
      throw new Error(`Failed to parse JSON response: ${error.message}`);
    }
  }

  getCommodityPath(commodityName) {
    const sanitized = this.sanitizeCommodityName(commodityName);
    const filename = `preprocessed_yemen_market_data_${sanitized}.json`;
    const category = 'preprocessed_by_commodity';
    return { category, filename };
  }

  getCommodityFilePath(commodityName) {
    const { category, filename } = this.getCommodityPath(commodityName);
    const isDev = process.env.NODE_ENV === 'development';
    const baseUrl = isDev ? '' : (process.env.PUBLIC_URL || '/Yemen_Market_Analysis');
    return `${baseUrl}/${isDev ? 'results' : 'data'}/${category}/${filename}`;
  }

  sanitizeCommodityName(name) {
    if (!name) return '';
    return name
      .toLowerCase()
      .trim()
      .replace(/[()]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');
  }

  clearCache() {
    this.cache.clear();
    this.successPathMap.clear();
  }
}

// Initialize singleton
export const pathResolver = new PathResolver();