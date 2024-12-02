class PathValidatorUtility {
  constructor() {
    const isDev = process.env.NODE_ENV === 'development';
    const publicUrl = process.env.PUBLIC_URL || '/Yemen_Market_Analysis';

    this.pathMappings = {
      development: {
        base: '/results',
        api: 'http://localhost:5001/api',
        static: '/static',
        data: {
          preprocessed: '/results/preprocessed_by_commodity',
          raw: '/results'
        }
      },
      production: {
        base: publicUrl,
        static: `${publicUrl}/static`,
        data: {
          preprocessed: `${publicUrl}/data/preprocessed_by_commodity`,
          raw: `${publicUrl}/data`
        }
      }
    };

    this.cache = new Map();
    this.validPaths = new Set();
  }

  normalizeCommodityName(name) {
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

  getCommodityFilePath(commodity, env = process.env.NODE_ENV) {
    const normalizedName = this.normalizeCommodityName(commodity);
    const environment = this.detectEnvironment(env);
    const basePath = this.pathMappings[environment].data.preprocessed;
    
    const filePath = `${basePath}/preprocessed_yemen_market_data_${normalizedName}.json`;
    
    if (process.env.NODE_ENV === 'development') {
      console.debug('Generated commodity file path:', {
        environment,
        normalizedName,
        filePath
      });
    }
    
    return filePath;
  }

  async validatePath(path) {
    if (this.validPaths.has(path)) return true;
    
    try {
      const response = await fetch(path, { method: 'HEAD' });
      const isValid = response.ok;
      if (isValid) this.validPaths.add(path);
      return isValid;
    } catch (error) {
      console.warn(`Path validation failed for: ${path}`, error);
      return false;
    }
  }

  detectEnvironment(env = process.env.NODE_ENV) {
    if (window.location.hostname.includes('github.io')) return 'production';
    if (env === 'production') return 'production';
    return 'development';
  }

  async validatePaths() {
    const env = this.detectEnvironment();
    const config = this.pathMappings[env];
    
    const results = {
      environment: env,
      baseUrl: config.base,
      pathMappings: {},
      validPaths: [],
      invalidPaths: [],
      suggestions: []
    };

    const testCommodities = ['beans (kidney red)', 'wheat_flour', 'rice_imported'];
    
    for (const commodity of testCommodities) {
      const filePath = this.getCommodityFilePath(commodity, env);
      const isValid = await this.validatePath(filePath);
      
      results.pathMappings[commodity] = {
        normalized: this.normalizeCommodityName(commodity),
        filePath,
        valid: isValid
      };

      if (isValid) {
        results.validPaths.push(filePath);
      } else {
        results.invalidPaths.push(filePath);
        
        // Generate alternative paths
        const altPaths = this.generateAlternativePaths(commodity, env);
        for (const altPath of altPaths) {
          if (await this.validatePath(altPath)) {
            results.suggestions.push({
              original: filePath,
              alternative: altPath,
              commodity
            });
          }
        }
      }
    }

    return results;
  }

  generateAlternativePaths(commodity, env) {
    const normalizedName = this.normalizeCommodityName(commodity);
    const environment = this.detectEnvironment(env);
    const altPaths = [];

    // Try different base paths
    if (environment === 'development') {
      altPaths.push(
        `/data/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedName}.json`,
        `/results/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedName}.json`
      );
    } else {
      const publicUrl = process.env.PUBLIC_URL || '/Yemen_Market_Analysis';
      altPaths.push(
        `${publicUrl}/data/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedName}.json`,
        `${publicUrl}/results/preprocessed_by_commodity/preprocessed_yemen_market_data_${normalizedName}.json`
      );
    }

    return altPaths;
  }

  async validateDataAccess(app) {
    const results = await this.validatePaths();
    if (results.invalidPaths.length > 0) {
      console.warn('Invalid paths detected:', results.invalidPaths);
      
      if (results.suggestions.length > 0) {
        console.info('Path suggestions available:', results.suggestions);
        this.applyPathSuggestions(app, results.suggestions);
      }
    }
    
    return results;
  }

  applyPathSuggestions(app, suggestions) {
    suggestions.forEach(suggestion => {
      const { original, alternative } = suggestion;
      
      // Add redirect for the original path to the alternative
      app.get(original, (req, res) => {
        res.redirect(alternative);
      });
    });
  }

  getStaticPath(filename, env = process.env.NODE_ENV) {
    const environment = this.detectEnvironment(env);
    return `${this.pathMappings[environment].static}/${filename}`;
  }

  clearCache() {
    this.cache.clear();
    this.validPaths.clear();
  }
}

export const pathValidator = new PathValidatorUtility();